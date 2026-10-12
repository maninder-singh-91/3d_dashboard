import type { ModelGenerationSettings } from "./modelGenerationSettings";
export type GenerationHistoryEntry = {
  id: string;
  number: number;
  modelUrl: string;
  settings: ModelGenerationSettings;
  thumbnail: string;
  preview: boolean;
  origin?: "initial" | "generated" | "imported";
  deleted?: boolean;
};
export const generationHistoryKey = (productId: string) => `glamar.generation-history.v1.${productId}`;
export function withoutQueuedPlaceholder(entries: GenerationHistoryEntry[]) {
  const legacyPlaceholder = entries.length === 1 && !entries[0].origin && entries[0].number === 1 &&
    entries[0].preview && entries[0].modelUrl === "/models/studio-chair.glb";
  return legacyPlaceholder ? [] : entries.filter(entry => entry.origin !== "initial");
}
export function loadGenerationHistory(productId: string): GenerationHistoryEntry[] {
  try {
    const entries = JSON.parse(localStorage.getItem(generationHistoryKey(productId)) || "[]");
    return Array.isArray(entries) ? entries.filter((e) => e && typeof e.id === "string" && Number.isInteger(e.number) && e.number > 0 &&
      typeof e.modelUrl === "string" && !e.modelUrl.startsWith("blob:") && e.settings && typeof e.settings.modelType === "string") : [];
  } catch { return []; }
}
export function appendGenerationHistory(entries: GenerationHistoryEntry[], entry: Omit<GenerationHistoryEntry, "id" | "number">) {
  return [...entries, { ...entry, settings: { ...entry.settings }, id: crypto.randomUUID(), number: Math.max(0, ...entries.map((e) => e.number)) + 1 }];
}
export function generationSettingsSummary(settings: ModelGenerationSettings) {
  return `${settings.modelType} · ${settings.textureEnabled ? settings.textureSize : "No texture"}${settings.meshOptimisation ? ` · ${settings.polyCount}` : ""}`;
}
