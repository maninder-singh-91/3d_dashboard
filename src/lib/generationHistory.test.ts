import { afterEach, describe, expect, it, vi } from "vitest";
import { appendGenerationHistory, withoutQueuedPlaceholder, generationHistoryKey, generationSettingsSummary, loadGenerationHistory } from "./generationHistory";
import { defaultModelGenerationSettings } from "./modelGenerationSettings";
afterEach(() => vi.unstubAllGlobals());
describe("Generation history", () => {
  it("appends numbered entries with distinct model sources and immutable settings", () => {
    const settings = { ...defaultModelGenerationSettings, textureSize: "2K", meshOptimisation: true };
    const first = appendGenerationHistory([], { modelUrl: "local-model:first", settings, thumbnail: "", preview: false });
    settings.modelType = "Ultra";
    const second = appendGenerationHistory(first, { modelUrl: "local-model:second", settings, thumbnail: "", preview: false });
    expect(second.map((entry) => entry.number)).toEqual([1, 2]);
    expect(second.map((entry) => entry.modelUrl)).toEqual(["local-model:first", "local-model:second"]);
    expect(generationSettingsSummary(second[0].settings)).toBe("Fast · 2K · 100K");
    expect(generationSettingsSummary({ ...settings, textureEnabled: false, meshOptimisation: false })).toBe("Ultra · No texture");
    vi.stubGlobal("localStorage", { getItem: (key: string) => key === generationHistoryKey("product") ? JSON.stringify(second) : null });
    expect(loadGenerationHistory("product")).toEqual(second);
    expect(loadGenerationHistory("other")).toEqual([]);
  });
  it("ignores corrupt history and expired blob references", () => {
    vi.stubGlobal("localStorage", { getItem: () => "invalid json" });
    expect(loadGenerationHistory("product")).toEqual([]);
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify([{ id: "old", number: 1, modelUrl: "blob:expired", settings: defaultModelGenerationSettings }]) });
    expect(loadGenerationHistory("product")).toEqual([]);
  });
});

it("removes the initial queue placeholder but preserves actual generation and import history", () => {
  const sample = { modelUrl: "/models/studio-chair.glb", settings: defaultModelGenerationSettings, thumbnail: "", preview: true };
  const legacy = appendGenerationHistory([], sample);
  expect(withoutQueuedPlaceholder(legacy)).toEqual([]);
  const generated = appendGenerationHistory([], { ...sample, origin: "generated" });
  expect(withoutQueuedPlaceholder(generated)).toEqual(generated);
  const imported = appendGenerationHistory([], { ...sample, preview: false });
  expect(withoutQueuedPlaceholder(imported)).toEqual(imported);
  const initial = appendGenerationHistory([], { ...sample, origin: "initial" });
  const completed = appendGenerationHistory(initial, { ...sample, origin: "generated" });
  expect(withoutQueuedPlaceholder(completed)).toEqual([completed[1]]);
});
