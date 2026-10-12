import { memo, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Layers3, Trash2 } from "lucide-react";
import type { Batch, Product } from "../lib/types";
import {
  CREDITS_PER_PRODUCT,
  MAX_GENERATION_PRODUCTS,
  skuIdentity,
} from "../lib/generationSelection";
import { Modal, ProductImage, SearchField } from "./UI";
import ThemedSelect from "./ThemedSelect";
import ManualProductUpload from "./ManualProductUpload";
import type { ManualProductInput } from "../lib/manualGeneration";
import { productDimensions } from "../lib/productDimensions";
import "../generation-selection.css";
import "../generation-workspace.css";
import GenerationSettingsFields from "./GenerationSettingsFields";
import { generationCredits, type ModelGenerationSettings } from "../lib/modelGenerationSettings";

const ProductSelectionRow = memo(function ProductSelectionRow({
  product,
  checked,
  disabled,
  onToggle,
}: {
  product: Product;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label
      className={`generation-selection-row${checked ? " selected" : ""}${disabled ? " disabled" : ""}`}
    >
      <input
        type="checkbox"
        aria-label={`Select ${product.name}, SKU ${product.sku}`}
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(product.id)}
      />
      <ProductImage product={product} />
      <span className="generation-product-copy">
        <strong>{product.name}</strong>
        <span className="generation-product-details-grid">
          <span className="generation-product-identifiers">
            <small className="generation-product-metadata"><span>SKU</span><span>{product.sku}</span></small>
            <small className="generation-product-metadata"><span>Product UID</span><span>{product.id}</span></small>
          </span>
          <small className="generation-product-dimensions"><span>Dimensions</span><span>{productDimensions(product)}</span></small>
        </span>
      </span>
    </label>
  );
});

export function CreditSummary({ count, perProduct = CREDITS_PER_PRODUCT }: { count: number; perProduct?: number }) {
  return (
    <div className="generation-credit-summary">
      <h4>Generation Credits</h4>
      <div>
        <span>
          {count} {count === 1 ? "product" : "products"} × {perProduct}{" "}
          credits
        </span>
        <span>
          Total <strong>{Math.round(count * perProduct * 100) / 100} credits</strong>
        </span>
      </div>
    </div>
  );
}

export default function GenerationSelectionModal({
  products,
  batches,
  selected,
  batch,
  query,
  onBatch,
  onQuery,
  onToggle,
  onRemove,
  onClose,
  onProceed,
  source = "catalog",
  onBack,
  onUpload,
  settings,
  onSettingsChange,
  product,
}: {
  products: Product[];
  batches: Batch[];
  selected: Product[];
  batch: string;
  query: string;
  onBatch: (value: string) => void;
  onQuery: (value: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onProceed: () => void;
  source?: "catalog" | "manual";
  onBack?: () => void;
  onUpload?: (products: ManualProductInput[]) => Promise<void>;
  settings: ModelGenerationSettings;
  onSettingsChange: (settings: ModelGenerationSettings) => void;
  product?: Product;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imageCount, setImageCount] = useState(0);
  const manual = source === "manual";
  async function upload(products: ManualProductInput[]) {
    if (!products.length || !onUpload || uploading) return false;
    setUploading(true);
    setUploadError("");
    try {
      await onUpload(products);
      return true;
    } catch (error) {
      setUploadError((error as Error).message);
      return false;
    } finally {
      setUploading(false);
    }
  }
  const batchOptions = useMemo(() => {
    const ids = [
      ...new Set([
        ...batches.map((b) => b.id),
        ...products.map((p) => p.batchId).filter(Boolean),
      ]),
    ];
    return ids
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((id) => ({ value: id, label: `Batch ${id.replace(/^#/, "")}` }));
  }, [batches, products]);
  const batchProducts = useMemo(() => {
    if (!batch && !manual) return [];
    const seen = new Set<string>();
    return products.filter((product) => {
      if (
        manual
          ? product.source !== "manual-generation"
          : product.batchId !== batch
      )
        return false;
      const sku = skuIdentity(product);
      if (seen.has(sku)) return false;
      seen.add(sku);
      return true;
    });
  }, [products, batch, manual]);
  const selectedSkus = useMemo(
    () => new Set(selected.map(skuIdentity)),
    [selected],
  );
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return batchProducts.filter((p) => !selectedSkus.has(skuIdentity(p)) &&
      `${p.sku} ${p.name}`.toLowerCase().includes(term),
    );
  }, [batchProducts, query, selectedSkus]);
  const atLimit = selected.length >= MAX_GENERATION_PRODUCTS;
  const allAdded = batchProducts.length > 0 && batchProducts.every((p) => selectedSkus.has(skuIdentity(p)));
  return (
    <Modal
      title={manual ? "Single Product Generation" : "Select Products"}
      subtitle={manual ? undefined : "Choose up to 15 SKUs for your generation batch."}
      headerLeading={onBack && (
        <button
          type="button"
          className="generation-source-back"
          disabled={uploading}
          onClick={onBack}
          aria-label="Back to upload method"
          title="Change upload method"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      )}
      className={`generation-selection-modal${manual ? " generation-manual-selection" : ""}`}
      onClose={() => {
        if (!uploading) onClose();
      }}
    >
      <div className="generation-selection-columns">
        <section
          className="generation-available"
          aria-label="Available products"
        >
          <div className="generation-selection-filters">
            {manual ? (
              <>
                <ManualProductUpload key={product?.id || "new"} product={product} busy={uploading} onUpload={upload} formId="single-generation-upload" hideSubmit onFilesChange={setImageCount} />
                {uploadError && (
                  <p role="alert" className="generation-upload-error">
                    {uploadError}
                  </p>
                )}
              </>
            ) : (
              <div className="generation-batch-filter">
                <span>Batch</span>
                <ThemedSelect
                  label="Batch"
                  value={batch}
                  options={[
                    { value: "", label: "Select Batch" },
                    ...batchOptions,
                  ]}
                  onChange={onBatch}
                />
              </div>
            )}
            {(!manual || batchProducts.length > 0) && (
              <SearchField
                value={query}
                onChange={onQuery}
                placeholder="Search by SKU"
              />
            )}
          </div>
          {!manual && selected.length > 0 && <section className="generation-added-products" aria-label="Added products">
            <header><h3>{manual ? "Uploaded products" : "Selected products"}</h3><span>{selected.length} / 15</span></header>
            <div className="generation-added-thumbnails">
              {selected.map(product => <div key={product.id}>
                <ProductImage product={product} />
                <span><strong>{product.name}</strong><small>{productDimensions(product)}</small></span>
                <button type="button" className="icon-button" aria-label={`Remove ${product.name}, SKU ${product.sku}`} onClick={() => onRemove(product.id)}><Trash2 size={14} /></button>
              </div>)}
            </div>
          </section>}
          {!manual && <>
          <div className="generation-available-heading">
            <h3>
              Available Products <span>{visible.length}</span>
            </h3>

          </div>
          <div
            className="generation-selection-list"
            role="group"
            aria-label="Product selection"
          >
            {visible.map((product) => (
              <ProductSelectionRow
                key={product.id}
                product={product}
                checked={selectedSkus.has(skuIdentity(product))}
                disabled={atLimit && !selectedSkus.has(skuIdentity(product))}
                onToggle={onToggle}
              />
            ))}
            {!visible.length && (
              <div className="generation-selection-empty">
                <Layers3 size={26} />
                <h4>
                  {manual && !batchProducts.length
                    ? "Upload product images to get started."
                    : !batch && !manual
                      ? "Select a batch to view products."
                      : !batchProducts.length
                        ? "No products available in this batch."
                        : allAdded ? "All products have been added." : "No products match your search."}
                </h4>
                <p>
                  {manual && !batchProducts.length
                    ? "Each image becomes a product you can select for generation."
                    : !batch && !manual
                      ? "Choose a batch from the dropdown above."
                      : !batchProducts.length
                        ? "Choose another batch to find products."
                        : allAdded ? "Remove an added product to select it again." : "Try another SKU or product name."}
                </p>
              </div>
            )}
          </div>
          <p
            className={`generation-selection-hint${atLimit ? " at-limit" : ""}`}
          >
            {!batch && !manual
              ? "Select a batch to start adding products."
              : atLimit
                ? "Maximum 15 products selected. Remove one to add another."
                : "Select a row or checkbox to add a product."}
          </p>
          </>}
        </section>
        <section className="generation-settings-column" aria-label="Generation settings">
          <section className="generation-inline-settings generation-model-settings">
            <h3>Generation settings</h3>
            <GenerationSettingsFields value={settings} onChange={onSettingsChange} />
          </section>
          <CreditSummary count={manual ? (imageCount ? 1 : 0) : selected.length} perProduct={generationCredits(settings)} />
        </section>
      </div>
      <footer className="generation-selection-footer">
        <span>{generationCredits(settings)} credits per SKU</span>
        <button
          type={manual ? "submit" : "button"}
          form={manual ? "single-generation-upload" : undefined}
          className="button primary"
          disabled={
            uploading ||
            (manual ? !imageCount : !selected.length || selected.length > MAX_GENERATION_PRODUCTS)
          }
          onClick={manual ? undefined : () => { try { onProceed(); } catch { setUploadError("Settings could not be saved. Please try again."); } }}
        >
          Generate <ArrowRight size={16} />
        </button>
      </footer>
    </Modal>
  );
}
