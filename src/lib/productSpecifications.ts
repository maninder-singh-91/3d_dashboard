import type { Product, ProductSpecifications } from "./types";

export function productSpecificationsOf(product: Pick<Product, "sku" | "specifications">): ProductSpecifications {
  const specifications: ProductSpecifications = {
    barcode: "", storefront: "", length: "", width: "", height: "", unit: "cm",
    color: "", weight: "", usageArea: "", roomType: "", material: "", price: "", currency: "",
    ...product.specifications,
  };
  // Existing catalog measurements: Andes overall width 82, depth 87, height 46 inches.
  // The shared length field stores depth; saved measurements always take precedence.
  if (product.sku === "10130580" && ![specifications.length, specifications.width, specifications.height].some(value => value?.trim())) {
    return { ...specifications, length: "87", width: "82", height: "46", unit: "in" };
  }
  return specifications;
}
