import { describe, expect, it } from "vitest";
import { productSpecificationsOf } from "./productSpecifications";
import { productDimensions } from "./productDimensions";
import { newProduct } from "./imports";
describe("Shared product dimensions", () => {
  it("exposes the existing Andes dimensions to listing and generation forms", () => {
    const product = newProduct({ sku: "10130580" });
    expect(productSpecificationsOf(product)).toMatchObject({ length: "87", width: "82", height: "46", unit: "in" });
    expect(productDimensions(product)).toBe("87 L × 82 W × 46 H in");
  });
  it("preserves saved dimensions, partial measurements, unit and other specifications", () => {
    const product = newProduct({ sku: "10130580" });
    product.specifications = { ...productSpecificationsOf(product), length: "120", width: "", height: "55", unit: "cm", barcode: "abc" };
    expect(productSpecificationsOf(product)).toMatchObject({ length: "120", width: "", height: "55", unit: "cm", barcode: "abc" });
  });
  it("does not invent dimensions for an unknown product", () => {
    expect(productSpecificationsOf(newProduct({ sku: "OTHER" }))).toMatchObject({ length: "", width: "", height: "", unit: "cm" });
  });
});
