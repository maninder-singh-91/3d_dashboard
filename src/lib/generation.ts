export const MAX_REFERENCE_IMAGES = 6;
export const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function referenceError(file: File): string | null {
  if (!imageTypes.has(file.type)) return `${file.name}: use JPG, PNG, or WebP.`;
  if (!file.size || file.size > MAX_REFERENCE_BYTES)
    return `${file.name}: choose an image under 10 MB.`;
  return null;
}
