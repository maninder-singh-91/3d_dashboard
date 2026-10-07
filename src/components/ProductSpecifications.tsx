import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { ChevronDown, Copy, SlidersHorizontal } from "lucide-react";
import type {
  Product,
  ProductDetails,
  ProductSpecifications as Specifications,
} from "../lib/types";
import type { Action } from "../lib/workflow";
import ThemedSelect from "./ThemedSelect";

const empty: Specifications = {
  barcode: "",
  storefront: "",
  length: "",
  width: "",
  height: "",
  unit: "cm",
  color: "",
  weight: "",
  usageArea: "",
  roomType: "",
  material: "",
  price: "",
  currency: "",
};
const specificationFields: {
  key: keyof Specifications;
  label: string;
  placeholder: string;
  numeric?: boolean;
  choices?: string[];
}[] = [
  {
    key: "length",
    label: "Length",
    placeholder: "Enter length",
    numeric: true,
  },
  { key: "width", label: "Width", placeholder: "Enter width", numeric: true },
  {
    key: "height",
    label: "Height",
    placeholder: "Enter height",
    numeric: true,
  },
  {
    key: "unit",
    label: "Dimension unit",
    placeholder: "Select unit",
    choices: ["cm", "mm", "m", "in", "ft"],
  },
  {
    key: "material",
    label: "Material",
    placeholder: "e.g. Wood, fabric, metal",
  },
  { key: "color", label: "Color", placeholder: "Color name or hex code" },
  {
    key: "weight",
    label: "Weight (kg)",
    placeholder: "Enter weight",
    numeric: true,
  },
  {
    key: "roomType",
    label: "Room type",
    placeholder: "e.g. Living room, bedroom",
  },
  { key: "storefront", label: "Storefront", placeholder: "Enter storefront" },
  { key: "price", label: "Price", placeholder: "Enter price", numeric: true },
  {
    key: "currency",
    label: "Currency",
    placeholder: "Select currency",
    choices: ["INR", "USD", "EUR", "GBP", "AED"],
  },
];
function detailsOf(p: Product): ProductDetails {
  return {
    name: p.name,
    brand: p.brand,
    category: p.category,
    productUrl: p.productUrl,
    specifications: { ...empty, ...p.specifications },
  };
}

export default function ProductSpecifications({
  product,
  editable,
  onUpdate,
  onCopy,
  initiallyOpen = false,
  saveRef,
}: {
  saveRef?: Ref<{ save: () => Promise<boolean> }>;
  initiallyOpen?: boolean;
  product: Product;
  editable: boolean;
  onUpdate: (action: Action) => Promise<void>;
  onCopy: (value: string) => void;
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
    <details className={`panel detail-disclosure product-specifications${initiallyOpen ? " product-specifications-top" : ""}`} open={initiallyOpen || undefined}>
      <summary>
        <SlidersHorizontal size={19} />
        <h3>Product details &amp; specifications</h3>
        <ChevronDown size={16} />
      </summary>
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
          <button
            type="button"
            aria-pressed={section === "specifications"}
            onClick={() => setSection("specifications")}
          >
            Specifications
          </button>
        </div>
        {section === "product" ? (
          <>
            <div className="spec-fields">
              {(
                [
                  ["name", "Product name"],
                  ["category", "Category"],
                  ["brand", "Brand name"],
                  ["productUrl", "Product URL"],
                ] as const
              ).map(([key, label]) => (
                <label className="field" key={key}>
                  <span>
                    {label}
                    {key !== "productUrl" && <span className="muted"> *</span>}
                  </span>
                  <input
                    value={draft[key]}
                    readOnly={locked}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    onChange={(e) => {
                      setDraft({ ...draft, [key]: e.target.value });
                    }}
                  />
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
                    onClick={() => onCopy(product.id)}
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
            </div>
          </>
        ) : (
          <div className="spec-fields">
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
        )}
        {error && (
          <p className="spec-error" role="alert">
            {error}
          </p>
        )}
        <div className="spec-footer">
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
        </div>
      </form>
    </details>
  );
}
