import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { validateModelFile } from "./modelFiles";

describe("Model import validation", () => {
  it("accepts the actual bundled GLB model", async () => {
    const bytes = await readFile(
      new URL("../../public/models/studio-chair.glb", import.meta.url),
    );
    await expect(
      validateModelFile(new File([bytes], "chair.glb")),
    ).resolves.toBeUndefined();
  });
  it("rejects renamed non-model files and truncated GLBs", async () => {
    await expect(
      validateModelFile(new File(["invalid model content"], "chair.glb")),
    ).rejects.toThrow("valid GLB");
    const bytes = await readFile(
      new URL("../../public/models/studio-chair.glb", import.meta.url),
    );
    await expect(
      validateModelFile(new File([bytes.subarray(0, 30)], "chair.glb")),
    ).rejects.toThrow("valid GLB");
    await expect(
      validateModelFile(new File([bytes], "chair.zip")),
    ).rejects.toThrow("Choose a GLB");
  });
});
