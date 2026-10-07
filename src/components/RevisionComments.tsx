import { useEffect, useId, useImperativeHandle, useState, type Ref } from "react";
import type { Product, Role } from "../lib/types";
import type { Action } from "../lib/workflow";
import { productStatusLabel } from "../lib/productStatus";

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
  }, [product.id, product.revisionComment]);
  useImperativeHandle(saveRef, () => ({ save }));
  const editable = role !== "3D Artist" || product.assigneeId === userId;
  async function save() {
    if (busy) return false;
    if (!editable || productStatusLabel(product.status) === "To do" || comment.trim() === (product.revisionComment || "")) return true;
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
  if (productStatusLabel(product.status) === "To do") return null;
  return (
    <section className="panel revision-comments" aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`}>Revision comments</h3>
      <textarea id={id} aria-label="Revision comment" rows={4} maxLength={2000} value={comment}
        placeholder="Add revision notes or feedback for this product…"
        readOnly={!editable} disabled={busy}
        onChange={(event) => { setComment(event.target.value); setSaved(false); setError(""); }} />
      <div className="todo-hold-reason-actions">
        {saved && <span role="status">Comment saved</span>}
        {editable && <button type="button" className="button primary small-button"
          disabled={busy || comment.trim() === (product.revisionComment || "")}
          onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button>}
      </div>
      {error && <p className="error-banner" role="alert">{error}</p>}
    </section>
  );
}
