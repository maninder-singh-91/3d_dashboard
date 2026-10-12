import type { Product } from "./types";
import { productStatusLabel } from "./productStatus";

export function reviewCycleCount(product: Product): number {
  if (product.reviewCycleCount !== undefined)
    return productStatusLabel(product.status) === "Review"
      ? Math.max(1, product.reviewCycleCount) : product.reviewCycleCount;
  // Existing reviewed products start with their initial review already used.
  return product.submittedAt || product.approvedAt ||
    ["Review", "Done"].includes(productStatusLabel(product.status)) ||
    product.status === "Corrections Required" ||
    product.activity.some(({ text }) => /submitted for review|resubmitted for review|Status changed to Review|Corrections requested/i.test(text))
    ? 1 : 0;
}

export function revisionsLeft(product: Product): number {
  return Math.max(0, 3 - reviewCycleCount(product));
}
