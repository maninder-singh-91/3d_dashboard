export const modelTypes = ["Fast", "Turbo", "Ultra"];
export const textureSizes = ["1K", "2K", "4K", "8K"];
export type ModelGenerationSettings = {
  prompt: string;
  modelType: string;
  textureSize: string;
  meshOptimisation: boolean;
};
export const defaultModelGenerationSettings: ModelGenerationSettings = {
  prompt: "",
  modelType: "Fast",
  textureSize: "2K",
  meshOptimisation: false,
};
export const modelGenerationSettingsKey = (id: string) =>
  `glamar.model-generation.settings.v1.${id}`;
export function saveBatchModelGenerationSettings(ids: string[], settings: ModelGenerationSettings) {
  const value = JSON.stringify(settings);
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
        : "2K",
      meshOptimisation:
        typeof stored?.meshOptimisation === "boolean"
          ? stored.meshOptimisation
          : false,
    };
  } catch {
    return { ...defaultModelGenerationSettings };
  }
}
