import { newProduct } from "./imports";
import { referenceError } from "./generation";
import { saveReferences } from "./referenceImages";
import type { Product } from "./types";

export type ManualDimensions = {
  length: string;
  width: string;
  height: string;
  unit: "cm" | "mm" | "m" | "in" | "ft";
};
export type ManualProductInput = {
  file: File;
  sku?: string;
  productUid?: string;
  dimensions: ManualDimensions;
};

export async function prepareManualProducts(
  inputs: ManualProductInput[],
  existing: Pick<Product, "id" | "sku">[] = [],
) {
  const skus = new Set(existing.map((product) => product.sku.toLowerCase()));
  const uids = new Set(existing.map((product) => product.id.toLowerCase()));
  for (const input of inputs) {
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
  const files = inputs.map((input) => input.file);
  if (files.length > 15)
    throw Error("Upload up to 15 product images at a time.");
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
  const batchId = `manual-${crypto.randomUUID().slice(0, 8)}`;
  const products = [];
  for (const { file, dimensions, sku, productUid } of inputs) {
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
      name: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
      category: "Uncategorised",
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
        length: dimensions.length.trim(),
        width: dimensions.width.trim(),
        height: dimensions.height.trim(),
        unit: dimensions.unit,
      },
    });
    products.push(product);
  }
  for (let index = 0; index < files.length; index++) {
    await saveReferences(products[index].id, [files[index]]);
  }
  return products;
}
