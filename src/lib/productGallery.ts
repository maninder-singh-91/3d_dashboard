import type { Product } from "./types";

const andesGallery = Array.from({ length: 8 }, (_, index) => ({
  url: `/images/andes-10130580/${String(index + 1).padStart(2, "0")}.jpg`,
  name: `Andes bed · Product image ${index + 1}`,
}));

const portsideGallery = [
  { url: "/images/portside-8623644/product.jpg", name: "Outdoor setting" },
  { url: "/images/portside-8623644/detail.jpg", name: "Full table view" },
  { url: "/images/portside-8623644/angle.jpg", name: "Table angle" },
  { url: "/images/portside-8623644/setting.jpg", name: "Tabletop detail" },
  {
    url: "/images/portside-8623644/finish.jpeg",
    name: "Driftwood finish swatch",
  },
];

export function productGallery(
  product: Pick<Product, "sku" | "imageUrl" | "productUrl" | "isDemo">,
) {
  if (product.sku === "10130580") return andesGallery;
  const images =
    product.sku === "8623644" &&
    product.productUrl.includes(
      "portside-outdoor-coffee-table-driftwood-8623644",
    )
      ? [...portsideGallery]
      : product.imageUrl
        ? [{ url: product.imageUrl, name: "Product image" }]
        : [];
  if (product.isDemo) {
    // Local sample photos keep demo galleries available without external sources.
    for (let index = 0; images.length < 8 && index < 8; index++) {
      const url = `/images/product-${index}.jpg`;
      if (!images.some((image) => image.url === url))
        images.push({ url, name: `Demo reference ${images.length + 1}` });
    }
  }
  return images;
}
