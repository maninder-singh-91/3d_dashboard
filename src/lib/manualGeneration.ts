import { newProduct } from "./imports";
import { referenceError } from "./generation";
import { saveReferences } from "./referenceImages";
import type { Product, ProductSpecifications } from "./types";

export type ManualDimensions = {
  length: string;
  width: string;
  height: string;
  unit: "cm" | "mm" | "m" | "in" | "ft";
};
export type ManualProductInput = {
  file: File;
  files?: File[];
  sku?: string;
  productUid?: string;
  name?: string;
  brand?: string;
  category?: string;
  productUrl?: string;
  specifications?: Partial<ProductSpecifications>;
  dimensions: ManualDimensions;
};

export async function prepareManualProducts(
  inputs: ManualProductInput[],
  existing: Pick<Product, "id" | "sku">[] = [],
  referenceKey: (productId: string) => string = id => id,
) {
  const skus = new Set(existing.map((product) => product.sku.toLowerCase()));
  const uids = new Set(existing.map((product) => product.id.toLowerCase()));
  for (const input of inputs) {
    if (input.productUrl?.trim()) {
      try {
        if (!["http:", "https:"].includes(new URL(input.productUrl.trim()).protocol)) throw Error();
      } catch { throw Error("Enter a valid HTTP or HTTPS product URL."); }
    }
    for (const [label, value, used] of [
      ["SKU", input.sku?.trim(), skus],
      ["Product UID", input.productUid?.trim(), uids],
    ] as const) {
      if (!value) continue;
      if (value.length > 128)
        throw Error(`${label} must be 128 characters or fewer.`);
      if (used.has(value.toLowerCase()))
        throw Error(`${label} ${value} already exists. Enter a unique value.`);
      used.add(value.toLowerCase());
    }
  }
  const references = inputs.map(input => input.files?.length ? input.files : [input.file]);
  const files = references.flat();
  if (inputs.length > 15)
    throw Error("Upload up to 15 products at a time.");
  for (const file of files) {
    const error = referenceError(file);
    if (error) throw Error(error);

  }
  for (const { dimensions } of inputs) {
    if (!["cm", "mm", "m", "in", "ft"].includes(dimensions.unit))
      throw Error("Choose a valid dimension unit.");
    for (const key of ["length", "width", "height"] as const) {
      const value = dimensions[key].trim();
      if (value && (!Number.isFinite(Number(value)) || Number(value) <= 0))
        throw Error("Dimensions must be positive numbers.");
    }
  }
  for (const file of files) {
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
    } catch {
      throw Error(`“${file.name}” could not be opened. Choose a valid image.`);
    }
  }
  const batchId = `manual-${crypto.randomUUID().slice(0, 8)}`;
  const products = [];
  for (const [index, { dimensions, sku, productUid, name, brand, category, productUrl, specifications }] of inputs.entries()) {
    const file = references[index][0];
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw Error(`“${file.name}” could not be opened. Choose a valid image.`);
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      throw Error("Image previews are unavailable. Please try again.");
    }
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const product = newProduct({
      ...(sku?.trim() ? { sku: sku.trim() } : {}),
      ...(productUid?.trim() ? { id: productUid.trim() } : {}),
      name: name?.trim() || file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
      brand: brand?.trim() || "Unspecified",
      category: category?.trim() || "Uncategorised",
      productUrl: productUrl?.trim() || "",
      imageUrl: canvas.toDataURL("image/jpeg", 0.85),
      batchId,
      source: "manual-generation",
      specifications: {
        barcode: "",
        storefront: "",
        color: "",
        weight: "",
        usageArea: "",
        roomType: "",
        material: "",
        price: "",
        currency: "",
        ...specifications,
        length: dimensions.length.trim(),
        width: dimensions.width.trim(),
        height: dimensions.height.trim(),
        unit: dimensions.unit,
      },
    });
    products.push(product);
  }
  for (let index = 0; index < inputs.length; index++) {
    await saveReferences(referenceKey(products[index].id), references[index]);
  }
  return products;
}
