import { zipSync } from "fflate";

function safeName(name: string) {
  return (
    name
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/^\.+/, "")
      .trim()
      .slice(0, 120) || "product"
  );
}

export async function createImageArchive(
  imageUrl: string | string[],
  references: File[],
  sku: string,
) {
  const entries: Record<string, Uint8Array> = {};
  const urls = Array.isArray(imageUrl) ? imageUrl : imageUrl ? [imageUrl] : [];
  for (const [i, url] of urls.entries()) {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    } catch {
      throw Error(
        "The product image could not be downloaded. Its source may block downloads. Please try again.",
      );
    }
    if (!response.ok)
      throw Error("The product image is unavailable. Please try again.");
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith("image/"))
      throw Error("The product image source did not return an image.");
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif",
      "image/svg+xml": "svg",
    };
    const extension = extensions[blob.type.split(";")[0]] || "img";
    entries[`${String(i + 1).padStart(2, "0")}-product.${extension}`] =
      new Uint8Array(await blob.arrayBuffer());
  }
  const start = urls.length + 1;
  await Promise.all(
    references.map(async (file, i) => {
      entries[`${String(i + start).padStart(2, "0")}-${safeName(file.name)}`] =
        new Uint8Array(await file.arrayBuffer());
    }),
  );
  if (!Object.keys(entries).length)
    throw Error("There are no images to download.");
  // Images are already compressed; storing them keeps ZIP creation fast.
  const archive = zipSync(entries, { level: 0 });
  return {
    blob: new Blob([new Uint8Array(archive)], { type: "application/zip" }),
    filename: `${safeName(sku)}-images.zip`,
  };
}
