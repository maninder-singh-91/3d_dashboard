import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareManualProducts } from "./manualGeneration";
import { saveReferences } from "./referenceImages";
vi.mock("./referenceImages", () => ({
  saveReferences: vi.fn().mockResolvedValue(undefined),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("Manual generation dimensions", () => {
  it("stores multiple views as one product with one set of details", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }));
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({ fillRect: vi.fn(), drawImage: vi.fn() }), toDataURL: () => "data:image/jpeg;base64,preview" }) });
    const files = Array.from({ length: 16 }, (_, index) => new File(["image"], `view-${index}.jpg`, { type: "image/jpeg" }));
    const products = await prepareManualProducts([{ file: files[0], files, name: "One chair", brand: "Chair brand", category: "Chairs", productUrl: "https://example.com/chair", sku: "ONE-CHAIR", specifications: { barcode: "123456", material: "Oak" }, dimensions: { length: "80", width: "60", height: "95", unit: "cm" } }]);
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ name: "One chair", brand: "Chair brand", category: "Chairs", productUrl: "https://example.com/chair", sku: "ONE-CHAIR", specifications: { barcode: "123456", length: "80", material: "Oak" } });
    expect(saveReferences).toHaveBeenCalledExactlyOnceWith(products[0].id, files);
  });
  it("rejects an unreadable additional view before saving the product images", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValueOnce({ close: vi.fn() }).mockRejectedValueOnce(new Error("Invalid image")));
    const files = [new File(["image"], "front.jpg", { type: "image/jpeg" }), new File(["invalid"], "side.jpg", { type: "image/jpeg" })];
    await expect(prepareManualProducts([{ file: files[0], files, dimensions: { length: "", width: "", height: "", unit: "cm" } }])).rejects.toThrow("side.jpg");
    expect(saveReferences).not.toHaveBeenCalled();
  });
  it("saves independent dimensions and original images for each product", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }),
    );
    vi.stubGlobal("document", {
      createElement: () => ({
        getContext: () => ({ fillRect: vi.fn(), drawImage: vi.fn() }),
        toDataURL: () => "data:image/jpeg;base64,preview",
      }),
    });
    const files = [
      new File(["image"], "chair.jpg", { type: "image/jpeg" }),
      new File(["image"], "table.jpg", { type: "image/jpeg" }),
    ];
    const products = await prepareManualProducts([
      {
        file: files[0],
        name: "  Custom chair  ",
        specifications: { material: "Oak", color: "Natural", weight: "12" },
        sku: " CHAIR-001 ",
        productUid: " chair-uid-001 ",
        dimensions: { length: "80", width: "60", height: "95", unit: "cm" },
      },
      {
        file: files[1],
        dimensions: { length: "", width: "24.5", height: "", unit: "in" },
      },
    ]);
    expect(products[0].specifications).toMatchObject({
      material: "Oak",
      color: "Natural",
      weight: "12",
      length: "80",
      width: "60",
      height: "95",
      unit: "cm",
    });
    expect(products[0].sku).toBe("CHAIR-001");
    expect(products[0].name).toBe("Custom chair");
    expect(products[0].id).toBe("chair-uid-001");
    expect(products[1].sku).toMatch(/^NEW-/);
    expect(products[1].id).toBeTruthy();
    expect(products[1].specifications).toMatchObject({
      length: "",
      width: "24.5",
      height: "",
      unit: "in",
    });
    expect(products[0].id).not.toBe(products[1].id);
    expect(saveReferences).toHaveBeenCalledWith(products[0].id, [files[0]]);
    expect(saveReferences).toHaveBeenCalledWith(products[1].id, [files[1]]);
  });
  it("rejects nonpositive dimensions before storing images", async () => {
    await expect(
      prepareManualProducts([
        {
          file: new File(["image"], "chair.jpg", { type: "image/jpeg" }),
          dimensions: { length: "-3", width: "", height: "", unit: "cm" },
        },
      ]),
    ).rejects.toThrow("positive numbers");
    expect(saveReferences).not.toHaveBeenCalled();
  });
  it("rejects duplicate SKU and UID before storing images", async () => {
    const input = {
      file: new File(["image"], "chair.jpg", { type: "image/jpeg" }),
      dimensions: { length: "", width: "", height: "", unit: "cm" as const },
    };
    await expect(
      prepareManualProducts(
        [{ ...input, productUid: "existing" }],
        [{ id: "existing", sku: "old-sku" }],
      ),
    ).rejects.toThrow("Product UID existing already exists");
    await expect(
      prepareManualProducts([
        { ...input, sku: "CHAIR" },
        { ...input, sku: " chair " },
      ]),
    ).rejects.toThrow("SKU chair already exists");
    expect(saveReferences).not.toHaveBeenCalled();
  });
});
