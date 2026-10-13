import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Box,
  Check,
  Download,
  Copy,
  QrCode,
  X,
  Trash2,
} from "lucide-react";
import type { Product, Role } from "../lib/types";
import type { Action } from "../lib/workflow";
import type { ViewerSettings, MaterialSetting } from "./ModelViewer";
import ProductSpecifications from "./ProductSpecifications";
import ProductDetailsCard from "./ProductDetailsCard";
import RevisionComments from "./RevisionComments";
import ModelImport from "./ModelImport";
import { useHdri } from "../lib/useHdri";
import HdriThumbnail from "./HdriThumbnail";
import ThemedSelect from "./ThemedSelect";
import ModelQrCode from "./ModelQrCode";
import { arViewLink } from "../lib/arView";
import { toneMappingOptions } from "../lib/toneMapping";
import {
  loadModelFile,
  removeModelFile,
  saveModelFile,
} from "../lib/modelFiles";
import { transition } from "../lib/workflow";
import { productStatusLabel } from "../lib/productStatus";
import { localModelKey, isLocalModel } from "../lib/modelReference";
const ModelStage = lazy(() =>
  import("./ModelViewer").then((m) => ({ default: m.ModelStage })),
);
const defaultSettings: ViewerSettings = {
  toneMapping: "auto",
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
      toneMapping: toneMappingOptions.some((option) => option.value === saved.toneMapping) ? saved.toneMapping : "auto",
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
  onCopy: (value: string, kind?: "url" | "uid" | "product-url") => void;
}) {
  const hdri = useHdri(p.id);
  const hdriInput = useRef<HTMLInputElement>(null);
  const detailsSave = useRef<{ save: () => Promise<boolean> }>(null);
  const modelPanel = useRef<HTMLElement>(null);
  const settingsColumn = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const viewer = modelPanel.current;
    const column = settingsColumn.current;
    const details = column?.querySelector<HTMLElement>(".product-specifications");
    const form = details?.querySelector<HTMLFormElement>("form");
    if (!viewer || !column || !details || !form) return;
    const alignDetails = () => {
      if (window.innerWidth <= 980) { form.style.removeProperty("height"); return; }
      const available = viewer.getBoundingClientRect().bottom - details.getBoundingClientRect().top;
      const heading = details.querySelector<HTMLElement>(".product-specifications-heading")?.getBoundingClientRect().height || 0;
      form.style.height = `${Math.max(120, available - heading - 2)}px`;
    };
    const observer = new ResizeObserver(alignDetails);
    observer.observe(viewer);
    const status = column.querySelector(".todo-info");
    if (status) observer.observe(status);
    window.addEventListener("resize", alignDetails);
    alignDetails();
    return () => { observer.disconnect(); window.removeEventListener("resize", alignDetails); form.style.removeProperty("height"); };
  }, [p.id, p.status]);
  const [saving, setSaving] = useState(false);
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
  const [qrOpen, setQrOpen] = useState(false);
  const shareUrl = arViewLink(localModel ? "" : p.modelUrl || modelUrl, window.location.origin, p.name);
  const hostedModelUrl = modelUrl && !modelUrl.startsWith("blob:") ? new URL(modelUrl, window.location.origin).href : "";
  const [modelScreenshot, setModelScreenshot] = useState("");
  useEffect(() => { setModelScreenshot(""); }, [modelUrl]);
  const modelName =
    localModel?.name ||
    modelUrl.split("/").pop()?.split("?")[0] ||
    "Product model";
  const storageKey = `glamar.viewer.${p.id}.${p.modelUrl}`;
  const [settings, setSettings] = useState(() => settingsFor(storageKey));
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const isDone = productStatusLabel(p.status) === "Done";
  useEffect(() => { setSaved(false); }, [p.status]);
  const published = p.consoleStatus === "Published";
  const [error, setError] = useState("");
  const [deletingModel, setDeletingModel] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const inReview = productStatusLabel(p.status) === "Review";
  const canDeleteModel =
    role === "Admin / Manager" ||
    role === "Reviewer" ||
    (role === "3D Artist" && p.assigneeId === userId);
  async function deleteModel() {
    if (deletingModel || !modelUrl || !canDeleteModel) return;
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
      setSettings(defaultSettings);
      setSaved(false);
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
  function change(next: Partial<ViewerSettings>) {
    setSettings((s) => ({ ...s, ...next }));
    setSaved(false);
  }
  async function save() {
    if (saving) return false;
    setSaving(true);
    setSaved(false);
    try {
      if (await detailsSave.current?.save() === false) return false;
      localStorage.setItem(storageKey, JSON.stringify(settings));
      setSaved(true);
      setError("");
      return true;
    } catch {
      setError(
        "Viewer settings could not be saved. Please free some browser storage and try again.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }
  async function publish() {
    if (!isDone || published || publishing || role !== "Admin / Manager") return;
    setPublishing(true);
    setPublishError("");
    try {
      if (!await save()) {
        setPublishError("Could not save product changes. Please check the fields and try again.");
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
        environmentUrl={hdri.url}
        onScreenshot={setModelScreenshot}
      />
    </Suspense>
  );
  const lightingContent = (
<section className="completed-control lighting-panel" aria-label="Lighting controls">
                <div>
                  <label>
                    Background color{" "}
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
                <div>
                  <div className="hdri-upload">
                    <span>HDRI environment</span>
                    <HdriThumbnail file={hdri.file} busy={hdri.busy} onUpload={(file) => {
                      if (file) void hdri.update(file);
                      else hdriInput.current?.click();
                    }} />
                    <input ref={hdriInput} hidden type="file" accept=".hdr" aria-label="Upload HDRI environment" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void hdri.update(file);
                      e.target.value = "";
                    }} />
                    {hdri.file && <button type="button" className="button secondary" disabled={hdri.busy} onClick={() => void hdri.update()}>Use default lighting</button>}
                    <small>.hdr · Maximum 20 MB</small>
                    {hdri.error && <p className="error-banner" role="alert">{hdri.error}</p>}
                  </div>
                  <div className="tone-mapping-control">
                    <label>Tone mapping</label>
                    <ThemedSelect label="Tone mapping" value={settings.toneMapping ?? "auto"} options={toneMappingOptions} onChange={(toneMapping) => change({ toneMapping })} />
                  </div>
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
              </section>
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
            disabled={saving || (isDone && (!modelUrl || publishing || published || role !== "Admin / Manager"))}
            title={isDone && role !== "Admin / Manager" ? "Only a manager can publish products" : undefined}
            onClick={isDone ? () => void publish() : save}
          >
            {isDone ? (publishing ? "Publishing…" : published ? "Published" : "Publish") : saving ? "Saving…" : saved ? (
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
          <section className="panel completed-model-info">
            <h3>3D model</h3>
            <div>
              <div className="product-image model-screenshot">
                {modelScreenshot ? <img src={modelScreenshot} alt={`3D model screen grab of ${p.name}`} /> : <Box size={24} aria-label="3D model preview" />}
              </div>
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
                  onClick={() => void deleteModel()}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
            {deleteError && <p className="error-banner" role="alert">{deleteError}</p>}
            {modelUrl && (
              <a className="button secondary model-card-download" href={modelUrl} download={modelName} target="_blank" rel="noreferrer" aria-label="Download GLB">
                <Download size={16} /> Download GLB
              </a>
            )}
          </section>


        </aside>
        <section
          ref={modelPanel}
          className="todo-gallery panel completed-model-panel"
          aria-label="Product 3D model"
        >
          {modelUrl ? (
            stage
          ) : (
            <ModelImport productId={p.id} onImported={setLocalModel} />
          )}
          {modelUrl && <div className="model-share-bar">
            <input aria-label="3D model CDN URL" readOnly value={hostedModelUrl} placeholder="Upload to a CDN to get a shareable model URL" />
            <button type="button" className="icon-button model-share-action" aria-label="Copy model URL" title="Copy model URL" disabled={!hostedModelUrl} onClick={() => onCopy(hostedModelUrl, "url")}><Copy size={18} /></button>
            <button type="button" className="icon-button model-share-action" aria-label="Show model QR code" title="Show QR code" aria-expanded={qrOpen} disabled={!shareUrl} onClick={() => setQrOpen(open => !open)}><QrCode size={20} /></button>
            {qrOpen && shareUrl && <div className="panel model-share-qr-popover">
              <button type="button" className="icon-button model-share-qr-close" aria-label="Close model QR code" onClick={() => setQrOpen(false)}><X size={18} /></button>
              <ModelQrCode url={shareUrl} name={p.name} />
            </div>}
          </div>}
        </section>
        <aside ref={settingsColumn} className="todo-settings-column">
          <ProductDetailsCard
            product={p}
            role={role}
            userId={userId}
            onUpdate={onUpdate}
          />
          <ProductSpecifications
            lighting={lightingContent}
            saveRef={detailsSave}
            onChange={() => setSaved(false)}
            initiallyOpen
            onCopy={(value, kind) => onCopy(value, kind || "uid")}
            product={p}
            editable={role === "Admin / Manager"}
            onUpdate={onUpdate}
          />
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
        </aside>
        <RevisionComments product={p} role={role} userId={userId} onUpdate={onUpdate} />
      </div>

    </div>
  );
}
