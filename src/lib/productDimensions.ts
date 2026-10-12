import { productSpecificationsOf } from "./productSpecifications";
import type { Product } from "./types";

export function productDimensions(product: Product): string {
  const measurements = productSpecificationsOf(product);
  if (
    measurements &&
    [measurements.length, measurements.width, measurements.height].some(
      (value) => value?.trim(),
    )
  ) {
    return `${measurements.length || "—"} L × ${measurements.width || "—"} W × ${measurements.height || "—"} H ${measurements.unit || "cm"}`;
  }
  return "Not provided";
}
