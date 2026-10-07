import { memo, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Layers3, Sparkles, Trash2 } from "lucide-react";
import type { Batch, Product } from "../lib/types";
import {
  calculateCredits,
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

export function CreditSummary({ count }: { count: number }) {
  return (
    <div className="generation-credit-summary">
      <h4>Generation Credits</h4>
      <div>
        <span>
          {count} {count === 1 ? "product" : "products"} × {CREDITS_PER_PRODUCT}{" "}
          credits
        </span>
        <span>
          Total <strong>{calculateCredits(count)} credits</strong>
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
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
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
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return batchProducts.filter((p) =>
      `${p.sku} ${p.name}`.toLowerCase().includes(term),
    );
  }, [batchProducts, query]);
  const selectedSkus = useMemo(
    () => new Set(selected.map(skuIdentity)),
    [selected],
  );
  const atLimit = selected.length >= MAX_GENERATION_PRODUCTS;
  return (
    <Modal
      title="Select Products"
      subtitle="Choose up to 15 SKUs for your generation batch."
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
                <ManualProductUpload busy={uploading} onUpload={upload} />
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
          <div className="generation-available-heading">
            <h3>
              Available Products <span>{visible.length}</span>
            </h3>
            <div
              className="generation-selection-counter"
              role="status"
              aria-live="polite"
            >
              Selected{" "}
              <strong>{String(selected.length).padStart(2, "0")} / 15</strong>
            </div>
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
                        : "No products match your search."}
                </h4>
                <p>
                  {manual && !batchProducts.length
                    ? "Each image becomes a product you can select for generation."
                    : !batch && !manual
                      ? "Choose a batch from the dropdown above."
                      : !batchProducts.length
                        ? "Choose another batch to find products."
                        : "Try another SKU or product name."}
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
        </section>
        <section className="generation-queue" aria-label="AI Generation queue">
          <header>
            <span className="generation-queue-icon">
              <Sparkles size={19} />
            </span>
            <div>
              <h3>AI Generation Queue</h3>
            </div>
          </header>
          <div className="generation-selected-list">
            {selected.length ? (
              selected.map((product) => (
                <div className="generation-selected-row" key={product.id}>
                  <ProductImage product={product} />
                  <span className="generation-product-copy">
                    <strong>{product.name}</strong>
                    <small>SKU {product.sku}</small>
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${product.name}, SKU ${product.sku}`}
                    title="Remove from queue"
                    onClick={() => onRemove(product.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="generation-selection-empty">
                <Sparkles size={28} />
                <h4>Your generation queue is empty</h4>
                <p>Select products on the left to add them here.</p>
              </div>
            )}
          </div>
          <CreditSummary count={selected.length} />
        </section>
      </div>
      <footer className="generation-selection-footer">
        <span>1.5 credits per SKU</span>
        <button
          className="button primary"
          disabled={
            uploading ||
            !selected.length ||
            selected.length > MAX_GENERATION_PRODUCTS
          }
          onClick={onProceed}
        >
          Next <ArrowRight size={16} />
        </button>
      </footer>
    </Modal>
  );
}
