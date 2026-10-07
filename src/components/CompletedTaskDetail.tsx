import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  Check,
  ChevronDown,
  Copy,
  Download,
  Link2,
  Paintbrush,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { Product, Role } from "../lib/types";
import type { Action } from "../lib/workflow";
import type { ViewerSettings, MaterialSetting } from "./ModelViewer";
import { Modal, ProductImage } from "./UI";
import ProductSpecifications from "./ProductSpecifications";
import ProductDetailsCard from "./ProductDetailsCard";
import RevisionComments from "./RevisionComments";
import ModelImport from "./ModelImport";
import {
  loadModelFile,
  removeModelFile,
  saveModelFile,
} from "../lib/modelFiles";
import { transition, validUrl } from "../lib/workflow";
import { productStatusLabel } from "../lib/productStatus";
import { localModelKey, isLocalModel } from "../lib/modelReference";
const ModelStage = lazy(() =>
  import("./ModelViewer").then((m) => ({ default: m.ModelStage })),
);
const defaultSettings: ViewerSettings = {
  background: "#ffffff",
  exposure: 1,
  shadow: 1,
  rotate: false,
  materials: {},
};
function settingsFor(key: string): ViewerSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (
      !saved ||
      !/^#[a-f\d]{6}$/i.test(saved.background) ||
      typeof saved.rotate !== "boolean" ||
      !Number.isFinite(saved.exposure) ||
      !Number.isFinite(saved.shadow)
    )
      return defaultSettings;
    const materials: Record<string, MaterialSetting> = {};
    for (const [index, value] of Object.entries(saved.materials || {})) {
      const v = value as MaterialSetting;
      if (
        /^\d+$/.test(index) &&
        /^#[a-f\d]{6}$/i.test(v.color) &&
        Number.isFinite(v.metallic) &&
        Number.isFinite(v.roughness)
      )
        materials[index] = {
          color: v.color,
          metallic: Math.min(1, Math.max(0, v.metallic)),
          roughness: Math.min(1, Math.max(0, v.roughness)),
        };
    }
    return {
      background: saved.background,
      rotate: saved.rotate,
      exposure: Math.max(0.2, Math.min(2, saved.exposure)),
      shadow: Math.max(0, Math.min(2, saved.shadow)),
      materials,
    };
  } catch {
    return defaultSettings;
  }
}

export default function CompletedTaskDetail({
  product: p,
  role,
  userId,
  onBack,
  onUpdate,
  onPublish,
  onCopy,
}: {
  product: Product;
  role: Role;
  userId: string;
  onBack: () => void;
  onUpdate: (a: Action) => Promise<void>;
  onPublish: () => Promise<void>;
  onCopy: (value: string, kind?: "url" | "uid") => void;
}) {
  const [localModel, setLocalModel] = useState<File>();
  const [localUrl, setLocalUrl] = useState("");
  useEffect(() => {
    let cancelled = false;
    setLocalModel(undefined);
    if (!p.modelUrl || isLocalModel(p.modelUrl))
      void loadModelFile(localModelKey(p.modelUrl) || p.id)
        .then((file) => {
          if (!cancelled) setLocalModel(file);
        })
        .catch(() => {
          if (!cancelled)
            setError("Could not load the saved model. Please import it again.");
        });
    return () => {
      cancelled = true;
    };
  }, [p.id, p.modelUrl]);
  useEffect(() => {
    if (!localModel) {
      setLocalUrl("");
      return;
    }
    const url = URL.createObjectURL(localModel);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localModel]);
  const modelUrl = isLocalModel(p.modelUrl) ? localUrl : p.modelUrl || localUrl;
  const modelName =
    localModel?.name ||
    modelUrl.split("/").pop()?.split("?")[0] ||
    "Product model";
  const storageKey = `glamar.viewer.${p.id}.${p.modelUrl}`;
  const [settings, setSettings] = useState(() => settingsFor(storageKey));
  const [materials, setMaterials] = useState<
    (MaterialSetting & { name: string; index: number })[]
  >([]);
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"config" | "viewer">("config");
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const isDone = productStatusLabel(p.status) === "Done";
  const published = p.consoleStatus === "Published";
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingModel, setDeletingModel] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const inReview = productStatusLabel(p.status) === "Review";
  const canDeleteModel =
    role === "Admin / Manager" ||
    role === "Reviewer" ||
    (role === "3D Artist" && p.assigneeId === userId);
  async function deleteModel() {
    setDeletingModel(true);
    setDeleteError("");
    const backups: { key: string; file: File | undefined }[] = [];
    const removed: string[] = [];
    try {
      transition(p, { type: "remove-model" }, userId, role);
      for (const key of new Set([p.id, localModelKey(p.modelUrl)].filter(Boolean))) {
        backups.push({ key, file: await loadModelFile(key) });
      }
      for (const { key } of backups) {
        await removeModelFile(key);
        removed.push(key);
      }
      await onUpdate({ type: "remove-model" });
      setLocalModel(undefined);
      setLocalUrl("");
      setMaterials([]);
      setActive(0);
      setSettings(defaultSettings);
      setSaved(false);
      setConfirmDelete(false);
    } catch (error) {
      if (removed.length) {
        try {
          for (const { key, file } of backups) {
            if (file && removed.includes(key)) await saveModelFile(key, file);
          }
        } catch {
          setDeleteError(
            "The model could not be removed cleanly. Keep this page open and re-import the original file.",
          );
          return;
        }
      }
      setDeleteError(
        (error as Error).message ||
          "Could not remove the model. Please try again.",
      );
    } finally {
      setDeletingModel(false);
    }
  }
  const material = materials[active];
  const materialSettings = material
    ? settings.materials[material.index] || material
    : null;
  function change(next: Partial<ViewerSettings>) {
    setSettings((s) => ({ ...s, ...next }));
    setSaved(false);
  }
  function changeMaterial(next: Partial<MaterialSetting>) {
    if (!material || !materialSettings) return;
    change({
      materials: {
        ...settings.materials,
        [material.index]: { ...materialSettings, ...next },
      },
    });
  }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
      setSaved(true);
      setError("");
      return true;
    } catch {
      setError(
        "Viewer settings could not be saved. Please free some browser storage and try again.",
      );
      return false;
    }
  }
  async function publish() {
    if (!isDone || published || publishing || role !== "Admin / Manager") return;
    setPublishing(true);
    setPublishError("");
    try {
      if (!save()) {
        setPublishError("Could not save viewer settings. Please try again.");
        return;
      }
      await onPublish();
    } catch (e) {
      setPublishError((e as Error).message || "Could not publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  }
  const stage = (
    <Suspense fallback={<div className="completed-empty">Loading model…</div>}>
      <ModelStage
        url={modelUrl}
        name={p.name}
        settings={settings}
        onMaterials={setMaterials}
      />
    </Suspense>
  );
  return (
    <div className="todo-workspace completed-workspace">
      <header className="todo-heading">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 title={p.name}>{p.name}</h1>
        <span className="todo-category">{p.category}</span>
        <div className="todo-header-actions">
          <button
            className="button primary"
            disabled={!modelUrl || (isDone && (publishing || published || role !== "Admin / Manager"))}
            title={isDone && role !== "Admin / Manager" ? "Only a manager can publish products" : undefined}
            onClick={isDone ? () => void publish() : save}
          >
            {isDone ? (publishing ? "Publishing…" : published ? "Published" : "Publish") : saved ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </header>
      {publishError && <p className="error-banner" role="alert">{publishError}</p>}
      <div className="todo-layout">
        <aside className="todo-reference-column">
          <section className="panel completed-reference">
            <div className="todo-panel-heading">
              <h3>Product reference</h3>
            </div>
            <ProductImage product={p} />
            {validUrl(p.productUrl) && (
              <a href={p.productUrl} target="_blank" rel="noreferrer">
                View product <ArrowUpRight size={15} />
              </a>
            )}
          </section>
          {!isDone && <section className="panel completed-materials">
            <div className="todo-panel-heading">
              <h3>Material</h3>
              <ChevronDown size={17} />
            </div>
            <div className="completed-material-list">
              {materials.map((item, i) => (
                <button
                  key={item.index}
                  aria-pressed={active === i}
                  onClick={() => {
                    setActive(i);
                    setTab("config");
                  }}
                >
                  {item.name}
                </button>
              ))}
              {!materials.length && (
                <p className="muted">
                  {modelUrl
                    ? "Materials appear when the model loads."
                    : "No materials available"}
                </p>
              )}
            </div>
          </section>}
        </aside>
        <section
          className="todo-gallery panel completed-model-panel"
          aria-label="Product 3D model"
        >
          {modelUrl && (
            <div className="todo-url-toolbar">
              {modelUrl ? (
                <>
                  <a
                    href={modelUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={modelUrl}
                  >
                    <Link2 size={19} />
                    <span>{localModel ? modelName : modelUrl}</span>
                  </a>
                  {!localModel && (
                    <button
                      className="icon-button"
                      aria-label="Copy model URL"
                      onClick={() => onCopy(modelUrl)}
                    >
                      <Copy size={18} />
                    </button>
                  )}
                  <a
                    className="icon-button"
                    href={modelUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={modelName}
                    aria-label="Download 3D model"
                  >
                    <Download size={18} />
                  </a>
                </>
              ) : (
                <span className="muted">No 3D model uploaded</span>
              )}
            </div>
          )}
          {modelUrl ? (
            stage
          ) : (
            <ModelImport productId={p.id} onImported={setLocalModel} />
          )}
          {modelUrl === "/models/studio-chair.glb" && (
            <span className="completed-sample">Sample model</span>
          )}
        </section>
        <aside className="todo-settings-column">
          <ProductDetailsCard
            product={p}
            role={role}
            userId={userId}
            onUpdate={onUpdate}
          />
          <ProductSpecifications
            initiallyOpen
            onCopy={(value) => onCopy(value, "uid")}
            product={p}
            editable={role === "Admin / Manager"}
            onUpdate={onUpdate}
          />
          <RevisionComments product={p} role={role} userId={userId} onUpdate={onUpdate} />
          {!isDone && <>
          <div
            className="panel completed-tabs"
            role="group"
            aria-label="Viewer settings"
          >
            <button
              aria-pressed={tab === "config"}
              onClick={() => setTab("config")}
            >
              <SlidersHorizontal size={22} />
              3D Config
            </button>
            <button
              aria-pressed={tab === "viewer"}
              onClick={() => setTab("viewer")}
            >
              <Box size={22} />
              3D Viewer
            </button>
          </div>
          <section className="panel completed-model-info">
            <h3>3D model</h3>
            <div>
              <ProductImage product={p} />
              <span>
                <strong>{modelUrl ? modelName : "Not uploaded"}</strong>
                <small>{p.sku}</small>
              </span>
              {inReview && (
                <button
                  type="button"
                  className="icon-button completed-delete-model"
                  aria-label="Delete 3D model"
                  title={
                    !modelUrl
                      ? "No 3D model to delete"
                      : !canDeleteModel
                        ? "You do not have permission to delete this model"
                        : "Delete 3D model"
                  }
                  disabled={!modelUrl || !canDeleteModel || deletingModel}
                  onClick={() => {
                    setDeleteError("");
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          </section>
          {tab === "config" ? (
            <>
              {material && (
                <section className="panel completed-editing">
                  <Paintbrush size={20} />
                  <div>
                    <small>Editing material</small>
                    <strong>{material.name}</strong>
                  </div>
                </section>
              )}
              <details className="panel completed-control" open>
                <summary>
                  <Paintbrush size={17} /> Base color <ChevronDown size={16} />
                </summary>
                <div>
                  <label>
                    Color
                    <input
                      aria-label="Material base color"
                      type="color"
                      disabled={!materialSettings}
                      value={materialSettings?.color || "#ffffff"}
                      onInput={(e) =>
                        changeMaterial({ color: e.currentTarget.value })
                      }
                    />
                  </label>
                </div>
              </details>
              <details className="panel completed-control" open>
                <summary>
                  <SlidersHorizontal size={17} /> Metallic &amp; roughness{" "}
                  <ChevronDown size={16} />
                </summary>
                <div>
                  <label>
                    Metallic{" "}
                    <output>
                      {materialSettings?.metallic.toFixed(2) || "0.00"}
                    </output>
                  </label>
                  <input
                    aria-label="Metallic"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    disabled={!materialSettings}
                    value={materialSettings?.metallic || 0}
                    onInput={(e) =>
                      changeMaterial({
                        metallic: Number(e.currentTarget.value),
                      })
                    }
                  />
                  <label>
                    Roughness{" "}
                    <output>
                      {materialSettings?.roughness.toFixed(2) || "0.00"}
                    </output>
                  </label>
                  <input
                    aria-label="Roughness"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    disabled={!materialSettings}
                    value={materialSettings?.roughness || 0}
                    onInput={(e) =>
                      changeMaterial({
                        roughness: Number(e.currentTarget.value),
                      })
                    }
                  />
                </div>
              </details>
            </>
          ) : (
            <>
              <details className="panel completed-control" open>
                <summary>
                  Background <ChevronDown size={16} />
                </summary>
                <div>
                  <label>
                    Color{" "}
                    <input
                      aria-label="Viewer background"
                      type="color"
                      value={settings.background}
                      onInput={(e) =>
                        change({ background: e.currentTarget.value })
                      }
                    />
                  </label>
                </div>
              </details>
              <details className="panel completed-control" open>
                <summary>
                  Lighting <ChevronDown size={16} />
                </summary>
                <div>
                  <label>
                    Exposure <output>{settings.exposure.toFixed(1)}</output>
                  </label>
                  <input
                    aria-label="Exposure"
                    type="range"
                    min="0.2"
                    max="2"
                    step="0.1"
                    value={settings.exposure}
                    onInput={(e) =>
                      change({ exposure: Number(e.currentTarget.value) })
                    }
                  />
                  <label>
                    Shadow <output>{settings.shadow.toFixed(1)}</output>
                  </label>
                  <input
                    aria-label="Shadow"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.shadow}
                    onInput={(e) =>
                      change({ shadow: Number(e.currentTarget.value) })
                    }
                  />
                </div>
              </details>
              <section className="panel completed-control">
                <div>
                  <label>
                    Auto rotate{" "}
                    <input
                      type="checkbox"
                      checked={settings.rotate}
                      onInput={(e) =>
                        change({ rotate: e.currentTarget.checked })
                      }
                    />
                  </label>
                </div>
              </section>
            </>
          )}
          {saved && (
            <p className="todo-saved" role="status">
              <Check size={14} /> Viewer settings saved on this device
            </p>
          )}
          </>}
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
        </aside>
      </div>
      {confirmDelete && (
        <Modal
          title="Delete 3D model?"
          subtitle={p.name}
          onClose={() => {
            if (!deletingModel) setConfirmDelete(false);
          }}
        >
          <div className="modal-body">
            <p>
              Remove this model from the product? You can upload a replacement
              afterwards. Product details and the Review status will stay
              unchanged.
            </p>
            {deleteError && (
              <p className="error-banner" role="alert">
                {deleteError}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="button secondary"
              disabled={deletingModel}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button primary"
              disabled={deletingModel}
              onClick={() => void deleteModel()}
            >
              <Trash2 size={16} />
              {deletingModel ? "Deleting…" : "Delete model"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
