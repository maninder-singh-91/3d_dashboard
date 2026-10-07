import type { Product } from "./types";

export function productDimensions(product: Product): string {
  const measurements = product.specifications;
  if (
    measurements &&
    [measurements.length, measurements.width, measurements.height].some(
      (value) => value?.trim(),
    )
  ) {
    return `${measurements.length || "—"} L × ${measurements.width || "—"} W × ${measurements.height || "—"} H ${measurements.unit || "cm"}`;
  }
  // Overall measurements from West Elm's Andes product page, SKU 10130580.
  return product.sku === "10130580" ? "82 W × 87 D × 46 H in" : "Not provided";
}
