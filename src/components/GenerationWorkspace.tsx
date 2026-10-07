import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Box,
  ArrowLeft,
  Check,
  Download,
  ChevronDown,
  ImagePlus,
  History,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  Video,
  X,
} from "lucide-react";
import type { Product } from "../lib/types";
import {
  CREDITS_PER_PRODUCT,
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
import { loadModelGenerationSettings, modelGenerationSettingsKey } from "../lib/modelGenerationSettings";
import { ProductImage } from "./UI";
import { useModelUrl } from "../lib/useModelUrl";
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
}: {
  products: Product[];
  activeProduct?: Product;
  onBack?: () => void;
  onStatusChange?: (result: GenerationResult) => void;
  onSync?: (url: string, file?: File) => Promise<void>;
}) {
  const settingsKey = activeProduct
    ? `glamar.video-render.settings.v1.${activeProduct.id}`
    : "glamar.video-render.settings.v1";
  const modelKey = activeProduct?.id || "video-generation-workspace";
  const generationSettingsKey = modelGenerationSettingsKey(modelKey);
  const [generationSettings, setGenerationSettings] = useState(() => loadModelGenerationSettings(modelKey));
  const [generationNotice, setGenerationNotice] = useState("");
  const generationSettingsHeading = useRef<HTMLHeadingElement>(null);
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
  const [regenerateRequested, setRegenerateRequested] = useState(false);
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
  const modelSource = productModelUrl || DEMO_MODEL_URL;
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
        JSON.stringify(generationSettings),
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
          <button className="button primary" onClick={() => void sync()} disabled={syncing || modelLoading || busy || !onSync || !modelUrl}>
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
              className="button secondary"
              disabled={downloading}
              onClick={() => void downloadModel()}
              title={isSampleModel ? "Download the sample model shown in the viewer" : "Download the model shown in the viewer"}
            >
              <Download size={16} />
              {downloading ? "Downloading…" : "Download 3D model"}
            </button>
            {isSampleModel && <small>Sample model · GLB</small>}
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
        </aside>
        <div className="generation-preview-column">
          <section className="panel generation-viewport">{stage()}</section>
          <section className="panel generation-history">
            <h3>
              <History size={17} /> Generation history
            </h3>
            <div className="generation-history-row">
              {modelScreenshot ? (
                <img
                  className="generation-history-thumbnail"
                  src={modelScreenshot}
                  alt={`Screen grab of ${isSampleModel ? "the sample studio chair" : modelName} 3D model`}
                  style={{ background }}
                />
              ) : (
                <span className="generation-history-placeholder">
                  <Box size={24} />
                </span>
              )}
              <div className="generation-history-copy">
                <strong>Previously generated model</strong>
                <small>Demo preview</small>
              </div>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setRegenerateRequested(true);
                  generationSettingsHeading.current?.focus();
                }}
              >
                <RotateCcw size={14} /> Re-Generate
              </button>
            </div>
            {regenerateRequested && (
              <p role="status" className="generation-history-note">
                Choose your generation settings, then select Re-Generate.
              </p>
            )}
          </section>
        </div>
        <aside className="panel generation-model-settings">
          <h3 ref={generationSettingsHeading} tabIndex={-1}>
            <SlidersHorizontal size={18} /> Generation settings
          </h3>
          <div className="generation-model-settings-body">
            <GenerationSettingsFields value={generationSettings} onChange={(value) => {
              setGenerationSettings(value);
              setSaved(false);
              setGenerationNotice("");
            }} />
            <div className="generation-credit-consumption">
              <h4>Credit Consumption</h4>
              <div>
                <span>1 product × {CREDITS_PER_PRODUCT} credits</span>
                <strong>{CREDITS_PER_PRODUCT} credits</strong>
              </div>
              <small>Per regeneration · No credits charged in demo</small>
            </div>
            <button
              type="button"
              className="button primary generation-regenerate"
              onClick={() =>
                setGenerationNotice(
                  "Demo preview only. Model generation is not connected yet.",
                )
              }
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
