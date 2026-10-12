import { afterEach, describe, expect, it, vi } from "vitest";
import { loadProductGenerationImages } from "./singleProductGeneration";
import { loadReferences } from "./referenceImages";
import { newProduct } from "./imports";
vi.mock("./referenceImages", () => ({ loadReferences: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("Existing product generation images", () => {
  it("loads the visible catalog images and saved uploads without hidden images", async () => {
    const uploaded = new File(["image"], "uploaded.jpg", { type: "image/jpeg" });
    vi.mocked(loadReferences).mockResolvedValue([uploaded]);
    const fetchImage = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["image"], { type: "image/jpeg" }) });
    vi.stubGlobal("fetch", fetchImage);
    const product = newProduct({ name: "Chair", imageUrl: "/images/cover.jpg", hiddenReferenceUrls: ["/images/cover.jpg"], isDemo: true });
    const files = await loadProductGenerationImages(product);
    expect(fetchImage).not.toHaveBeenCalledWith("/images/cover.jpg");
    expect(fetchImage).toHaveBeenCalledTimes(7);
    expect(files).toHaveLength(8);
    expect(files.at(-1)).toBe(uploaded);
    expect(loadReferences).toHaveBeenCalledWith(product.id);
  });
  it("reports an image load failure instead of generating with missing views", async () => {
    vi.mocked(loadReferences).mockResolvedValue([]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(loadProductGenerationImages(newProduct({ imageUrl: "/missing.jpg" }))).rejects.toThrow("Could not load");
  });
});
