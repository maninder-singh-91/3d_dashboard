import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Play,
  Plus,
  Search,
  Square,
  Sparkles,
  X,
} from "lucide-react";
import type { Batch, Product } from "../lib/types";
import { ProductImage } from "./UI";
import ThemedSelect from "./ThemedSelect";
import BatchImageUpload, { type BatchImage } from "./BatchImageUpload";
import { loadReferences, saveReferences } from "../lib/referenceImages";
import { MAX_REFERENCE_IMAGES, referenceError } from "../lib/generation";
import {
  createGenerationJob,
  DEMO_MODEL_URL,
  itemStatus,
  jobStatus,
  readGenerationJobs,
  updateGenerationJobs,
  type GenerationJob,
} from "../lib/batchGeneration";
const ModelViewer = lazy(() => import("./ModelViewer"));

export default function BatchGeneration({
  products,
  batches,
  onOpenProduct,
}: {
  products: Product[];
  batches: Batch[];
  onOpenProduct: (id: string) => void;
}) {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [view, setView] = useState<"create" | "history">("create");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [source, setSource] = useState<"images" | "catalog">("images");
  const [images, setImages] = useState<BatchImage[]>([]);
  const [refs, setRefs] = useState<Record<string, File[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [batch, setBatch] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);
  const selectionInput = useRef<HTMLInputElement>(null);
  const productIds = products.map((p) => p.id).join("|");
  useEffect(() => {
    const refresh = () => {
      try {
        setJobs(readGenerationJobs());
      } catch (e) {
        setError((e as Error).message);
      }
    };
    refresh();
    window.addEventListener("glamar-generation-update", refresh);
    window.addEventListener("storage", refresh);
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => {
      clearInterval(timer);
      window.removeEventListener("glamar-generation-update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  useEffect(() => {
    let live = true;
    setLoaded(false);
    Promise.all(
      products.map(async (p) => [p.id, await loadReferences(p.id)] as const),
    )
      .then((items) => {
        if (live) {
          setRefs(Object.fromEntries(items));
          setLoaded(true);
        }
      })
      .catch(() => {
        if (live)
          setError(
            "Reference images could not be loaded. Reopen Batch Render to try again.",
          );
      });
    return () => {
      live = false;
    };
  }, [productIds]);
  const referenceCount = (p: Product) =>
    (refs[p.id]?.length || 0) + (p.imageUrl ? 1 : 0);
  const visible = products.filter(
    (p) =>
      (!batch || p.batchId === batch) &&
      `${p.name} ${p.sku} ${p.brand}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const chosen = products.filter((p) => selected.includes(p.id));
  const missing =
    source === "images"
      ? 0
      : chosen.filter((p) => referenceCount(p) === 0).length;
  const modelCount = source === "images" ? images.length : chosen.length;
  const active = jobs.find((j) => j.id === activeId);
  const allVisibleSelected =
    visible.length > 0 && visible.every((p) => selected.includes(p.id));
  useEffect(() => {
    if (selectionInput.current)
      selectionInput.current.indeterminate =
        !allVisibleSelected && visible.some((p) => selected.includes(p.id));
  }, [selected, query, batch, allVisibleSelected]);
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );
  }
  async function upload(files: File[]) {
    const id = uploadTarget.current;
    if (!id || !files.length) return;
    setError("");
    const current = refs[id] || [];
    if (current.length + files.length > MAX_REFERENCE_IMAGES) {
      setError("Add up to 6 uploaded reference images per product.");
      return;
    }
    const problem = files.map(referenceError).find(Boolean);
    if (problem) {
      setError(problem);
      return;
    }
    setUploading(id);
    try {
      const next = [...current, ...files];
      await saveReferences(id, next);
      setRefs((r) => ({ ...r, [id]: next }));
    } catch {
      setError(
        "Images could not be saved. Try smaller files or free browser storage.",
      );
    } finally {
      setUploading(null);
    }
  }
  async function start() {
    if ((source === "catalog" && !loaded) || busy || uploading) return;
    setBusy(true);
    setError("");
    try {
      if (source === "images") {
        await Promise.all(
          images.map((image) => saveReferences(image.id, [image.file])),
        );
      }
      const job = createGenerationJob(
        name,
        source === "images"
          ? images.map((image) => ({
              productId: image.id,
              name: image.file.name,
              sku: "",
              imageUrl: "",
              referenceCount: 1,
            }))
          : chosen.map((p) => ({
              productId: p.id,
              name: p.name,
              sku: p.sku,
              imageUrl: p.imageUrl,
              referenceCount: referenceCount(p),
            })),
      );
      setJobs(await updateGenerationJobs((current) => [job, ...current]));
      setNow(Date.now());
      setActiveId(job.id);
      setView("history");
      setSelected([]);
      setImages([]);
      setName("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel(job: GenerationJob) {
    setBusy(true);
    setError("");
    try {
      setJobs(
        await updateGenerationJobs((current) =>
          current.map((j) =>
            j.id === job.id && jobStatus(j).status === "Generating"
              ? { ...j, cancelledAt: Date.now() }
              : j,
          ),
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportResults(job: GenerationJob) {
    const contents = JSON.stringify(
      {
        name: job.name,
        demo: true,
        note: "All previews use the same sample chair, not generated product geometry.",
        products: job.items.map((item, i) => ({
          ...item,
          status: itemStatus(job, i, now),
          modelUrl: itemStatus(job, i, now) === "Ready" ? DEMO_MODEL_URL : null,
        })),
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([contents], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.name.replace(/[^a-z0-9_-]/gi, "-")}-demo-results.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="batch-generation">
      <div className="batch-generation-tabs">
        <div
          className="spec-section-switch"
          role="group"
          aria-label="Batch generation views"
        >
          <button
            type="button"
            aria-pressed={view === "create"}
            onClick={() => {
              setView("create");
              setActiveId(null);
            }}
          >
            Create batch
          </button>
          <button
            type="button"
            aria-pressed={view === "history"}
            onClick={() => {
              setView("history");
              setActiveId(null);
            }}
          >
            Render history <span className="count">{jobs.length}</span>
          </button>
        </div>
        <span className="ai-demo-badge">
          <Sparkles size={13} /> Demo generation
        </span>
      </div>
      {error && (
        <div className="batch-generation-error" role="alert">
          {error}
          <button
            className="icon-button"
            aria-label="Dismiss batch error"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {view === "create" ? (
        <div className="batch-generation-layout">
          <section className="panel batch-selection">
            <div
              className="batch-source-switch"
              role="group"
              aria-label="Generation source"
            >
              <button
                type="button"
                aria-pressed={source === "images"}
                disabled={busy}
                onClick={() => setSource("images")}
              >
                Upload images
              </button>
              <button
                type="button"
                aria-pressed={source === "catalog"}
                disabled={busy}
                onClick={() => setSource("catalog")}
              >
                From product library
              </button>
            </div>
            {source === "images" ? (
              <BatchImageUpload
                images={images}
                onChange={setImages}
                disabled={busy}
                onError={setError}
              />
            ) : (
              <>
                <div className="section-title">
                  <div>
                    <h3>Select products</h3>
                    <p>
                      Use product images or add reference views for each model.
                    </p>
                  </div>
                  <span className="count">{products.length}</span>
                </div>
                <div className="batch-selection-toolbar">
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      aria-label="Search products for generation"
                      placeholder="Search products or SKU…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <ThemedSelect
                    label="Filter production batch"
                    value={batch}
                    options={[
                      { value: "", label: "All production batches" },
                      ...batches.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                    onChange={setBatch}
                  />
                </div>
                <div className="batch-selection-count">
                  <label>
                    <input
                      ref={selectionInput}
                      type="checkbox"
                      aria-label="Select all visible products"
                      checked={allVisibleSelected}
                      disabled={!loaded || !visible.length}
                      onChange={() =>
                        setSelected((current) =>
                          allVisibleSelected
                            ? current.filter(
                                (id) => !visible.some((p) => p.id === id),
                              )
                            : [
                                ...new Set([
                                  ...current,
                                  ...visible.map((p) => p.id),
                                ]),
                              ],
                        )
                      }
                    />{" "}
                    Select all visible
                  </label>
                  <span>{selected.length} selected</span>
                  {!!selected.length && (
                    <button
                      className="text-button"
                      onClick={() => setSelected([])}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="batch-selection-list">
                  {!loaded ? (
                    <div className="batch-empty">
                      <LoaderCircle className="ai-spinner" size={24} />
                      <p>Loading reference images…</p>
                    </div>
                  ) : !visible.length ? (
                    <div className="batch-empty">
                      <Search size={28} />
                      <h3>No matching products</h3>
                      <p>Try another name, SKU, or production batch.</p>
                    </div>
                  ) : (
                    visible.map((p) => (
                      <div
                        className={`batch-product-row ${selected.includes(p.id) ? "selected" : ""}`}
                        key={p.id}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${p.name}`}
                          checked={selected.includes(p.id)}
                          onChange={() => toggle(p.id)}
                        />
                        <ProductImage
                          product={p}
                          className="batch-product-image"
                        />
                        <div className="batch-product-name">
                          <strong>{p.name}</strong>
                          <small>
                            {p.sku} · {p.brand}
                          </small>
                        </div>
                        <span
                          className={`batch-reference-status ${referenceCount(p) ? "ready" : "missing"}`}
                        >
                          {referenceCount(p) ? (
                            <>
                              <Check size={14} /> {referenceCount(p)}{" "}
                              {referenceCount(p) === 1
                                ? "reference"
                                : "references"}
                            </>
                          ) : (
                            "No reference"
                          )}
                        </span>
                        <button
                          className="icon-button"
                          aria-label={`Add references for ${p.name}`}
                          title="Add reference images"
                          disabled={
                            !!uploading ||
                            (refs[p.id]?.length || 0) >= MAX_REFERENCE_IMAGES
                          }
                          onClick={() => {
                            uploadTarget.current = p.id;
                            fileInput.current?.click();
                          }}
                        >
                          {uploading === p.id ? (
                            <LoaderCircle size={18} className="ai-spinner" />
                          ) : (
                            <ImagePlus size={18} />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="batch-selection-foot">
                  JPG, PNG or WebP · Up to 6 uploaded views per product · 10 MB
                  per image
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  className="ai-file-input"
                  aria-label="Upload batch reference images"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    void upload(Array.from(e.target.files || []));
                    e.target.value = "";
                  }}
                />
              </>
            )}
          </section>
          <aside className="batch-summary panel">
            <div className="batch-summary-title">
              <Layers3 size={21} />
              <h3>Batch setup</h3>
            </div>
            <label className="field">
              <span>Batch name</span>
              <input
                value={name}
                maxLength={80}
                placeholder="e.g. Living room collection"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <dl>
              <dt>
                {source === "images" ? "Uploaded images" : "Selected products"}
              </dt>
              <dd>{modelCount}</dd>
              <dt>Ready to generate</dt>
              <dd>{modelCount - missing}</dd>
              <dt>Missing references</dt>
              <dd className={missing ? "batch-warning" : ""}>{missing}</dd>
              <dt>Output format</dt>
              <dd>GLB</dd>
            </dl>
            <div className="batch-demo-note">
              <Sparkles size={18} />
              <p>
                Demo mode produces a sample chair for each product. Your
                uploaded models and task statuses stay unchanged.
              </p>
            </div>
            {missing > 0 && (
              <p className="batch-warning" role="status">
                Add images to the {missing} selected{" "}
                {missing === 1 ? "product" : "products"} without references.
              </p>
            )}
            <button
              className="button primary"
              disabled={
                (source === "catalog" && !loaded) ||
                busy ||
                !!uploading ||
                !modelCount ||
                !!missing ||
                !name.trim()
              }
              onClick={() => void start()}
            >
              <Play size={16} />
              {busy
                ? "Starting…"
                : `Generate ${modelCount || ""} ${modelCount === 1 ? "model" : "models"}`}
            </button>
            <small>Preview results before using them in production.</small>
          </aside>
        </div>
      ) : active ? (
        <section className="panel batch-job-detail">
          <div className="section-title">
            <div>
              <button
                className="text-button batch-history-back"
                onClick={() => setActiveId(null)}
              >
                <ArrowLeft size={14} /> Render history
              </button>
              <h3>{active.name}</h3>
              <p>{new Date(active.createdAt).toLocaleString()} · Demo batch</p>
            </div>
            <div className="row">
              {jobStatus(active, now).status === "Generating" && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void cancel(active)}
                >
                  <Square size={14} />
                  Cancel pending
                </button>
              )}
              <button
                className="button secondary"
                onClick={() => exportResults(active)}
              >
                <Download size={15} />
                Export results
              </button>
            </div>
          </div>
          <div className="batch-job-progress">
            <span role="status">
              {jobStatus(active, now).status} · {jobStatus(active, now).ready}{" "}
              of {active.items.length} models ready
            </span>
            <div className="progress-track">
              <span
                style={{
                  width: `${(jobStatus(active, now).ready / active.items.length) * 100}%`,
                }}
              />
            </div>
            <small>
              Sample previews only. Every result uses the same demo chair.
            </small>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>References</th>
                  <th>Status</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {active.items.map((item, i) => {
                  const status = itemStatus(active, i, now);
                  return (
                    <tr key={item.productId}>
                      <td>
                        <button
                          className="batch-result-product"
                          disabled={
                            !products.some((p) => p.id === item.productId)
                          }
                          onClick={() => onOpenProduct(item.productId)}
                        >
                          <strong>{item.name}</strong>
                          <small>
                            {item.sku ? `SKU ${item.sku}` : "Uploaded image"}
                          </small>
                        </button>
                      </td>
                      <td>
                        {item.referenceCount}{" "}
                        {item.referenceCount === 1 ? "image" : "images"}
                      </td>
                      <td>
                        <span
                          className={`batch-run-status ${status.toLowerCase()}`}
                        >
                          {status === "Generating" ? (
                            <LoaderCircle size={13} className="ai-spinner" />
                          ) : status === "Ready" ? (
                            <Check size={13} />
                          ) : null}
                          {status}
                        </span>
                      </td>
                      <td>
                        {status === "Ready" ? (
                          <div className="row">
                            <button
                              className="button secondary"
                              onClick={() => setPreview(item.name)}
                            >
                              Preview demo
                            </button>
                            <a
                              className="icon-button"
                              href={DEMO_MODEL_URL}
                              download={`${item.sku || item.name.replace(/\.[^.]+$/, "")}-demo.glb`}
                              aria-label={`Download demo for ${item.name}`}
                            >
                              <Download size={17} />
                            </a>
                          </div>
                        ) : (
                          <span className="muted">
                            {status === "Cancelled"
                              ? "Not generated"
                              : "Preparing preview…"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel batch-history">
          <div className="section-title">
            <div>
              <h3>Render history</h3>
              <p>Track batch progress and review generated previews.</p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setView("create");
                setActiveId(null);
              }}
            >
              <Plus size={16} />
              New batch
            </button>
          </div>
          {!jobs.length ? (
            <div className="batch-empty">
              <Layers3 size={38} />
              <h3>No batches yet</h3>
              <p>
                Select products and generate your first batch of demo models.
              </p>
              <button
                className="button primary"
                onClick={() => setView("create")}
              >
                Create a batch <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Models</th>
                    <th>Progress</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const state = jobStatus(job, now);
                    return (
                      <tr key={job.id}>
                        <td>
                          <strong>{job.name}</strong>
                          <span className="batch-demo-caption">
                            Demo generation
                          </span>
                        </td>
                        <td>{job.items.length}</td>
                        <td>
                          <span
                            className={`batch-run-status ${state.status.toLowerCase()}`}
                          >
                            {state.status}
                          </span>
                          <span className="batch-demo-caption">
                            {state.ready}/{state.total} ready
                          </span>
                        </td>
                        <td>{new Date(job.createdAt).toLocaleString()}</td>
                        <td>
                          <button
                            className="button secondary"
                            onClick={() => setActiveId(job.id)}
                          >
                            View batch <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {preview && (
        <Suspense fallback={<div role="status">Loading model preview…</div>}>
          <ModelViewer
            url={DEMO_MODEL_URL}
            name={`${preview} · Demo sample`}
            onClose={() => setPreview(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
