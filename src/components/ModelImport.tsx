import { useRef, useState } from "react";
import { saveModelFile, validateModelFile } from "../lib/modelFiles";

export default function ModelImport({
  productId,
  onImported,
}: {
  productId: string;
  onImported: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function select(files: FileList | null) {
    if (busy || !files?.length) return;
    const selectedFile = files[0];
    const count = files.length;
    setBusy(true);
    setError("");
    try {
      if (count !== 1) throw Error("Upload one GLB model at a time.");
      await validateModelFile(selectedFile);
      try {
        await saveModelFile(productId, selectedFile);
      } catch {
        throw Error(
          "Could not save the model. Please try again or free some browser storage.",
        );
      }
      onImported(selectedFile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="completed-model-import">
      <section className="client-import-page" aria-label="Import 3D model">
        <div className="client-import-body">
          <div
            className={`client-csv-drop${dragging ? " dragging" : ""}`}
            role="group"
            aria-label="Model file upload"
            aria-busy={busy}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void select(e.dataTransfer.files);
            }}
          >
            <div className="client-upload-copy">
              <strong>
                {busy ? "Importing model…" : "Drop your 3D model here"}
              </strong>
              <small>GLB · Maximum 20 MB</small>
              <div className="client-file-actions">
                <button
                  className="button primary client-browse-label"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                >
                  {busy ? "Importing…" : "Browse files"}
                </button>
              </div>
            </div>
          </div>
          <input
            ref={input}
            hidden
            type="file"
            accept=".glb,model/gltf-binary"
            aria-label="Upload GLB model"
            onChange={(e) => {
              void select(e.target.files);
              e.target.value = "";
            }}
          />
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
