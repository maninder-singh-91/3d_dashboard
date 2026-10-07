import { describe, expect, it } from "vitest";
import {
  defaultRenderSettings,
  renderFields,
  restoreRenderSettings,
} from "./renderSettings";

describe("Render settings persistence", () => {
  it("restores every selectable render option", () => {
    for (const [key, field] of Object.entries(renderFields)) {
      for (const value of field.options) {
        expect(
          restoreRenderSettings(
            JSON.parse(
              JSON.stringify({ ...defaultRenderSettings, [key]: value }),
            ),
          ),
        ).toEqual({ ...defaultRenderSettings, [key]: value });
      }
    }
  });
  it("falls back for invalid stored values and bounds custom duration", () => {
    expect(restoreRenderSettings(null)).toEqual(defaultRenderSettings);
    expect(
      restoreRenderSettings({
        aspect: "invalid",
        format: 42,
        customDuration: Infinity,
      }),
    ).toEqual(defaultRenderSettings);
    expect(restoreRenderSettings({ customDuration: 0 }).customDuration).toBe(1);
    expect(restoreRenderSettings({ customDuration: 999 }).customDuration).toBe(
      120,
    );
  });
});
