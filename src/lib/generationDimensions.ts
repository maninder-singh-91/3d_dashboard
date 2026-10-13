export function validGenerationDimensions(dimensions: { length?: string; width?: string; height?: string; unit?: string }): boolean {
  return ["length", "width", "height"].every(key => {
    const value = dimensions[key as "length" | "width" | "height"]?.trim();
    return !!value && Number.isFinite(Number(value)) && Number(value) > 0;
  }) && ["cm", "mm", "m", "in", "ft"].includes(dimensions.unit || "");
}
