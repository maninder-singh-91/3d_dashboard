import { afterEach, describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { createImageArchive } from "./downloadImages";

afterEach(() => vi.unstubAllGlobals());

describe("Gallery image download", () => {
  it("downloads all five catalog images along with uploaded references", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(
        async () => new Response(new Blob(["photo"], { type: "image/jpeg" })),
      );
    vi.stubGlobal("fetch", fetch);
    const archive = await createImageArchive(
      ["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg"],
      [new File(["reference"], "extra.png")],
      "8623644",
    );
    const contents = unzipSync(
      new Uint8Array(await archive.blob.arrayBuffer()),
    );
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(Object.keys(contents)).toHaveLength(6);
    expect(strFromU8(contents["06-extra.png"])).toBe("reference");
  });
  it("includes the product image and every reference, preserving duplicate filenames", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(new Blob(["product image"], { type: "image/jpeg" })),
        ),
    );
    const refs = [
      new File(["front"], "view.png"),
      new File(["back"], "view.png"),
    ];
    const archive = await createImageArchive(
      "/images/product.jpg",
      refs,
      "SKU-123",
    );
    const contents = unzipSync(
      new Uint8Array(await archive.blob.arrayBuffer()),
    );
    expect(archive.filename).toBe("SKU-123-images.zip");
    expect(Object.keys(contents)).toEqual([
      "01-product.jpg",
      "02-view.png",
      "03-view.png",
    ]);
    expect(Object.values(contents).map((bytes) => strFromU8(bytes))).toEqual([
      "product image",
      "front",
      "back",
    ]);
  });

  it("supports references without a catalog image and uses safe names", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const archive = await createImageArchive(
      "",
      [new File(["image"], "../view.png")],
      "../SKU/123",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(archive.filename).not.toMatch(/[\\/]/);
    expect(
      Object.keys(
        unzipSync(new Uint8Array(await archive.blob.arrayBuffer())),
      )[0],
    ).toBe("01--view.png");
  });

  it("reports inaccessible or invalid product images instead of downloading an incomplete archive", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(
      createImageArchive("https://example.com/image", [], "SKU"),
    ).rejects.toThrow("source may block downloads");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Not found", { status: 404 })),
    );
    await expect(createImageArchive("/missing.jpg", [], "SKU")).rejects.toThrow(
      "unavailable",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>page</html>", {
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );
    await expect(createImageArchive("/invalid.jpg", [], "SKU")).rejects.toThrow(
      "did not return an image",
    );
    await expect(createImageArchive("", [], "SKU")).rejects.toThrow(
      "no images",
    );
  });
});
