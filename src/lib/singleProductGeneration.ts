import type { Product } from "./types";
import { productGallery } from "./productGallery";
import { loadReferences } from "./referenceImages";

export async function loadProductGenerationImages(product: Product): Promise<File[]> {
  const uploaded = await loadReferences(product.id);
  const gallery = productGallery(product).filter(image => !product.hiddenReferenceUrls?.includes(image.url));
  const catalog = await Promise.all(gallery.map(async (image, index) => {
    const response = await fetch(image.url);
    if (!response.ok) throw Error(`Could not load ${image.name}. Try again.`);
    const blob = await response.blob();
    return new File([blob], `${product.name}-view-${index + 1}.${blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type || "image/jpeg" });
  }));
  return [...catalog, ...uploaded];
}
