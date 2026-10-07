import { useState } from "react";
import { Modal } from "./UI";
import ManualProductUpload from "./ManualProductUpload";
import type { ManualProductInput } from "../lib/manualGeneration";

export default function AddSingleProduct({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (products: ManualProductInput[]) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <Modal title="Add Single Product" onClose={() => { if (!busy) onClose(); }}>
    <div className="single-product-body">
      <ManualProductUpload single busy={busy} onUpload={async (products) => {
        setBusy(true); setError("");
        try { await onAdd(products); onClose(); return true; }
        catch (error) { setError((error as Error).message); return false; }
        finally { setBusy(false); }
      }} />
      {error && <p className="error-banner" role="alert">{error}</p>}
    </div>
  </Modal>;
}
