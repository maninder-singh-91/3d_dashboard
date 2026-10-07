import { useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Upload } from "lucide-react";
import type { Batch, Product } from "../lib/types";
import { prepareDemoCatalog } from "../lib/catalogFile";
import type { CatalogFileProgress } from "../lib/catalogFile";
import { Modal } from "./UI";

export default function ImportProducts({
  onClose,
  onImport,
  batches,
  standalone = false,
}: {
  onClose: () => void;
  onImport: (p: Product[]) => Promise<void>;
  batches: Batch[];
  standalone?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const browseButton = useRef<HTMLButtonElement>(null);
  const [filename, setFilename] = useState("");
  const [dragging, setDragging] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<
    CatalogFileProgress | { phase: "ready"; percent: 100 } | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [batchId, setBatchId] = useState(() =>
    String(
      Math.max(
        0,
        ...batches.map((b) => (/^\d+$/.test(b.id) ? Number(b.id) : 0)),
      ) + 1,
    ).padStart(3, "0"),
  );
  const normalizedBatch = batchId.trim().replace(/^#/, "");
  const validBatch = /^[a-zA-Z0-9_-]{1,32}$/.test(normalizedBatch);
  function removeFile() {
    if (busy) return;
    setFilename("");
    setProducts([]);
    setErrors([]);
    setUploadProgress(null);
    setDragging(false);
    if (fileInput.current) fileInput.current.value = "";
    requestAnimationFrame(() => browseButton.current?.focus());
  }
  async function readFile(file: File) {
    if (busy) return;
    setErrors([]);
    setProducts([]);
    setFilename(file.name);
    setUploadProgress({ phase: "reading", percent: 0 });
    setBusy(true);
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => setTimeout(resolve, 0)),
      );
      const samples = await prepareDemoCatalog(file, setUploadProgress);
      setFilename(file.name);
      setProducts(samples);
      setUploadProgress({ phase: "ready", percent: 100 });
    } catch (e) {
      setUploadProgress(null);
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (busy || !products.length || errors.length) return;
    setSaving(true);
    setBusy(true);
    setErrors([]);
    try {
      if (!validBatch)
        throw Error(
          "Enter a batch number using letters, numbers, hyphens or underscores.",
        );
      await onImport(products.map((p) => ({ ...p, batchId: normalizedBatch })));
      onClose();
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
      setSaving(false);
    }
  }
  const title = "Import Catalog";
  const content = (
    <>
      <div className="client-import-body">
        <div className="client-import-settings">
          <label className="client-batch-summary">
            <span>Batch number</span>
            <input
              type="text"
              aria-label="Batch number"
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              disabled={busy}
              maxLength={32}
              placeholder="025"
            />
          </label>
        </div>
        <div className="client-csv-upload">
          <div
            role="group"
            aria-label="Catalog file upload"
            aria-busy={busy}
            className={`client-csv-drop${dragging ? " dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (busy) return;
              if (e.dataTransfer.files.length !== 1) {
                setErrors(["Upload one CSV or Excel file at a time."]);
                return;
              }
              void readFile(e.dataTransfer.files[0]);
            }}
          >
            <span className="client-upload-copy">
              {!busy && (
                <small>
                  {filename && !errors.length
                    ? "Demo file ready · Sample products will be shown"
                    : "CSV, XLSX, XLS · Maximum 5 MB"}
                </small>
              )}
              <strong>
                {filename ||
                  (standalone
                    ? "Drop your catalog here"
                    : "Drop your CSV or Excel file here")}
              </strong>
              <span className="client-file-actions">
                {!filename && (
                  <button
                    ref={browseButton}
                    type="button"
                    className="button primary client-browse-label"
                    disabled={busy}
                    onClick={() => fileInput.current?.click()}
                  >
                    Browse files
                  </button>
                )}
                {filename && (
                  <button
                    type="button"
                    className="button secondary client-remove-file"
                    disabled={busy}
                    onClick={removeFile}
                  >
                    Remove file
                  </button>
                )}
              </span>
            </span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            hidden
            aria-label="Upload CSV or Excel file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
              e.target.value = "";
            }}
          />
          {uploadProgress && (
            <div className="client-upload-progress">
              <div
                className="client-upload-progress-label"
                role="status"
                aria-live="polite"
              >
                <span>
                  {uploadProgress.phase === "ready"
                    ? "Ready to import"
                    : uploadProgress.phase === "processing"
                      ? "Preparing demo…"
                      : "Reading file…"}
                </span>
                {uploadProgress.phase !== "processing" && (
                  <span>{uploadProgress.percent}%</span>
                )}
              </div>
              <div
                className={`client-upload-progress-track${uploadProgress.phase === "processing" ? " processing" : ""}`}
                role="progressbar"
                aria-label="Catalog upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={
                  uploadProgress.phase === "processing"
                    ? undefined
                    : uploadProgress.percent
                }
                aria-valuetext={
                  uploadProgress.phase === "processing"
                    ? "Preparing demo"
                    : undefined
                }
              >
                <span
                  style={
                    uploadProgress.phase === "processing"
                      ? undefined
                      : { width: `${uploadProgress.percent}%` }
                  }
                />
              </div>
            </div>
          )}
        </div>
        {errors.length > 0 && (
          <div className="error-banner client-import-errors" role="alert">
            {errors.map((error, i) => (
              <p key={i}>{error}</p>
            ))}
          </div>
        )}
      </div>
      <div className="modal-footer client-import-footer">
        {!standalone && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
        )}
        <button
          className="button primary"
          disabled={
            busy || !validBatch || !products.length || errors.length > 0
          }
          onClick={() => void submit()}
        >
          {busy ? (
            <>
              <LoaderCircle size={16} className="ai-spinner" />
              {saving ? "Importing…" : "Preparing…"}
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </>
  );
  return standalone ? (
    <section className="client-import-page" aria-label={title}>
      <header>
        <div className="client-import-title">
          <span className="client-title-icon" aria-hidden="true">
            <Upload size={20} />
          </span>
          <h1>{title}</h1>
        </div>
      </header>
      {content}
    </section>
  ) : (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
      className="client-import-modal"
    >
      {content}
    </Modal>
  );
}
