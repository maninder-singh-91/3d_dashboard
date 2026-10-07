import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImagePlus,
  Images,
  Trash2,
  Link2,
  Check,
  Download,
  LoaderCircle,
  X,
} from "lucide-react";
import type { Batch, Product, Role } from "../lib/types";
import type { Action } from "../lib/workflow";
import { validUrl } from "../lib/workflow";
import { loadReferences, saveReferences } from "../lib/referenceImages";
import { MAX_REFERENCE_IMAGES, referenceError } from "../lib/generation";
import { createImageArchive } from "../lib/downloadImages";
import { productGallery } from "../lib/productGallery";
import { productStatusLabel, productStatusOptions } from "../lib/productStatus";
import TaskStatusButtons from "./TaskStatusButtons";
import TaskAssignee from "./TaskAssignee";
import ProductSpecifications from "./ProductSpecifications";
import RevisionComments from "./RevisionComments";

const taskStatuses = productStatusOptions;
const holdReasonTags = [
  {
    label: "Missing images",
    description: "Additional product images are needed to continue.",
  },
  {
    label: "Image quality",
    description: "Clearer, higher-resolution reference images are required.",
  },
  {
    label: "Missing dimensions",
    description: "Product dimensions are needed to model the correct scale.",
  },
  {
    label: "Material details",
    description: "Material, colour, or finish details need clarification.",
  },
  {
    label: "Product mismatch",
    description: "The reference images do not match the product details.",
  },
  {
    label: "Awaiting feedback",
    description: "Waiting for feedback on the current model.",
  },
  {
    label: "Awaiting approval",
    description: "Waiting for approval before continuing the task.",
  },
  {
    label: "Technical issue",
    description: "A technical issue is blocking modelling or file processing.",
  },
];

export default function TodoTaskDetail({
  product: p,
  role,
  userId,
  onBack,
  onUpdate,
  onCopy,
}: {
  product: Product;
  role: Role;
  userId: string;
  batches: Batch[];
  onBack: () => void;
  onUpdate: (action: Action) => Promise<void>;
  onCopy: (value: string, kind?: "url" | "uid") => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [holdReason, setHoldReason] = useState(p.holdReason || "");
  const [reasonSaved, setReasonSaved] = useState(false);
  const detailsSave = useRef<{ save: () => Promise<boolean> }>(null);
  const commentsSave = useRef<{ save: () => Promise<boolean> }>(null);
  const [headerSaved, setHeaderSaved] = useState(false);
  useEffect(() => {
    setHoldReason(p.holdReason || "");
  }, [p.id, p.holdReason]);
  const onHold = productStatusLabel(p.status) === "Hold";
  const todo = productStatusLabel(p.status) === "To do";
  const editable =
    role === "Admin / Manager" ||
    (role === "3D Artist" && (todo || p.assigneeId === userId));
  const locked = !editable || !loaded || busy;
  const catalogImages = productGallery(p).filter(
    (image) => !p.hiddenReferenceUrls?.includes(image.url),
  );
  const images = [
    ...catalogImages.map((image) => ({ ...image, fileIndex: -1 })),
    ...localImages.map((url, i) => ({
      url,
      name: files[i]?.name || `Reference ${i + 1}`,
      fileIndex: i,
    })),
  ];
  const selectedIndex = Math.min(active, Math.max(0, images.length - 1));
  const selected = images[selectedIndex];
  useEffect(() => {
    const strip = thumbnails.current;
    const thumbnail = strip?.children[selectedIndex] as HTMLElement | undefined;
    if (!strip || !thumbnail) return;
    const left =
      thumbnail.getBoundingClientRect().left -
      strip.getBoundingClientRect().left +
      strip.scrollLeft;
    if (left < strip.scrollLeft)
      strip.scrollTo({ left: Math.max(0, left - 12), behavior: "smooth" });
    else if (
      left + thumbnail.offsetWidth >
      strip.scrollLeft + strip.clientWidth
    )
      strip.scrollTo({
        left: left + thumbnail.offsetWidth - strip.clientWidth + 12,
        behavior: "smooth",
      });
  }, [selectedIndex, images.length]);

  useEffect(() => {
    let mounted = true;
    loadReferences(p.id)
      .then((saved) => {
        if (mounted) {
          setFiles(saved);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (mounted)
          setError(
            "Could not load saved images. Reopen this task to try again.",
          );
      });
    return () => {
      mounted = false;
    };
  }, [p.id]);
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setLocalImages(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  async function store(next: File[]) {
    if (locked) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await saveReferences(p.id, next);
      setFiles(next);
      setSaved(true);
      return true;
    } catch {
      setError(
        "Images could not be saved. Try again or free some browser storage.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function removeImage(index: number) {
    if (locked) return;
    const image = images[index];
    if (!image) return;
    if (image.fileIndex >= 0) {
      if (!(await store(files.filter((_, i) => i !== image.fileIndex)))) return;
    } else {
      setBusy(true);
      setError("");
      setSaved(false);
      try {
        await onUpdate({ type: "remove-reference", url: image.url });
        setSaved(true);
      } catch (error) {
        setError((error as Error).message);
        return;
      } finally {
        setBusy(false);
      }
    }
    setActive(
      Math.max(
        0,
        index < selectedIndex
          ? selectedIndex - 1
          : Math.min(selectedIndex, images.length - 2),
      ),
    );
  }
  async function downloadImages() {
    if (downloading || !loaded || busy || !images.length) return;
    setDownloading(true);
    setError("");
    try {
      const archive = await createImageArchive(
        catalogImages.map((image) => image.url),
        files,
        p.sku,
      );
      const url = URL.createObjectURL(archive.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = archive.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Images could not be downloaded. Please try again.",
      );
    } finally {
      setDownloading(false);
    }
  }
  async function add(incoming: File[]) {
    if (locked || !incoming.length) return;
    const unique = incoming.filter(
      (file, i, all) =>
        ![...files, ...all.slice(0, i)].some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified,
        ),
    );
    if (files.length + unique.length > MAX_REFERENCE_IMAGES) {
      setError(`Add up to ${MAX_REFERENCE_IMAGES} reference images.`);
      return;
    }
    const invalid = unique.map(referenceError).filter(Boolean);
    if (invalid.length) {
      setError(invalid.join(" "));
      return;
    }
    await store([...files, ...unique]);
  }
  function move(delta: number) {
    setActive((selectedIndex + delta + images.length) % images.length);
  }
  async function changeStatus(value: string) {
    const option = taskStatuses.find((status) => status.value === value);
    if (!option || busy) return;
    setBusy(true);
    setError("");
    try {
      await onUpdate({ type: "catalog-status", status: option.value });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveHoldReason() {
    if (busy || !editable) return;
    setBusy(true);
    setError("");
    setReasonSaved(false);
    try {
      await onUpdate({ type: "hold-reason", reason: holdReason });
      setHoldReason(holdReason.trim());
      setReasonSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveTask() {
    if (busy || !loaded) return;
    setBusy(true);
    setHeaderSaved(false);
    setError("");
    try {
      if (await detailsSave.current?.save() === false) return;
      if (await commentsSave.current?.save() === false) return;
      if (onHold && editable && holdReason.trim() !== (p.holdReason || "")) {
        await onUpdate({ type: "hold-reason", reason: holdReason });
        setHoldReason(holdReason.trim());
        setReasonSaved(true);
      }
      setHeaderSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const picture = selected ? (
    <img
      key={selected.url}
      src={selected.url}
      alt={`${p.name} — ${selected.name}`}
      onLoad={(e) =>
        e.currentTarget.parentElement?.classList.remove("image-unavailable")
      }
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
        e.currentTarget.parentElement?.classList.add("image-unavailable");
      }}
    />
  ) : (
    <div className="todo-no-image">
      <Images size={38} />
      {todo ? (
        <>
          {editable ? (
            <button
              type="button"
              className="button primary"
              disabled={locked}
              onClick={() => input.current?.click()}
            >
              <ImagePlus size={16} /> Upload images
            </button>
          ) : (
            <span>Upload images</span>
          )}
          <small>Add product images to get started.</small>
        </>
      ) : (
        <span>No product images yet</span>
      )}
    </div>
  );

  return (
    <div
      className="todo-workspace todo-gallery-workspace"
      onChangeCapture={() => setHeaderSaved(false)}
    >
      <header className="todo-heading">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 title={p.name}>{p.name}</h1>
        <span className="todo-category">{p.category}</span>
        <div className="todo-header-actions">
          <button type="button" className="button primary" disabled={busy || !loaded}
            onClick={() => void saveTask()}>
            {busy ? "Saving…" : headerSaved ? <><Check size={16} /> Saved</> : "Save"}
          </button>
        </div>
      </header>
      <div className="todo-layout">
        <section
          className="todo-gallery panel"
          aria-label="Product image gallery"
        >
          <div className="todo-url-toolbar">
            {validUrl(p.productUrl) ? (
              <>
                <a
                  href={p.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={p.productUrl}
                >
                  <Link2 size={19} />
                  <span>{p.productUrl}</span>
                </a>
                <button
                  className="icon-button"
                  aria-label="Copy product URL"
                  onClick={() => onCopy(p.productUrl)}
                >
                  <Copy size={18} />
                </button>
              </>
            ) : (
              <span className="muted">No product URL added</span>
            )}
            <button
              type="button"
              className="icon-button"
              aria-label={downloading ? "Preparing image download" : "Download product images"}
              title="Download product images"
              disabled={downloading || !loaded || busy || !images.length}
              onClick={() => void downloadImages()}
            >
              {downloading ? <LoaderCircle size={19} className="ai-spinner" /> : <Download size={19} />}
            </button>
          </div>
          <div
            className={`todo-image-stage${dragging ? " dragging" : ""}`}
            tabIndex={0}
            role="region"
            aria-label="Image preview"
            onKeyDown={(e) => {
              if (
                images.length > 1 &&
                ["ArrowLeft", "ArrowRight"].includes(e.key)
              ) {
                e.preventDefault();
                move(e.key === "ArrowLeft" ? -1 : 1);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!locked) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void add(Array.from(e.dataTransfer.files));
            }}
          >
            {picture}
            {images.length > 1 && (
              <>
                <button
                  className="todo-gallery-arrow previous"
                  aria-label="Previous image"
                  onClick={() => move(-1)}
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  className="todo-gallery-arrow next"
                  aria-label="Next image"
                  onClick={() => move(1)}
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
            {selected && (
              <span className="todo-image-position">
                {selectedIndex + 1} / {images.length}
              </span>
            )}
          </div>
          <div className="todo-gallery-download-row">
            <div
              className="todo-thumbnails"
              ref={thumbnails}
              tabIndex={0}
              role="region"
              aria-label="Image thumbnails"
              onKeyDown={(e) => {
                if (
                  images.length > 1 &&
                  ["ArrowLeft", "ArrowRight"].includes(e.key)
                ) {
                  e.preventDefault();
                  move(e.key === "ArrowLeft" ? -1 : 1);
                }
              }}
            >
              {images.map((img, i) => (
                <div className="todo-thumbnail" key={img.url}>
                  <button
                    type="button"
                    className={i === selectedIndex ? "selected" : ""}
                    aria-label={`View image ${i + 1}`}
                    aria-pressed={i === selectedIndex}
                    onClick={() => setActive(i)}
                  >
                    <img src={img.url} alt={img.name} />
                  </button>
                  {editable && (
                    <button
                      type="button"
                      className="todo-thumbnail-remove"
                      aria-label={`Remove image ${i + 1}`}
                      title="Remove image"
                      disabled={locked}
                      onClick={() => void removeImage(i)}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              {editable && files.length < MAX_REFERENCE_IMAGES && (
                <button
                  className="todo-add-thumbnail"
                  disabled={locked}
                  aria-label="Upload reference images"
                  onClick={() => input.current?.click()}
                >
                  <ImagePlus size={22} />
                  <span>Add images</span>
                </button>
              )}
            </div>
          </div>
          {selected?.fileIndex >= 0 && editable && (
            <div className="todo-gallery-bottom">
              <button
                className="text-button"
                disabled={locked}
                onClick={() => void removeImage(selectedIndex)}
              >
                <Trash2 size={14} /> Remove image
              </button>
            </div>
          )}
          <input
            ref={input}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              void add(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
        </section>
        <aside className="todo-settings-column">
          <section className="todo-info panel" aria-label="Task status">
            <dl>
              <TaskAssignee assigneeId={p.assigneeId} />
              <div>
                <dt>Status</dt>
                <dd className="todo-status-select">
                  <TaskStatusButtons product={p} role={role} userId={userId} busy={busy}
                    onChange={(value) => void changeStatus(value)} />
                </dd>
              </div>
            </dl>
            {onHold && (
              <div className="todo-hold-reason">
                <label htmlFor="hold-reason">Reason for hold</label>
                <p className="todo-hold-tag-hint">
                  Choose a reason to add a description, or write your own.
                </p>
                <div
                  className="todo-hold-tags"
                  role="group"
                  aria-label="Suggested hold reasons"
                >
                  {holdReasonTags.map(({ label, description }) => {
                    const added = holdReason.includes(description);
                    const next = holdReason
                      ? `${holdReason}${holdReason.endsWith("\n") ? "" : "\n"}${description}`
                      : description;
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={added}
                        title={description}
                        disabled={
                          !editable || busy || (!added && next.length > 2000)
                        }
                        onClick={() => {
                          if (added) return;
                          setHoldReason(next);
                          setReasonSaved(false);
                        }}
                      >
                        {added && <Check size={12} />}
                        {label}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  id="hold-reason"
                  rows={4}
                  maxLength={2000}
                  value={holdReason}
                  placeholder="Explain why this task is on hold…"
                  readOnly={!editable}
                  disabled={busy}
                  onChange={(event) => {
                    setHoldReason(event.target.value);
                    setReasonSaved(false);
                  }}
                />
                <div className="todo-hold-reason-actions">
                  {reasonSaved && <span role="status">Reason saved</span>}
                  {editable && (
                    <button
                      type="button"
                      className="button primary small-button"
                      disabled={
                        busy || holdReason.trim() === (p.holdReason || "")
                      }
                      onClick={() => void saveHoldReason()}
                    >
                      {busy ? "Saving…" : "Save"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
          <ProductSpecifications
            saveRef={detailsSave}
            initiallyOpen
            product={p}
            editable={role === "Admin / Manager" || (role === "3D Artist" && p.assigneeId === userId && ["Claimed", "In Progress", "Corrections Required"].includes(p.status))}
            onUpdate={onUpdate}
            onCopy={(value) => onCopy(value, "uid")}
          />
          <RevisionComments saveRef={commentsSave} product={p} role={role} userId={userId} onUpdate={onUpdate} />
          {saved && (
            <p className="todo-saved" role="status">
              <Check size={14} /> Images saved
            </p>
          )}
        </aside>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
