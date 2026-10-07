import { describe, expect, it } from "vitest";
import { statuses } from "./types";
import {
  productStatusClass,
  productStatusLabel,
  productStatusOptions,
} from "./productStatus";
import { parseCSV } from "./imports";

describe("Product status groups", () => {
  it("includes each workflow status in exactly one of the five visible groups", () => {
    const groups = productStatusOptions.map(({ label }) =>
      statuses.filter((status) => productStatusLabel(status) === label),
    );
    expect(groups).toEqual([
      ["New", "Available"],
      ["Claimed", "In Progress", "Corrections Required"],
      ["Submitted", "In Review"],
      ["On Hold"],
      ["Approved", "Completed"],
    ]);
    expect(groups.flat().length).toBe(statuses.length);
    expect(productStatusClass("Corrections Required")).toBe("In Progress");
    expect(productStatusClass("On Hold")).toBe("On Hold");
    expect(productStatusClass("Submitted")).toBe("In Review");
  });

  it("accepts the visible To do, Hold, and Review labels in catalog uploads", () => {
    const result = parseCSV(
      "Product Name,SKU ID,Product URL,Status,Assignee\nChair,A,https://example.com/a,To do,\nTable,B,https://example.com/b,Hold,\nDesk,C,https://example.com/c,Review,Adnan Shaikh",
    );
    expect(result.errors).toEqual([]);
    expect(result.products.map((p) => productStatusLabel(p.status))).toEqual([
      "To do",
      "Hold",
      "Review",
    ]);
  });
});
