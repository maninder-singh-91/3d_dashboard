import { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { referenceError } from "../lib/generation";

export type BatchImage = { id: string; file: File };
function ImageThumbnail({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return <img src={url || undefined} alt={file.name} />;
}

export default function BatchImageUpload({
  images,
  onChange,
  disabled,
  onError,
}: {
  images: BatchImage[];
  onChange: (images: BatchImage[]) => void;
  disabled: boolean;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  function add(files: File[]) {
    if (disabled || !files.length) return;
    if (images.length + files.length > 20) {
      onError("Add up to 20 images per batch.");
      return;
    }
    const error = files.map(referenceError).find(Boolean);
    if (error) {
      onError(error);
      return;
    }
    onError("");
    onChange([
      ...images,
      ...files.map((file) => ({
        id: `batch-image-${crypto.randomUUID()}`,
        file,
      })),
    ]);
  }
  return (
    <div className="batch-image-upload">
      <div className="section-title">
        <div>
          <h3>Upload product images</h3>
          <p>Each image becomes a separate 3D model in this batch.</p>
        </div>
        <span className="count">{images.length}/20</span>
      </div>
      <button
        type="button"
        className={`batch-image-drop ${dragging ? "dragging" : ""}`}
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(Array.from(e.dataTransfer.files));
        }}
      >
        {images.length ? <Plus size={25} /> : <ImagePlus size={32} />}
        <strong>
          {images.length ? "Add more images" : "Drop product images here"}
        </strong>
        <span>or browse files</span>
        <small>JPG, PNG or WebP · Up to 20 images · 10 MB each</small>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="ai-file-input"
        aria-label="Upload images for batch generation"
        disabled={disabled}
        onChange={(e) => {
          add(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      {images.length > 0 && (
        <>
          <div className="batch-image-count">
            <span>
              {images.length} images · {images.length} models
            </span>
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          </div>
          <div className="batch-image-grid">
            {images.map((image) => (
              <div className="batch-image-card" key={image.id}>
                <ImageThumbnail file={image.file} />
                <button
                  className="icon-button"
                  disabled={disabled}
                  aria-label={`Remove ${image.file.name}`}
                  onClick={() =>
                    onChange(images.filter((item) => item.id !== image.id))
                  }
                >
                  <X size={16} />
                </button>
                <strong title={image.file.name}>{image.file.name}</strong>
                <small>
                  {(image.file.size / 1024 / 1024).toFixed(1)} MB · 1 model
                </small>
              </div>
            ))}
          </div>
        </>
      )}
      {!images.length && (
        <div className="batch-image-steps">
          <span>
            <b>1</b> Upload images
          </span>
          <span>
            <b>2</b> Generate models
          </span>
          <span>
            <b>3</b> Preview & download
          </span>
        </div>
      )}
    </div>
  );
}
