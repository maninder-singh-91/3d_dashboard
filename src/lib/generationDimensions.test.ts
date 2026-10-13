import { expect, it } from "vitest";
import { validGenerationDimensions } from "./generationDimensions";
it("requires all three positive measurements and a supported unit", () => {
  const valid = { length: "10", width: "20", height: "30", unit: "cm" };
  expect(validGenerationDimensions(valid)).toBe(true);
  for (const key of ["length", "width", "height", "unit"] as const) {
    expect(validGenerationDimensions({ ...valid, [key]: "" })).toBe(false);
  }
  for (const value of ["0", "-1", "abc", "Infinity"]) {
    expect(validGenerationDimensions({ ...valid, length: value })).toBe(false);
  }
  expect(validGenerationDimensions({ ...valid, unit: "unknown" })).toBe(false);
});
