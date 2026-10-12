import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultModelGenerationSettings, generationCredits, generationPrompt, predefinedGenerationPrompt, loadModelGenerationSettings, modelGenerationSettingsKey, saveBatchModelGenerationSettings } from "./modelGenerationSettings";
let stored: Map<string, string>;
beforeEach(() => {
  stored = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => { stored.set(key, value); }),
    removeItem: (key: string) => { stored.delete(key); },
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("Batch generation settings", () => {
  it("charges for the selected poly count only when mesh optimization is enabled", () => {
    for (const [polyCount, surcharge] of [["100K", 0.25], ["200K", 0.5], ["300K", 0.75]] as const) {
      const settings = { ...defaultModelGenerationSettings, modelType: "Ultra", textureSize: "4K", polyCount, meshOptimisation: true };
      expect(generationCredits(settings)).toBe(4 + surcharge);
      expect(generationCredits(settings, 15)).toBe((4 + surcharge) * 15);
      expect(generationCredits({ ...settings, meshOptimisation: false })).toBe(4);
    }
  });
  it("calculates model and texture credits with small tier increments", () => {
    for (const [modelType, base] of [["Fast", 1.5], ["Turbo", 2.5], ["Ultra", 3.5]] as const) {
      expect(generationCredits({ ...defaultModelGenerationSettings, modelType })).toBe(base);
      expect(generationCredits({ ...defaultModelGenerationSettings, modelType, textureSize: "2K" })).toBe(base + 0.25);
      expect(generationCredits({ ...defaultModelGenerationSettings, modelType, textureSize: "4K" })).toBe(base + 0.5);
      expect(generationCredits({ ...defaultModelGenerationSettings, modelType, textureSize: "4K", textureEnabled: false })).toBe(base);
    }
    expect(generationCredits({ ...defaultModelGenerationSettings, textureSize: "2K" }, 15)).toBe(26.25);
  });
  it("uses the predefined prompt and appends optional client specifications", () => {
    expect(generationPrompt(defaultModelGenerationSettings)).toBe(predefinedGenerationPrompt);
    expect(generationPrompt({ ...defaultModelGenerationSettings, prompt: "  Keep wood grain  " })).toBe(`${predefinedGenerationPrompt}\nAdditional specifications: Keep wood grain`);
  });
  it("restores new controls safely from older settings and rejects oversized batches", () => {
    stored.set(modelGenerationSettingsKey("legacy"), JSON.stringify({ modelType: "Turbo", textureSize: "8K", meshOptimisation: true }));
    expect(loadModelGenerationSettings("legacy")).toMatchObject({ modelType: "Turbo", textureSize: "1K", textureEnabled: true, polyCount: "100K" });
    expect(() => saveBatchModelGenerationSettings(Array.from({ length: 16 }, (_, i) => `p${i}`), defaultModelGenerationSettings)).toThrow("15 products");
  });
  it("applies all settings to every selected product and leaves others unchanged", () => {
    const settings = { ...defaultModelGenerationSettings, prompt: "Keep natural wood grain", modelType: "Ultra", textureSize: "4K", meshOptimisation: true, polyCount: "200K" };
    stored.set(modelGenerationSettingsKey("other"), JSON.stringify(defaultModelGenerationSettings));
    saveBatchModelGenerationSettings(["manual-product", "catalog-product"], settings);
    expect(loadModelGenerationSettings("manual-product")).toEqual(settings);
    expect(loadModelGenerationSettings("catalog-product")).toEqual(settings);
    expect(loadModelGenerationSettings("other")).toEqual(defaultModelGenerationSettings);
  });
  it("restores earlier settings if a batch save fails", () => {
    stored.set(modelGenerationSettingsKey("first"), JSON.stringify(defaultModelGenerationSettings));
    vi.mocked(localStorage.setItem).mockImplementationOnce((key, value) => { stored.set(key, value); }).mockImplementationOnce(() => { throw Error("Storage full"); });
    expect(() => saveBatchModelGenerationSettings(["first", "second"], { ...defaultModelGenerationSettings, modelType: "Turbo" })).toThrow("Storage full");
    expect(loadModelGenerationSettings("first")).toEqual(defaultModelGenerationSettings);
    expect(stored.has(modelGenerationSettingsKey("second"))).toBe(false);
  });
});
