import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { repository } from "./repository";
import { newProduct } from "./imports";
import { saveModelFile, removeModelFile } from "./modelFiles";
import { localModelKey } from "./modelReference";
vi.mock("./modelFiles", () => ({ saveModelFile: vi.fn().mockResolvedValue(undefined), removeModelFile: vi.fn().mockResolvedValue(undefined) }));
const key = "modello.workspace.v1";
let values: Map<string, string>;
beforeEach(() => {
  vi.clearAllMocks();
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  vi.stubGlobal("navigator", { locks: { request: async (_: string, fn: () => Promise<void>) => fn() } });
  values.set(key, JSON.stringify({ version: 1, batches: [], products: [
    newProduct({ id: "target", sku: "8782", consoleStatus: "Published" }),
    newProduct({ id: "other-batch", sku: "8782", modelUrl: "https://example.com/original.glb" }),
  ] }));
});
afterEach(() => vi.unstubAllGlobals());
describe("Generation model sync", () => {
  it("updates only the exact UID, retaining SKU, workflow and publication status", async () => {
    const before = repository.read();
    await repository.syncModel("target", "8782", "/models/studio-chair.glb", undefined, "artist", "3D Artist");
    const after = repository.read();
    expect(after.products[0]).toMatchObject({ id: "target", sku: "8782", status: "Available", consoleStatus: "Draft", modelUrl: "/models/studio-chair.glb" });
    expect(after.products[0].activity[0].text).toContain("Sample 3D model synced");
    expect(after.products[1]).toEqual(before.products[1]);
  });
  it("rejects stale identity, missing products and temporary URLs", async () => {
    const before = repository.read();
    await expect(repository.syncModel("target", "changed", "/models/studio-chair.glb", undefined, "artist", "3D Artist")).rejects.toThrow("SKU has changed");
    await expect(repository.syncModel("missing", "8782", "/models/studio-chair.glb", undefined, "artist", "3D Artist")).rejects.toThrow("no longer");
    await expect(repository.syncModel("target", "8782", "blob:temporary", undefined, "artist", "3D Artist")).rejects.toThrow("can be saved");
    expect(repository.read()).toEqual(before);
  });
  it("persists a local model with a durable file reference", async () => {
    const file = new File(["model"], "chair.glb");
    await repository.syncModel("target", "8782", "blob:temporary", file, "artist", "3D Artist");
    const saved = repository.read().products[0];
    expect(localModelKey(saved.modelUrl)).toBeTruthy();
    expect(saveModelFile).toHaveBeenCalledWith(localModelKey(saved.modelUrl), file);
    expect(saved.modelUrl).not.toContain("blob:");
  });
  it("keeps the previous listing model when storing the record fails", async () => {
    const before = repository.read();
    vi.mocked(localStorage.setItem).mockImplementationOnce(() => { throw Error("Storage full"); });
    await expect(repository.syncModel("target", "8782", "blob:temporary", new File(["model"], "chair.glb"), "artist", "3D Artist")).rejects.toThrow("Storage full");
    expect(repository.read()).toEqual(before);
    expect(removeModelFile).toHaveBeenCalledWith(expect.any(String));
  });
  it("does not let reviewers overwrite models", async () => {
    await expect(repository.syncModel("target", "8782", "/models/studio-chair.glb", undefined, "reviewer", "Reviewer")).rejects.toThrow("responsible artist");
    expect(saveModelFile).not.toHaveBeenCalled();
  });
});
