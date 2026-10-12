import { useEffect, useId, useImperativeHandle, useState, type Ref } from "react";
import { Check } from "lucide-react";
import type { Product, Role } from "../lib/types";
import type { Action } from "../lib/workflow";
import { productStatusLabel } from "../lib/productStatus";
import { reviewCycleCount } from "../lib/revisions";

export default function RevisionComments({ product, role, userId, onUpdate, saveRef }: {
  saveRef?: Ref<{ save: () => Promise<boolean> }>;
  product: Product;
  role: Role;
  userId: string;
  onUpdate: (action: Action) => Promise<void>;
}) {
  const id = useId();
  const [comment, setComment] = useState(product.revisionComment || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setComment(product.revisionComment || "");
    setSaved(false);
    setError("");
  }, [product.id, product.revisionComment, product.reviewCycleCount]);
  useImperativeHandle(saveRef, () => ({ save }));
  const cycle = reviewCycleCount(product);
  const status = productStatusLabel(product.status);
  const editable = cycle < 3 && status === "Review" && !product.revisionCommentsClosed &&
    !product.revisionAcknowledgedCycles?.includes(cycle) && !product.revisionComment?.trim() &&
    (role !== "3D Artist" || product.assigneeId === userId);
  const acknowledged = product.revisionAcknowledgedCycles?.includes(cycle);
  const canAcknowledge = !product.revisionCommentsClosed && status === "In Progress" && (role === "Admin / Manager" || (role === "3D Artist" && product.assigneeId === userId));
  async function acknowledge() {
    setBusy(true);
    setError("");
    try {
      await onUpdate({ type: "acknowledge-revision" });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (busy) return false;
    if (!editable || reviewCycleCount(product) > 3 || productStatusLabel(product.status) === "To do" || comment.trim() === (product.revisionComment || "")) return true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await onUpdate({ type: "revision-comment", comment });
      setComment(comment.trim());
      setSaved(true);
      return true;
    } catch (error) {
      setError((error as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (status === "To do" || status === "Done" || status === "Hold" || cycle === 0) return null;
  return (
    <section className="revision-comments" aria-labelledby={`${id}-heading`}>
      <div className="revision-row-heading">
      <h3 id={`${id}-heading`}>Revision comments</h3>
      </div>
      <div className="revision-panels">
      {(product.revisionHistory || []).filter((entry) => entry.cycle <= 3).map((entry) => (
        <label className="panel revision-card revision-history" key={entry.cycle}>
          Client Revision {entry.cycle}/3
          <textarea readOnly disabled rows={3} aria-label={`Previous review ${entry.cycle} comment`}
            value={entry.comment} placeholder="No comment added" />
          {product.revisionAcknowledgedCycles?.includes(entry.cycle) && <span className="revision-acknowledged"><Check size={16} aria-hidden="true" />Acknowledged</span>}
        </label>
      ))}
      {reviewCycleCount(product) <= 3 && <div className="panel revision-card">
      <label htmlFor={id}>Client Revision {Math.max(1, reviewCycleCount(product))}/3</label>
      <textarea id={id} aria-label="Revision comment" rows={4} maxLength={2000} value={comment}
        placeholder={editable ? "Add revision notes or feedback for this product…" : "No comment added"}
        readOnly={!editable} disabled={busy || !editable}
        onChange={(event) => { setComment(event.target.value); setSaved(false); setError(""); }} />
      <div className="todo-hold-reason-actions">
        {saved && <span role="status">Comment saved</span>}
        {editable && <button type="button" className="button primary small-button"
          disabled={busy || comment.trim() === (product.revisionComment || "")}
          onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button>}
        {acknowledged ? <span className="revision-acknowledged" role="status"><Check size={16} aria-hidden="true" />Acknowledged</span> : canAcknowledge &&
          <button type="button" className="button secondary small-button" disabled={busy} onClick={() => void acknowledge()}>
            {busy ? "Acknowledging…" : "Acknowledge"}
          </button>}
      </div>
      </div>}
      {[2, 3].filter((cycle) => cycle > Math.max(1, reviewCycleCount(product))).map((cycle) => (
        <div className="panel revision-card revision-upcoming" key={`upcoming-${cycle}`} aria-label={`Revision ${cycle}, upcoming`}>
          <label htmlFor={`${id}-upcoming-${cycle}`}>Client Revision {cycle}/3</label>
          <textarea id={`${id}-upcoming-${cycle}`} rows={4} disabled value=""
            placeholder="Available in the next review cycle" />
        </div>
      ))}
      </div>
      {error && <p className="error-banner" role="alert">{error}</p>}
    </section>
  );
}
