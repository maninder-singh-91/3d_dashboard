import { useImperativeHandle, useRef, useState, type Ref, type ReactNode } from "react";
import { Copy, SlidersHorizontal } from "lucide-react";
import type {
  Product,
  ProductDetails,
  ProductSpecifications as Specifications,
} from "../lib/types";
import type { Action } from "../lib/workflow";
import ThemedSelect from "./ThemedSelect";
import { productSpecificationsOf } from "../lib/productSpecifications";
import { productInformationFields, specificationFields } from "../lib/productDetailFields";

function detailsOf(p: Product): ProductDetails {
  return {
    name: p.name,
    brand: p.brand,
    category: p.category,
    productUrl: p.productUrl,
    specifications: productSpecificationsOf(p),
  };
}

export default function ProductSpecifications({
  product,
  editable,
  onUpdate,
  onCopy,
  initiallyOpen = false,
  saveRef,
  onChange,
  lighting,
}: {
  lighting?: ReactNode;
  onChange?: () => void;
  saveRef?: Ref<{ save: () => Promise<boolean> }>;
  initiallyOpen?: boolean;
  product: Product;
  editable: boolean;
  onUpdate: (action: Action) => Promise<void>;
  onCopy: (value: string, kind?: "url" | "uid" | "product-url") => void;
}) {
  const [draft, setDraft] = useState(() => detailsOf(product));
  const [section, setSection] = useState("product");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(detailsOf(product));
  const locked = !editable || busy;
  const formRef = useRef<HTMLFormElement>(null);
  useImperativeHandle(saveRef, () => ({ save: () => save() }));
  function spec(key: keyof Specifications, value: string) {
    onChange?.();
    setDraft((d) => ({
      ...d,
      specifications: { ...d.specifications, [key]: value },
    }));
  }
  async function save(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy) return false;
    if (!editable || !dirty) return true;
    if (formRef.current && !formRef.current.reportValidity()) return false;
    setBusy(true);
    setError("");
    try {
      const next = {
        ...draft,
        name: draft.name.trim(),
        brand: draft.brand.trim(),
        category: draft.category.trim(),
        productUrl: draft.productUrl.trim(),
      };
      await onUpdate({ type: "details", details: next });
      setDraft(next);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`panel detail-disclosure product-specifications${initiallyOpen ? " product-specifications-top" : ""}`} aria-label="Product details & specifications">
      <div className="product-specifications-heading">
        <SlidersHorizontal size={19} />
        <h3>Product details &amp; specifications</h3>
      </div>
      <form ref={formRef} onSubmit={save}>
        <div
          className="spec-section-switch"
          role="group"
          aria-label="Product details section"
        >
          <button
            type="button"
            aria-pressed={section === "product"}
            onClick={() => setSection("product")}
          >
            Product information
          </button>
          {lighting && <button type="button" aria-pressed={section === "lighting"} onClick={() => setSection("lighting")}>
            Lighting
          </button>}
        </div>
        {section === "product" ? (
          <>
            <div className="spec-fields">
              <div className="field spec-field-wide">
                <span>Placement</span>
                <div className="product-placement-options" role="group" aria-label="Placement">
                  {(["Floor", "Wall"] as const).map(placement => <button key={placement} type="button" className="button secondary" aria-pressed={(draft.specifications.placement || "Floor") === placement} disabled={locked} onClick={() => spec("placement", placement)}>{placement}</button>)}
                </div>
              </div>
              {productInformationFields.map(([key, label]) => (
                <label className={`field${key === "name" ? " spec-field-wide" : ""}`} key={key}>
                  <span>
                    {label}
                    {key !== "productUrl" && <span className="muted"> *</span>}
                  </span>
                  <div className={key === "productUrl" ? "product-uid-detail" : undefined}>
                  <input
                    value={draft[key]}
                    readOnly={locked}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    onChange={(e) => {
                      onChange?.();
                      setDraft({ ...draft, [key]: e.target.value });
                    }}
                  />
                  {key === "productUrl" && <button type="button" className="icon-button" aria-label="Copy Product URL" title="Copy Product URL" disabled={!draft.productUrl.trim()} onClick={() => onCopy(draft.productUrl.trim(), "product-url")}><Copy size={16} /></button>}
                  </div>
                </label>
              ))}
              <div className="field">
                <label htmlFor="product-uid">Product UID</label>
                <div className="product-uid-detail">
                  <input id="product-uid" value={product.id} readOnly />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Copy Product UID"
                    title="Copy Product UID"
                    onClick={() => onCopy(product.id, "uid")}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <label className="field">
                <span>SKU ID</span>
                <input value={product.sku} readOnly />
              </label>
              <label className="field">
                <span>Barcode</span>
                <input
                  value={draft.specifications.barcode}
                  readOnly={locked}
                  placeholder="Enter barcode"
                  onChange={(e) => spec("barcode", e.target.value)}
                />
              </label>
            {specificationFields.map(
              ({ key, label, placeholder, numeric, choices }) => (
                <div className="field" key={key}>
                  <label htmlFor={`spec-${key}`}>{label}</label>
                  {choices ? (
                    <ThemedSelect
                      label={label}
                      value={draft.specifications[key]}
                      disabled={locked}
                      options={[
                        { value: "", label: placeholder },
                        ...choices.map((value) => ({ value, label: value })),
                      ]}
                      onChange={(value) => spec(key, value)}
                    />
                  ) : (
                    <input
                      id={`spec-${key}`}
                      value={draft.specifications[key]}
                      readOnly={locked}
                      type={numeric ? "number" : "text"}
                      min={numeric ? "0" : undefined}
                      step={numeric ? "any" : undefined}
                      placeholder={placeholder}
                      onChange={(e) => spec(key, e.target.value)}
                    />
                  )}
                </div>
              ),
            )}
            </div>
          </>
        ) : (
          <div className="product-lighting-content">{lighting}</div>
        )}
        {error && (
          <p className="spec-error" role="alert">
            {error}
          </p>
        )}
        {!saveRef && <div className="spec-footer">
          {editable && (
            <div className="row">
              <button
                className="button secondary"
                type="button"
                disabled={busy || !dirty}
                onClick={() => {
                  setDraft(detailsOf(product));
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={busy || !dirty}
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </div>}
      </form>
    </section>
  );
}
