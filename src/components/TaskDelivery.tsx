import { lazy, Suspense, useState } from "react";
import { Check, ChevronDown, Eye, LoaderCircle, Send } from "lucide-react";
import type { Product } from "../lib/types";
import { checklistLabels } from "../lib/types";
import type { Action } from "../lib/workflow";
const ModelViewer = lazy(() => import("./ModelViewer"));

export default function TaskDelivery({
  product,
  editable,
  onUpdate,
}: {
  product: Product;
  editable: boolean;
  onUpdate: (action: Action) => Promise<void>;
}) {
  const [url, setUrl] = useState(product.modelUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  async function update(action: Action) {
    if (busy || !editable) return;
    setBusy(true);
    setError("");
    try {
      await onUpdate(action);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel gallery-task-delivery">
      <h3>Model delivery</h3>
      <label className="field">
        <span>GLB URL</span>
        <input
          aria-label="GLB URL"
          value={url}
          readOnly={!editable}
          disabled={busy}
          placeholder="https://…/model.glb"
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <div className="gallery-delivery-links">
        {editable && (
          <button
            className="button secondary"
            disabled={busy || url === product.modelUrl}
            onClick={() => void update({ type: "save", modelUrl: url })}
          >
            Save URL
          </button>
        )}
        {product.modelUrl && (
          <button className="text-button" onClick={() => setPreview(true)}>
            <Eye size={15} /> Preview model
          </button>
        )}
      </div>
      <details className="gallery-task-checklist">
        <summary>
          Production checklist{" "}
          <span>{product.checklist.filter(Boolean).length}/10</span>
          <ChevronDown size={16} />
        </summary>
        {checklistLabels.map((label, i) => (
          <label key={label}>
            <input
              type="checkbox"
              checked={product.checklist[i]}
              disabled={!editable || busy}
              onChange={() =>
                void update({
                  type: "save",
                  checklist: product.checklist.map((value, j) =>
                    i === j ? !value : value,
                  ),
                })
              }
            />
            {label}
          </label>
        ))}
        {editable && (
          <button
            className="text-button"
            disabled={busy || product.checklist.every(Boolean)}
            onClick={() =>
              void update({ type: "save", checklist: Array(10).fill(true) })
            }
          >
            <Check size={14} /> Mark all complete
          </button>
        )}
      </details>
      {product.reviewComment && (
        <div className="gallery-review-note">
          <strong>Review feedback</strong>
          <p>{product.reviewComment}</p>
        </div>
      )}
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {editable && (
        <>
          <button
            className="button primary full-width"
            disabled={busy}
            onClick={() => {
              if (url !== product.modelUrl) {
                setError("Save the model URL before submitting.");
                return;
              }
              void update({ type: "submit" });
            }}
          >
            {busy ? (
              <LoaderCircle className="ai-spinner" size={16} />
            ) : (
              <Send size={16} />
            )}{" "}
            Submit for review
          </button>
          <button
            className="text-button gallery-hold-action"
            disabled={busy}
            onClick={() => void update({ type: "status", status: "On Hold" })}
          >
            Place on hold
          </button>
        </>
      )}
      {preview && (
        <Suspense fallback={<p role="status">Loading preview…</p>}>
          <ModelViewer
            url={product.modelUrl}
            name={product.name}
            onClose={() => setPreview(false)}
          />
        </Suspense>
      )}
    </section>
  );
}
