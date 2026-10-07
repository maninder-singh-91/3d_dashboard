import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Sparkles, X, Check } from "lucide-react";
import { MAX_REFERENCE_IMAGES, referenceError } from "../lib/generation";
import { loadReferences, saveReferences } from "../lib/referenceImages";
import { BrandButton } from "./Brand";

function ReferenceThumbnail({
  file,
  index,
  disabled,
  onRemove,
}: {
  file: File;
  index: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return (
    <div className="ai-reference" title={file.name}>
      <img src={url} alt={`Reference ${index + 1}: ${file.name}`} />
      <span>{index === 0 ? "Main image" : `View ${index + 1}`}</span>
      <button
        type="button"
        aria-label={`Remove ${file.name}`}
        disabled={disabled}
        onClick={onRemove}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function AIGeneration({
  productId,
  onDemoPreview,
}: {
  productId: string;
  onDemoPreview: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    let active = true;
    loadReferences(productId)
      .then((items) => {
        if (active) setFiles(items);
      })
      .catch(() => {
        if (active)
          setError(
            "Saved references could not be opened. Please try reopening this task.",
          );
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [productId]);
  const locked = busy || saving || !loaded;
  async function store(next: File[]) {
    setSaving(true);
    setError("");
    try {
      await saveReferences(productId, next);
      setFiles(next);
      setCompleted(false);
    } catch {
      setError(
        "These images could not be saved. Try smaller files or free some browser storage.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function add(incoming: File[]) {
    if (locked || !incoming.length) return;
    if (incoming.length + files.length > MAX_REFERENCE_IMAGES) {
      setError("Add up to 6 reference images per product.");
      return;
    }
    const errors = incoming.map(referenceError).filter(Boolean);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    const unique = incoming.filter(
      (f) =>
        !files.some(
          (existing) =>
            existing.name === f.name &&
            existing.size === f.size &&
            existing.lastModified === f.lastModified,
        ),
    );
    await store([...files, ...unique]);
  }
  function generate() {
    if (locked || !files.length) return;
    setBusy(true);
    setError("");
    setCompleted(false);
    setStatus("Preparing demo preview…");
    timer.current = setTimeout(() => {
      onDemoPreview();
      setBusy(false);
      setCompleted(true);
      setStatus("Demo model is ready in the viewport.");
    }, 1800);
  }
  return (
    <section
      className="panel ai-generation"
      aria-labelledby="ai-generation-heading"
    >
      <div className="ai-heading">
        <span className="ai-heading-icon">
          <Sparkles size={19} />
        </span>
        <h3 id="ai-generation-heading">3D AI Generation</h3>
        <span className="ai-demo-badge">Demo</span>
      </div>
      <p className="ai-intro">Upload front, side and back views.</p>
      <div className="ai-reference-label">
        <strong>Reference images</strong>
        <span>{files.length}/6</span>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload reference images"
        className="ai-file-input"
        disabled={locked}
        onChange={(e) => {
          void add(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      {files.length > 0 && (
        <div className="ai-reference-grid">
          {files.map((file, index) => (
            <ReferenceThumbnail
              key={`${file.name}-${file.size}-${file.lastModified}`}
              file={file}
              index={index}
              disabled={locked}
              onRemove={() => void store(files.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      )}
      {files.length < MAX_REFERENCE_IMAGES && (
        <button
          type="button"
          className={`ai-dropzone ${files.length ? "has-images" : ""} ${dragging ? "dragging" : ""}`}
          disabled={locked}
          onClick={() => input.current?.click()}
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
          <ImagePlus size={26} />
          <strong>
            {saving
              ? "Saving images…"
              : files.length
                ? "Add more images"
                : "Upload product images"}
          </strong>
          <span>Choose files or drag them here</span>
          <small>JPG, PNG or WebP · Up to 10 MB each</small>
        </button>
      )}

      <p className="ai-service-note">
        Sample preview only · Saved model unchanged.
      </p>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <BrandButton
        variant="primary"
        disabled={locked || !files.length}
        onClick={() => void generate()}
        leadingIcon={
          busy ? (
            <LoaderCircle className="ai-spinner" size={18} />
          ) : (
            <Sparkles size={18} />
          )
        }
      >
        {busy
          ? "Preparing preview…"
          : completed
            ? "Generate again"
            : "Generate 3D model"}
      </BrandButton>
      {busy && (
        <div className="ai-job-status" role="status">
          <span>{status}</span>
        </div>
      )}
      {completed && (
        <p className="ai-success" role="status">
          <Check size={16} />
          {status}
        </p>
      )}
    </section>
  );
}
