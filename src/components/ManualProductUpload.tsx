import { useRef, useState } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import type {
  ManualProductInput,
  ManualDimensions,
} from "../lib/manualGeneration";

const emptyDimensions: ManualDimensions = {
  length: "",
  width: "",
  height: "",
  unit: "cm",
};
type Draft = {
  id: string;
  file?: File;
  sku: string;
  productUid: string;
  dimensions: ManualDimensions;
};
const emptyDraft = (): Draft => ({
  id: crypto.randomUUID(),
  sku: "",
  productUid: "",
  dimensions: { ...emptyDimensions },
});
export default function ManualProductUpload({
  busy,
  onUpload,
  single = false,
}: {
  busy: boolean;
  single?: boolean;
  onUpload: (products: ManualProductInput[]) => Promise<boolean>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);
  const hasFiles = drafts.some((draft) => draft.file);
  return (
    <form
      className="generation-manual-upload"
      onSubmit={async (event) => {
        event.preventDefault();
        const products = drafts.flatMap((draft) =>
          draft.file
            ? [
                {
                  file: draft.file,
                  sku: draft.sku,
                  productUid: draft.productUid,
                  dimensions: draft.dimensions,
                },
              ]
            : [],
        );
        if (products.length && (await onUpload(products)))
          setDrafts([emptyDraft()]);
      }}
    >
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <ImagePlus size={17} />
        {single ? (hasFiles ? "Change product image" : "Upload product image") : (hasFiles ? "Change product images" : "Upload product images")}
      </button>
      <small className="muted">One image per product · JPG, PNG or WebP</small>
      <input
        ref={input}
        type="file"
        hidden
        multiple={!single}
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload product images"
        onChange={(event) => {
          const selectedFiles = Array.from(event.target.files || []);
          const files = single ? selectedFiles.slice(0, 1) : selectedFiles;
          if (files.length)
            setDrafts(
              files.map((file, index) => ({
                id: crypto.randomUUID(),
                file,
                sku: !hasFiles && index === 0 ? drafts[0].sku : "",
                productUid:
                  !hasFiles && index === 0 ? drafts[0].productUid : "",
                dimensions:
                  !hasFiles && index === 0
                    ? { ...drafts[0].dimensions }
                    : { ...emptyDimensions },
              })),
            );
          event.target.value = "";
        }}
      />
      <div className="generation-dimension-drafts">
        {drafts.map((draft) => (
          <fieldset key={draft.id} disabled={busy}>
            <legend>{draft.file?.name || "Product details"}</legend>
            {draft.file && (
              <button
                type="button"
                className="generation-dimension-remove"
                aria-label={`Remove ${draft.file.name} from upload`}
                onClick={() =>
                  setDrafts((current) =>
                    current.length === 1
                      ? [emptyDraft()]
                      : current.filter((item) => item.id !== draft.id),
                  )
                }
              >
                <X size={14} />
              </button>
            )}
            <div className="generation-identity-fields generation-dimension-fields">
              {(["sku", "productUid"] as const).map((key) => (
                <label key={key}>
                  {key === "sku" ? "SKU" : "Product UID"}
                  <input
                    type="text"
                    maxLength={128}
                    placeholder={
                      key === "sku" ? "Enter SKU" : "Enter Product UID"
                    }
                    value={draft[key]}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDrafts((current) =>
                        current.map((item) =>
                          item.id === draft.id
                            ? { ...item, [key]: value }
                            : item,
                        ),
                      );
                    }}
                  />
                </label>
              ))}
            </div>
            <small className="muted generation-identity-hint">
              Leave blank to generate IDs automatically.
            </small>
            <div className="generation-dimension-fields">
              {(["length", "width", "height"] as const).map((key) => (
                <label key={key}>
                  {key[0].toUpperCase() + key.slice(1)}
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="e.g. 80"
                    value={draft.dimensions[key]}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDrafts((current) =>
                        current.map((item) =>
                          item.id === draft.id
                            ? {
                                ...item,
                                dimensions: {
                                  ...item.dimensions,
                                  [key]: value,
                                },
                              }
                            : item,
                        ),
                      );
                    }}
                  />
                </label>
              ))}
              <label>
                Unit
                <select
                  value={draft.dimensions.unit}
                  onChange={(event) => {
                    const unit = event.target.value as ManualDimensions["unit"];
                    setDrafts((current) =>
                      current.map((item) =>
                        item.id === draft.id
                          ? {
                              ...item,
                              dimensions: { ...item.dimensions, unit },
                            }
                          : item,
                      ),
                    );
                  }}
                >
                  {["cm", "mm", "m", "in", "ft"].map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
        ))}
      </div>
      <small className="muted">
        Dimensions are optional and saved for each product.
      </small>
      <button
        type="submit"
        className="button primary"
        disabled={busy || !hasFiles}
        title={!hasFiles ? "Choose a product image first" : undefined}
      >
        <Plus size={16} />
        {busy
          ? "Adding products…"
          : `Add ${drafts.length === 1 ? "product" : `${drafts.length} products`}`}
      </button>
    </form>
  );
}
