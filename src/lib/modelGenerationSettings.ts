export const modelTypes = ["Fast", "Turbo", "Ultra"];
export const textureSizes = ["1K", "2K", "4K"];
export const polyCounts = ["100K", "200K", "300K"];
export const modelCredits: Record<string, number> = { Fast: 1.5, Turbo: 2.5, Ultra: 3.5 };
export const textureCredits: Record<string, number> = { "1K": 0, "2K": 0.25, "4K": 0.5 };
export const polyCountCredits: Record<string, number> = { "100K": 0.25, "200K": 0.5, "300K": 0.75 };
export const predefinedGenerationPrompt = "Create a faithful 3D model from the product reference images. Preserve the product's proportions, geometry, materials and visible details.";
export type ModelGenerationSettings = {
  prompt: string;
  modelType: string;
  textureSize: string;
  textureEnabled: boolean;
  meshOptimisation: boolean;
  polyCount: string;
};
export const defaultModelGenerationSettings: ModelGenerationSettings = {
  prompt: "",
  modelType: "Fast",
  textureSize: "1K",
  textureEnabled: true,
  meshOptimisation: false,
  polyCount: "100K",
};
export function generationCredits(settings: ModelGenerationSettings, count = 1) {
  return Math.round(count * ((modelCredits[settings.modelType] ?? 1.5) +
    (settings.textureEnabled ? textureCredits[settings.textureSize] ?? 0 : 0) +
    (settings.meshOptimisation ? polyCountCredits[settings.polyCount] ?? 0.25 : 0)) * 100) / 100;
}
export function generationPrompt(settings: ModelGenerationSettings) {
  const custom = settings.prompt.trim();
  return custom ? `${predefinedGenerationPrompt}\nAdditional specifications: ${custom}` : predefinedGenerationPrompt;
}
export const modelGenerationSettingsKey = (id: string) =>
  `glamar.model-generation.settings.v1.${id}`;
export function saveBatchModelGenerationSettings(ids: string[], settings: ModelGenerationSettings) {
  if (ids.length > 15) throw Error("Generate up to 15 products per run. Review outputs before generating more.");
  const value = JSON.stringify({ ...settings, resolvedPrompt: generationPrompt(settings) });
  const previous = ids.map((id) => {
    const key = modelGenerationSettingsKey(id);
    return { key, value: localStorage.getItem(key) };
  });
  try {
    for (const { key } of previous) localStorage.setItem(key, value);
  } catch (error) {
    for (const item of previous) {
      if (item.value === null) localStorage.removeItem(item.key);
      else localStorage.setItem(item.key, item.value);
    }
    throw error;
  }
}
export function loadModelGenerationSettings(
  id: string,
): ModelGenerationSettings {
  try {
    const stored = JSON.parse(
      localStorage.getItem(modelGenerationSettingsKey(id)) || "null",
    );
    return {
      prompt: typeof stored?.prompt === "string" ? stored.prompt : "",
      modelType: modelTypes.includes(stored?.modelType)
        ? stored.modelType
        : "Fast",
      textureSize: textureSizes.includes(stored?.textureSize)
        ? stored.textureSize
        : "1K",
      textureEnabled: typeof stored?.textureEnabled === "boolean" ? stored.textureEnabled : true,
      meshOptimisation:
        typeof stored?.meshOptimisation === "boolean"
          ? stored.meshOptimisation
          : false,
      polyCount: polyCounts.includes(stored?.polyCount) ? stored.polyCount : "100K",
    };
  } catch {
    return { ...defaultModelGenerationSettings };
  }
}
