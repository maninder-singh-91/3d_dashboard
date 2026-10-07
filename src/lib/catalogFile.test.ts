import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";
import { parseCatalogFile, type CatalogFileProgress } from "./catalogFile";

const headers = ["Product Name", "SKU ID", "Product URL"];
const row = ["Test chair", "00123", "https://example.com/chair"];

describe("Catalog file uploads", () => {
  it("reports real byte progress before checking products", async () => {
    const events: CatalogFileProgress[] = [];
    const csv =
      headers.join(",") +
      "\n" +
      ["Chair " + "é".repeat(150_000), "001", "https://example.com/chair"].join(
        ",",
      );
    const result = await parseCatalogFile(new File([csv], "large.csv"), {
      onProgress: (event) => events.push(event),
    });
    expect(result.errors).toEqual([]);
    expect(result.products[0].name).toContain("é".repeat(150_000));
    expect(events[0]).toEqual({ phase: "reading", percent: 0 });
    expect(
      events.some(
        (event) =>
          event.phase === "reading" && event.percent > 0 && event.percent < 100,
      ),
    ).toBe(true);
    expect(events.at(-2)).toEqual({ phase: "reading", percent: 100 });
    expect(events.at(-1)).toEqual({ phase: "processing" });
  });
  it("allows missing links only in demo mode and supplies eyewear images", async () => {
    const csv =
      "Product Name,SKU ID,Product URL,Product Category,Status,Assignee\nPurple frames,001,,Optical Frames,Done,Supriya\nSun glasses,002,,Sunglasses,Hold,Kritika";
    const file = new File([csv], "demo.csv");
    const strict = await parseCatalogFile(file);
    expect(strict.errors).toContain("Row 2: Invalid Product URL.");
    const demo = await parseCatalogFile(file, { demo: true });
    expect(demo.errors).toEqual([]);
    expect(demo.products[0]).toMatchObject({
      productUrl: "",
      isDemo: true,
      status: "Completed",
      imageUrl: "/images/demo-eyewear/optical-0.svg",
    });
    expect(demo.products[1]).toMatchObject({
      status: "On Hold",
      imageUrl: "/images/demo-eyewear/sun-1.svg",
    });
    const invalid = await parseCatalogFile(
      new File([csv.replace("001,,", "001,invalid,")], "invalid.csv"),
      { demo: true },
    );
    expect(invalid.errors).toContain("Row 2: Invalid Product URL.");
  });
  it.each(["xlsx", "xls"] as const)(
    "reads %s files and preserves SKU formatting",
    async (bookType) => {
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, utils.aoa_to_sheet([]), "Empty");
      const sheet = utils.aoa_to_sheet([headers, row]);
      sheet.B2 = { t: "n", v: 123, z: "00000" };
      utils.book_append_sheet(workbook, sheet, "Catalog");
      const file = new File(
        [write(workbook, { type: "array", bookType })],
        `catalog.${bookType}`,
      );
      const result = await parseCatalogFile(file);
      expect(result.errors).toEqual([]);
      expect(result.products).toHaveLength(1);
      expect(result.products[0]).toMatchObject({
        name: "Test chair",
        sku: "00123",
        status: "Available",
      });
    },
  );

  it("continues to read CSV and validate required product fields", async () => {
    const valid = await parseCatalogFile(
      new File(
        [[headers, row].map((r) => r.join(",")).join("\n")],
        "catalog.csv",
      ),
    );
    expect(valid.errors).toEqual([]);
    const invalid = await parseCatalogFile(
      new File([headers.join(",") + "\nChair,,invalid"], "catalog.csv"),
    );
    expect(invalid.errors).toContain("Row 2: SKU ID is required.");
    expect(invalid.errors).toContain("Row 2: Invalid Product URL.");
  });

  it("rejects unsupported, oversized, and empty files", async () => {
    await expect(
      parseCatalogFile(new File(["text"], "catalog.pdf")),
    ).rejects.toThrow("Choose a CSV or Excel file");
    await expect(
      parseCatalogFile(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "catalog.xlsx"),
      ),
    ).rejects.toThrow("smaller than 5 MB");
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, utils.aoa_to_sheet([]), "Empty");
    await expect(
      parseCatalogFile(
        new File(
          [write(workbook, { type: "array", bookType: "xlsx" })],
          "empty.xlsx",
        ),
      ),
    ).rejects.toThrow("no products");
  });
});
