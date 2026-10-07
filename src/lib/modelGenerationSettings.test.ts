import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultModelGenerationSettings, loadModelGenerationSettings, modelGenerationSettingsKey, saveBatchModelGenerationSettings } from "./modelGenerationSettings";
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
  it("applies all settings to every selected product and leaves others unchanged", () => {
    const settings = { prompt: "Keep natural wood grain", modelType: "Ultra", textureSize: "4K", meshOptimisation: true };
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
