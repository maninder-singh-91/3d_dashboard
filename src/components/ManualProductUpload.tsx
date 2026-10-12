import { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import ThemedSelect from "./ThemedSelect";
import { productInformationFields, specificationFields } from "../lib/productDetailFields";
import type { ManualProductInput, ManualDimensions } from "../lib/manualGeneration";
import { productSpecificationsOf } from "../lib/productSpecifications";
import type { Product } from "../lib/types";
import { loadProductGenerationImages } from "../lib/singleProductGeneration";

const emptyDimensions: ManualDimensions = { length: "", width: "", height: "", unit: "cm" };
const emptyDetails = { name: "", brand: "", category: "", productUrl: "", barcode: "", sku: "", productUid: "" };
function UploadPreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  return url ? <img className="generation-upload-thumbnail" src={url} alt={`Preview of ${file.name}`} /> : null;
}

export default function ManualProductUpload({ busy, onUpload, formId, hideSubmit = false, onFilesChange, product }: {
  product?: Product;
  busy: boolean;
  single?: boolean;
  formId?: string;
  hideSubmit?: boolean;
  onFilesChange?: (count: number) => void;
  onUpload: (products: ManualProductInput[]) => Promise<boolean>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const specifications = product ? productSpecificationsOf(product) : undefined;
  const [images, setImages] = useState<{ id: string; file: File }[]>([]);
  const [details, setDetails] = useState(product ? { name: product.name, brand: product.brand, category: product.category, productUrl: product.productUrl,
    barcode: specifications?.barcode || "", sku: product.sku, productUid: product.id } : { ...emptyDetails });
  const [dimensions, setDimensions] = useState<ManualDimensions>(() => ({ ...emptyDimensions,
    length: specifications?.length || "", width: specifications?.width || "", height: specifications?.height || "",
    unit: (specifications?.unit || "cm") as ManualDimensions["unit"] }));
  const [loading, setLoading] = useState(!!product);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!product) return;
    let active = true;
    setLoading(true);
    setError("");
    loadProductGenerationImages(product).then(files => {
      if (active) setImages(files.map(file => ({ id: crypto.randomUUID(), file })));
    }).catch(error => { if (active) setError((error as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product, reload]);
  useEffect(() => { onFilesChange?.(images.length); }, [images.length, onFilesChange]);
  return <form id={formId} className="generation-manual-upload" onSubmit={async event => {
    event.preventDefault();
    if (!images.length || busy || loading) return;
    const files = images.map(image => image.file);
    if (await onUpload([{ file: files[0], files, name: details.name, sku: details.sku,
      productUid: details.productUid, brand: details.brand, category: details.category, productUrl: details.productUrl, specifications: { ...specifications, barcode: details.barcode }, dimensions }])) {
      setImages([]);
      setDetails({ ...emptyDetails });
      setDimensions({ ...emptyDimensions });
      setError("");
    }
  }}>
    <button type="button" className="button secondary" disabled={busy || loading} onClick={() => input.current?.click()}>
      <ImagePlus size={17} />{images.length ? "Add images" : "Upload product images"}
    </button>
    <small className="muted">Multiple images of one product · JPG, PNG or WebP</small>
    {loading && <small role="status">Loading product images…</small>}
    {!loading && error && product && <button type="button" className="button secondary" onClick={() => setReload(value => value + 1)}>Retry loading images</button>}
    <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" aria-label="Upload product images"
      onChange={event => {
        const files = Array.from(event.target.files || []);
        const invalid = files.find(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type));
        if (invalid) setError("Choose JPG, PNG or WebP images.");
        else {
          setError("");
          setImages(current => [...current, ...files.map(file => ({ id: crypto.randomUUID(), file }))]);
        }
        event.target.value = "";
      }} />
    {images.length > 0 && <div className="generation-single-image-row" aria-label="Uploaded product images">
      {images.map(image => <div className="generation-single-thumbnail" key={image.id}>
        <label title={`Re-upload ${image.file.name}`}>
          <UploadPreview file={image.file} />
          <input type="file" hidden disabled={busy} accept="image/jpeg,image/png,image/webp" aria-label={`Re-upload ${image.file.name}`}
            onChange={event => {
              const file = event.target.files?.[0];
              if (file && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                setImages(current => current.map(item => item.id === image.id ? { ...item, file } : item));
                setError("");
              } else if (file) setError("Choose JPG, PNG or WebP images.");
              event.target.value = "";
            }} />
        </label>
        <button type="button" disabled={busy} aria-label={`Remove ${image.file.name}`} title="Remove image"
          onClick={() => setImages(current => current.filter(item => item.id !== image.id))}><X size={12} /></button>
      </div>)}
    </div>}
    {error && <p role="alert" className="generation-upload-error">{error}</p>}
    <fieldset className="generation-single-product-details" disabled={busy}>
      <legend>Product details</legend>
      <div className="generation-dimension-fields generation-identity-fields generation-upload-details">
        {productInformationFields.map(([key, label]) => <label key={key} className={key === "name" || key === "productUrl" ? "generation-upload-wide" : ""}>
          {label}{key !== "productUrl" && " *"}
          <input value={details[key]} placeholder={`Enter ${label.toLowerCase()}`} maxLength={key === "productUrl" ? 2000 : 200}
            onChange={event => setDetails({ ...details, [key]: event.target.value })} />
        </label>)}
        <label className="generation-upload-wide">Product UID<input readOnly={!!product} value={details.productUid} maxLength={128} placeholder="Generated automatically if blank"
          onChange={event => setDetails({ ...details, productUid: event.target.value })} /></label>
        <label>SKU ID<input readOnly={!!product} value={details.sku} maxLength={128} placeholder="Generated automatically if blank"
          onChange={event => setDetails({ ...details, sku: event.target.value })} /></label>
        <label>Barcode<input value={details.barcode} placeholder="Enter barcode"
          onChange={event => setDetails({ ...details, barcode: event.target.value })} /></label>
        {specificationFields.map(({ key, label, placeholder, choices }) => {
          if (key !== "length" && key !== "width" && key !== "height" && key !== "unit") return null;
          return <label key={key}>{label}
            {choices ? <ThemedSelect label={label} value={dimensions[key]} options={[{ value: "", label: placeholder }, ...choices.map(value => ({ value, label: value }))]}
              disabled={busy} onChange={value => setDimensions({ ...dimensions, unit: value as ManualDimensions["unit"] })} />
              : <input type="number" min="0.01" step="any" placeholder={placeholder} value={dimensions[key]}
                onChange={event => setDimensions({ ...dimensions, [key]: event.target.value })} />}
          </label>;
        })}
      </div>
    </fieldset>
    {!hideSubmit && <button type="submit" className="button primary" disabled={busy || !images.length}>
      <Plus size={16} />{busy ? "Adding product…" : "Add product"}
    </button>}
  </form>;
}
