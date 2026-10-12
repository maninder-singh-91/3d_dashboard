import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Box,
  Clock,
  ArrowLeft,
  Check,
  Download,
  ChevronDown,
  ImagePlus,
  History,
  RotateCcw,
  Trash2,
  SlidersHorizontal,
  Upload,
  Video,
  X,
} from "lucide-react";
import type { Product } from "../lib/types";
import {
  type GenerationResult,
} from "../lib/generationSelection";
import { DEMO_MODEL_URL } from "../lib/batchGeneration";
import {
  defaultRenderSettings,
  renderFields,
  restoreRenderSettings,
  type RenderField,
} from "../lib/renderSettings";
import {
  loadModelFile,
  saveModelFile,
  validateModelFile,
} from "../lib/modelFiles";
import ThemedSelect from "./ThemedSelect";
import GenerationSettingsFields from "./GenerationSettingsFields";
import { generationCredits, generationPrompt, loadModelGenerationSettings, modelGenerationSettingsKey } from "../lib/modelGenerationSettings";
import { ProductImage } from "./UI";
import { useModelUrl } from "../lib/useModelUrl";
import { LOCAL_MODEL_PREFIX } from "../lib/modelReference";
import { appendGenerationHistory, generationHistoryKey, loadGenerationHistory, withoutQueuedPlaceholder } from "../lib/generationHistory";
import GenerationHistoryCard from "./GenerationHistoryCard";
import "../generation-workspace.css";

const ModelStage = lazy(() =>
  import("./ModelViewer").then((module) => ({ default: module.ModelStage })),
);


export default function GenerationWorkspace({
  products,
  activeProduct,
  onBack,
  onStatusChange,
  onSync,
  jobStatus,
  jobProgress,
  onCancel,
}: {
  products: Product[];
  activeProduct?: Product;
  onBack?: () => void;
  onStatusChange?: (result: GenerationResult) => void;
  onSync?: (url: string, file?: File) => Promise<void>;
  jobStatus?: string;
  jobProgress?: number;
  onCancel?: () => void;
}) {
  const queued = jobStatus === "In Queue";
  const generating = jobStatus === "In progress";
  const waiting = queued || generating;
  const settingsKey = activeProduct
    ? `glamar.video-render.settings.v1.${activeProduct.id}`
    : "glamar.video-render.settings.v1";
  const modelKey = activeProduct?.id || "video-generation-workspace";
  const generationSettingsKey = modelGenerationSettingsKey(modelKey);
  const [generationSettings, setGenerationSettings] = useState(() => loadModelGenerationSettings(modelKey));
  const [generationNotice, setGenerationNotice] = useState("");
  const [generationHistory, setGenerationHistory] = useState(() => loadGenerationHistory(modelKey));
  const [selectedGeneration, setSelectedGeneration] = useState(() => loadGenerationHistory(modelKey).filter((entry) => !entry.deleted).at(-1)?.id || "");
  const [checkedGenerations, setCheckedGenerations] = useState<string[]>([]);
  const [lastDeletedGenerations, setLastDeletedGenerations] = useState<string[]>(() => loadGenerationHistory(modelKey).filter((entry) => entry.deleted).map((entry) => entry.id));

  const [settings, setSettings] = useState(() => {
    try {
      return restoreRenderSettings(
        JSON.parse(localStorage.getItem(settingsKey) || "null"),
      );
    } catch {
      return { ...defaultRenderSettings };
    }
  });
  const [modelId, setModelId] = useState(activeProduct?.id || "sample");
  const [modelFile, setModelFile] = useState<File>();
  const [localUrl, setLocalUrl] = useState("");
  const [modelScreenshot, setModelScreenshot] = useState("");
  const [logo, setLogo] = useState<{ url: string; name: string }>();
  const [musicFile, setMusicFile] = useState<File>();
  const [controlsOpen, setControlsOpen] = useState(false);

  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [error, setError] = useState("");
  const modelInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const controlsToggle = useRef<HTMLButtonElement>(null);
  const catalog = products.filter((p) => p.modelUrl);
  const product = activeProduct || catalog.find((p) => p.id === modelId);
  const productModelUrl =
    modelId === "upload" ? localUrl : product?.modelUrl || localUrl;
  const selectedHistoryEntry = generationHistory.find((entry) => entry.id === selectedGeneration);
  const visibleHistory = (queued ? withoutQueuedPlaceholder(generationHistory) : generationHistory).filter((entry) => !entry.deleted);
  useEffect(() => {
    if (!queued) return;
    const history = withoutQueuedPlaceholder(generationHistory);
    if (history.length === generationHistory.length) return;
    try {
      localStorage.setItem(generationHistoryKey(modelKey), JSON.stringify(history));
      setGenerationHistory(history);
      setSelectedGeneration(history.filter(entry => !entry.deleted).at(-1)?.id || "");
    } catch { setError("Generation history could not be updated."); }
  }, [queued, generationHistory, modelKey]);
  const modelSource = selectedHistoryEntry?.modelUrl || productModelUrl || DEMO_MODEL_URL;
  const { url: modelUrl, error: modelResolutionError } = useModelUrl(modelSource);
  const isSampleModel = modelUrl === DEMO_MODEL_URL;
  useEffect(() => setModelScreenshot(""), [modelUrl]);
  const modelName = activeProduct
    ? activeProduct.name
    : modelId === "upload"
      ? modelFile?.name || "Uploaded model"
      : product?.name || "Studio chair · Sample model";
  const background =
    settings.background === "Dark studio"
      ? "#202024"
      : settings.background === "White studio"
        ? "#ffffff"
        : "radial-gradient(ellipse at center, #f4f4f5 0%, #bfc0c6 100%)";
  useEffect(() => {
    let live = true;
    void loadModelFile(modelKey)
      .then((file) => {
        if (live && file) {
          setModelFile(file);
          if (activeProduct) setModelId("upload");
        }
      })
      .catch(() => {
        if (live)
          setError(
            "The saved model could not be loaded. Please upload it again.",
          );
      }).finally(() => { if (live) setModelLoading(false); });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!modelFile) return;
    const url = URL.createObjectURL(modelFile);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [modelFile]);
  useEffect(() => {
    if (waiting || modelLoading || generationHistory.length || (modelFile && !localUrl)) return;
    const source = modelFile ? `${LOCAL_MODEL_PREFIX}${modelKey}` : productModelUrl || DEMO_MODEL_URL;
    if (source.startsWith("blob:")) return;
    try {
      const next = appendGenerationHistory([], { modelUrl: source, settings: generationSettings, thumbnail: modelScreenshot, preview: source === DEMO_MODEL_URL, origin: source === DEMO_MODEL_URL && jobStatus !== "Completed" ? "initial" : "generated" });
      localStorage.setItem(generationHistoryKey(modelKey), JSON.stringify(next));
      setGenerationHistory(next);
      setSelectedGeneration(next[0].id);
    } catch { setError("Generation history could not be saved."); }
  }, [jobStatus, waiting, modelLoading, generationHistory.length, modelFile, localUrl, modelKey, productModelUrl, generationSettings, modelScreenshot]);
  useEffect(() => {
    if (!modelScreenshot || !selectedHistoryEntry || selectedHistoryEntry.thumbnail) return;
    const next = generationHistory.map((entry) => entry.id === selectedGeneration ? { ...entry, thumbnail: modelScreenshot } : entry);
    try {
      localStorage.setItem(generationHistoryKey(modelKey), JSON.stringify(next));
      setGenerationHistory(next);
    } catch { /* Keep the model selectable if thumbnail storage is full. */ }
  }, [modelScreenshot, selectedGeneration, selectedHistoryEntry, generationHistory, modelKey]);
  async function regenerate() {
    if (generating || busy || modelLoading) return;
    setBusy(true);
    setError("");
    try {
      let source = modelSource;
      if (source.startsWith("blob:")) {
        if (!modelFile) throw Error("Upload a model before adding a preview generation.");
        const fileKey = crypto.randomUUID();
        await saveModelFile(fileKey, modelFile);
        source = `${LOCAL_MODEL_PREFIX}${fileKey}`;
      }
      const next = appendGenerationHistory(generationHistory, { modelUrl: source, settings: generationSettings, thumbnail: modelScreenshot, preview: true, origin: "generated" });
      localStorage.setItem(generationHistoryKey(modelKey), JSON.stringify(next));
      setGenerationHistory(next);
      setSelectedGeneration(next.at(-1)!.id);
      setSaved(false);
      setGenerationNotice("Preview generation added using the displayed model. AI generation is not connected yet.");
      onStatusChange?.({ status: "Completed", outputUrl: source, generationId: next.at(-1)!.id, message: "Demo preview generated." });
    } catch (error) { setError((error as Error).message || "Generation history could not be saved."); }
    finally { setBusy(false); }
  }
  function deleteHistory(undo = false) {
    const ids = undo ? lastDeletedGenerations : checkedGenerations;
    if (!ids.length) return;
    const next = generationHistory.map((entry) => ids.includes(entry.id) ? { ...entry, deleted: !undo } : entry);
    try {
      localStorage.setItem(generationHistoryKey(modelKey), JSON.stringify(next));
      setGenerationHistory(next);
      if (!undo && ids.includes(selectedGeneration)) setSelectedGeneration(next.filter((entry) => !entry.deleted).at(-1)?.id || "");
      setLastDeletedGenerations(undo ? [] : ids);
      setCheckedGenerations([]);
    } catch { setError("Generation history could not be updated. Please try again."); }
  }
  useEffect(
    () => () => {
      if (logo) URL.revokeObjectURL(logo.url);
    },
    [logo],
  );
  function change(key: RenderField, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }
  async function sync() {
    if (syncing || modelLoading || !onSync || !modelUrl) return;
    setSyncing(true);
    setSaved(false);
    setError("");
    try {
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      localStorage.setItem(
        generationSettingsKey,
        JSON.stringify({ ...generationSettings, resolvedPrompt: generationPrompt(generationSettings) }),
      );
      await onSync(modelSource, modelSource === localUrl ? modelFile : undefined);
      setSaved(true);
      setError("");
    } catch (error) {
      setError((error as Error).message || "The model could not be synced. Please try again.");
    } finally {
      setSyncing(false);
    }
  }
  async function downloadModel() {
    if (downloading) return;
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(modelUrl, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw Error("Model download failed.");
      const blob = await response.blob();
      if (!blob.size || blob.type.includes("text/html")) throw Error("Model unavailable.");
      const filename = isSampleModel
        ? "studio-chair-sample.glb"
        : `${(product?.sku || modelName).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\.glb$/i, "")}-model.glb`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("The 3D model could not be downloaded. Please check the model source and try again.");
    } finally {
      setDownloading(false);
    }
  }
  async function importModel(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      await validateModelFile(file);
      await saveModelFile(modelKey, file);
      const historyFileKey = crypto.randomUUID();
      await saveModelFile(historyFileKey, file);
      const next = appendGenerationHistory(generationHistory, { modelUrl: `${LOCAL_MODEL_PREFIX}${historyFileKey}`,
        settings: generationSettings, thumbnail: "", preview: false, origin: "imported" });
      localStorage.setItem(generationHistoryKey(modelKey), JSON.stringify(next));
      setGenerationHistory(next);
      setSelectedGeneration(next.at(-1)!.id);
      setModelFile(file);
      setModelId("upload");
    } catch (e) {
      setError((e as Error).message || "The model could not be imported.");
    } finally {
      setBusy(false);
    }
  }
  function field(key: RenderField) {
    const definition = renderFields[key];
    return (
      <div className="generation-field" key={key}>
        <span>{definition.label}</span>
        <ThemedSelect
          label={definition.label}
          value={settings[key]}
          options={definition.options.map((value) => ({ value, label: value }))}
          onChange={(value) => change(key, value)}
        />
      </div>
    );
  }
  function stage(expanded = false) {
    if (queued) return <div className="generation-queued-stage"><Clock size={32} aria-hidden="true" /><span role="status">In Queue</span>
      {onCancel && <button type="button" className="generation-queue-cancel" onClick={onCancel}>Cancel Generation</button>}
    </div>;
    if (generating) return <div className="generation-queued-stage generation-progress-stage">
      <span role="status">Generation in progress</span>
      <progress aria-label="Generation progress" max={100} value={jobProgress} />
      {jobProgress !== undefined && <span>{jobProgress}%</span>}
    </div>;
    if (!modelUrl)
      return (
        <div className="generation-missing-model">
          {activeProduct && <ProductImage product={activeProduct} />}
          <p>No 3D model uploaded for this product.</p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => modelInput.current?.click()}
          >
            <Upload size={16} />
            {busy ? "Importing…" : "Upload model"}
          </button>
        </div>
      );
    return (
      <div className={`generation-stage ${expanded ? "expanded" : ""}`}>
        <Suspense
          fallback={<div className="completed-empty">Loading model…</div>}
        >
          <ModelStage
            key={modelUrl}
            url={modelUrl}
            name={isSampleModel ? "Studio chair · Sample model" : modelName}
            onScreenshot={setModelScreenshot}
            onLoadError={() =>
              onStatusChange?.({
                status: "Needs attention",
                message:
                  "The model could not be loaded. Check the model file or URL.",
              })
            }
            settings={{
              background,
              exposure: 1,
              shadow: settings.pose === "Resting on surface" ? 1 : 0,
              rotate: false,
              materials: {},
            }}
          />
        </Suspense>
        {logo && (
          <img
            className={`generation-logo ${settings.placement.toLowerCase().replace(" ", "-")}`}
            style={{
              mixBlendMode:
                settings.blending === "Overlay" ? "overlay" : "normal",
            }}
            src={logo.url}
            alt="Brand logo"
          />
        )}
      </div>
    );
  }
  return (
    <div className="generation-workspace">
      <div className="generation-toolbar generation-reference-header">
        <div className="generation-header-identity">
          {onBack && (
            <button className="generation-header-back" onClick={onBack}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <h1>{modelName}</h1>
          {product?.category && (
            <span className="generation-header-category">
              {product.category}
            </span>
          )}
        </div>
        <div className="row">
          {onBack && <button type="button" className="button secondary" onClick={onBack}>Generation Queue</button>}
          <button className="button primary" onClick={() => void sync()} disabled={waiting || syncing || modelLoading || busy || !onSync || !modelUrl}>
            {syncing ? "Syncing…" : saved ? (
              <>
                <Check size={16} /> Synced
              </>
            ) : (
              "Sync"
            )}
          </button>
        </div>
      </div>
      {(error || modelResolutionError) && (
        <p role="alert" className="error-banner">
          {error || modelResolutionError}
        </p>
      )}
      {saved && (
        <p role="status" className="generation-saved">
          {isSampleModel ? "Sample 3D model" : "3D model"} synced to SKU {activeProduct?.sku} · Product UID {activeProduct?.id}.
        </p>
      )}
      <div className="generation-layout">
        <aside className="generation-library">
          <section className="panel generation-source">
            <h3>
              <Box size={17} /> 3D model
            </h3>
            {activeProduct ? (
              <div className="generation-source-product">
                <ProductImage product={activeProduct} />
                <p>{activeProduct.name}</p>
                <small>SKU {activeProduct.sku}</small>
              </div>
            ) : (
              <ThemedSelect
                label="Select 3D model"
                value={modelId}
                options={[
                  { value: "sample", label: "Studio chair · Sample" },
                  ...(modelFile
                    ? [{ value: "upload", label: modelFile.name }]
                    : []),
                  ...catalog.map((p) => ({
                    value: p.id,
                    label: `${p.name} · ${p.sku}`,
                  })),
                ]}
                onChange={setModelId}
              />
            )}
            <button
              type="button"
              className="button primary"
              disabled={waiting || downloading}
              onClick={() => void downloadModel()}
              title={isSampleModel ? "Download the sample model shown in the viewer" : "Download the model shown in the viewer"}
            >
              <Download size={16} />
              {downloading ? "Downloading…" : "Download 3D model"}
            </button>
            {!waiting && isSampleModel && <small>Sample model · GLB</small>}
            <input
              type="file"
              hidden
              ref={modelInput}
              accept=".glb"
              aria-label="Upload generation model"
              onChange={(e) => {
                void importModel(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </section>
          <section className="panel generation-history">
            <h3 className="generation-history-heading">
              <History size={17} /> Generation history
              <button type="button" className="icon-button" aria-label="Delete selected generations" title="Delete selected generations"
                disabled={!checkedGenerations.length} onClick={() => deleteHistory()}><Trash2 size={17} /></button>
            </h3>
            <div className="generation-history-list">
              {visibleHistory.map((entry) => <GenerationHistoryCard key={entry.id} entry={entry}
                checked={checkedGenerations.includes(entry.id)} onCheck={() => setCheckedGenerations((ids) => ids.includes(entry.id) ? ids.filter((id) => id !== entry.id) : [...ids, entry.id])}
                selected={entry.id === selectedGeneration} onSelect={() => { setSelectedGeneration(entry.id); setSaved(false); }} />)}
            </div>
            {!visibleHistory.length && <p className="generation-history-note">No generations yet.</p>}
            {!!lastDeletedGenerations.length && <button type="button" className="text-button generation-history-undo" onClick={() => deleteHistory(true)}>Undo delete</button>}
          </section>
        </aside>
        <div className="generation-preview-column">
          <section className="panel generation-viewport">{stage()}</section>

        </div>
        <aside className={`panel generation-model-settings${waiting ? " generation-settings-disabled" : ""}`}>
          <h3>
            <SlidersHorizontal size={18} /> Generation settings
          </h3>
          <div className="generation-model-settings-body">
            <fieldset className="generation-settings-fields" disabled={waiting} aria-label="Generation settings controls">
            <GenerationSettingsFields value={generationSettings} onChange={(value) => {
              if (waiting) return;
              setGenerationSettings(value);
              setSaved(false);
              setGenerationNotice("");
            }} />
            </fieldset>
            <div className="generation-credit-consumption">
              <h4>Credit Consumption</h4>
              <div>
                <span>1 product × {generationCredits(generationSettings)} credits</span>
                <strong>{generationCredits(generationSettings)} credits</strong>
              </div>
              <small>Per generation</small>
            </div>
            <button
              type="button"
              className="button primary generation-regenerate"
              disabled={waiting || busy || modelLoading}
              onClick={() => void regenerate()}
            >
              <RotateCcw size={16} /> Re-Generate
            </button>
            {generationNotice && (
              <p role="status" className="generation-history-note">
                {generationNotice}
              </p>
            )}
          </div>
        </aside>
        <aside className="panel generation-controls" hidden>
          <h3>
            <button
              type="button"
              className="generation-controls-toggle"
              ref={controlsToggle}
              aria-expanded={controlsOpen}
              aria-controls="ai-video-generation-settings"
              onClick={() => setControlsOpen((open) => !open)}
            >
              <Video size={18} /> AI Video Generation
              <ChevronDown size={16} />
            </button>
          </h3>
          <div id="ai-video-generation-settings" hidden={!controlsOpen}>
            <details open>
              <summary>
                <SlidersHorizontal size={16} /> Render settings{" "}
                <ChevronDown size={15} />
              </summary>
              {field("renderType")}
              {field("aspect")}
              {field("resolution")}
              {field("duration")}
              {settings.duration === "Custom" && (
                <label className="generation-field">
                  <span>Seconds</span>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    aria-label="Custom duration in seconds"
                    value={settings.customDuration}
                    onChange={(e) => {
                      setSettings((s) => ({
                        ...s,
                        customDuration: Math.min(
                          120,
                          Math.max(1, Number(e.target.value) || 1),
                        ),
                      }));
                      setSaved(false);
                    }}
                  />
                </label>
              )}
            </details>
            <details open>
              <summary>
                <Box size={16} /> Scene &amp; motion <ChevronDown size={15} />
              </summary>
              {field("background")}
              {field("pose")}
              {field("camera")}
              {field("bloom")}
            </details>
            <details open>
              <summary>
                <ImagePlus size={16} /> Branding <ChevronDown size={15} />
              </summary>
              <div className="generation-field">
                <span>Logo</span>
                <div className="generation-upload-control">
                  <button
                    className="generation-upload"
                    onClick={() => logoInput.current?.click()}
                  >
                    {logo ? logo.name : "Upload logo"}
                  </button>
                  {logo && (
                    <button
                      aria-label="Remove logo"
                      onClick={() => setLogo(undefined)}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={logoInput}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Upload brand logo"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      file.type,
                    ) ||
                    file.size > 5 * 1024 * 1024
                  ) {
                    setError("Choose a PNG, JPG, or WebP logo up to 5 MB.");
                    return;
                  }
                  setError("");
                  setLogo({ url: URL.createObjectURL(file), name: file.name });
                }}
              />
              {field("blending")}
              {field("placement")}
            </details>
            <details open>
              <summary>
                <Upload size={16} /> Export <ChevronDown size={15} />
              </summary>
              {field("music")}
              {settings.music === "Custom" && (
                <div className="generation-field">
                  <span>Audio file</span>
                  <button
                    className="generation-upload"
                    onClick={() => musicInput.current?.click()}
                  >
                    {musicFile?.name || "Upload music"}
                  </button>
                </div>
              )}
              <input
                ref={musicInput}
                hidden
                type="file"
                accept="audio/*"
                aria-label="Upload custom music"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (
                    !file.type.startsWith("audio/") ||
                    file.size > 20 * 1024 * 1024
                  ) {
                    setError("Choose an audio file up to 20 MB.");
                    return;
                  }
                  setError("");
                  setMusicFile(file);
                }}
              />
              {field("format")}
            </details>
            <div className="generation-submit">
              <button
                className="button primary"
                disabled
                aria-describedby="generation-service-note"
              >
                <Video size={16} /> Generate video
              </button>
              <p id="generation-service-note">
                Video rendering is not connected yet. You can preview your model
                and save render settings.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
