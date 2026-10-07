import { describe, it, expect } from "vitest";
import { transition } from "./workflow";
import { newProduct, parseCSV } from "./imports";
import type { ProductDetails } from "./types";
const product = () =>
  newProduct({
    name: "Test Chair",
    sku: "TEST-1",
    productUrl: "https://example.com/chair",
  });
describe("Production lifecycle", () => {
  it("prevents returning to To do through status changes or unassignment", () => {
    for (const status of ["Claimed", "In Progress", "Corrections Required", "Submitted", "In Review", "On Hold", "Approved", "Completed"] as const) {
      const p = { ...product(), status, assigneeId: "artist" };
      expect(() => transition(p, { type: "catalog-status", status: "Available" }, "manager", "Admin / Manager")).toThrow("cannot return to To do");
      expect(() => transition(p, { type: "status", status: "Available" }, "manager", "Admin / Manager")).toThrow();
      expect(() => transition(p, { type: "assign", assigneeId: null }, "manager", "Admin / Manager")).toThrow();
    }
    const started = transition(product(), { type: "catalog-status", status: "In Progress" }, "manager", "Admin / Manager");
    expect(started.status).toBe("In Progress");
    expect(transition(started, { type: "catalog-status", status: "On Hold" }, "manager", "Admin / Manager").status).toBe("On Hold");
  });
  it("saves revision comments in every non-To do state without changing workflow or hold notes", () => {
    for (const status of ["Claimed", "In Progress", "Corrections Required", "Submitted", "In Review", "On Hold", "Approved", "Completed"] as const) {
      const p = { ...product(), status, assigneeId: "artist", holdReason: "Waiting for images", reviewComment: "Original review" };
      const next = transition(p, { type: "revision-comment", comment: "  Adjust the texture.  " }, "artist", "3D Artist");
      expect(next.revisionComment).toBe("Adjust the texture.");
      expect(next.status).toBe(status);
      expect(next.holdReason).toBe(p.holdReason);
      expect(next.reviewComment).toBe(p.reviewComment);
      expect(transition(next, { type: "revision-comment", comment: "" }, "reviewer", "Reviewer").revisionComment).toBe("");
    }
  });
  it("rejects revision comments for To do, unrelated artists, and oversized input", () => {
    const action = { type: "revision-comment" as const, comment: "Fix scale" };
    for (const status of ["New", "Available"] as const)
      expect(() => transition({ ...product(), status }, action, "manager", "Admin / Manager")).toThrow("To do");
    const p = { ...product(), status: "In Review" as const, assigneeId: "artist" };
    expect(() => transition(p, action, "other", "3D Artist")).toThrow("assigned artist");
    expect(() => transition(p, { ...action, comment: "a".repeat(2001) }, "manager", "Admin / Manager")).toThrow("2,000");
  });
  it("persists removal of catalog thumbnails without changing product details", () => {
    const p = { ...product(), status: "Available" as const };
    const next = transition(
      p,
      { type: "remove-reference", url: "/images/reference.jpg" },
      "adnan",
      "3D Artist",
    );
    expect(next.hiddenReferenceUrls).toEqual(["/images/reference.jpg"]);
    expect(next.imageUrl).toBe(p.imageUrl);
    expect(next.status).toBe(p.status);
    expect(
      transition(
        next,
        { type: "remove-reference", url: "/images/reference.jpg" },
        "adnan",
        "3D Artist",
      ).hiddenReferenceUrls,
    ).toHaveLength(1);
    expect(() =>
      transition(
        { ...p, assigneeId: "other" },
        { type: "remove-reference", url: "/images/reference.jpg" },
        "adnan",
        "3D Artist",
      ),
    ).toThrow("cannot remove");
  });
  it("removes a review model without deleting the product or changing its status", () => {
    const p = {
      ...product(),
      status: "In Review" as const,
      assigneeId: "adnan",
      modelUrl: "https://example.com/chair.glb",
    };
    const next = transition(p, { type: "remove-model" }, "riya", "Reviewer");
    expect(next.modelUrl).toBe("");
    expect(next.id).toBe(p.id);
    expect(next.status).toBe(p.status);
    expect(next.assigneeId).toBe(p.assigneeId);
    expect(next.imageUrl).toBe(p.imageUrl);
    expect(p.modelUrl).toBe("https://example.com/chair.glb");
    expect(next.activity[0].text).toBe("3D model removed from review.");
    expect(() =>
      transition(p, { type: "remove-model" }, "other", "3D Artist"),
    ).toThrow("assigned artist");
    expect(() =>
      transition(
        { ...p, status: "Completed" },
        { type: "remove-model" },
        "maninder",
        "Admin / Manager",
      ),
    ).toThrow("in review");
  });
  it("limits catalog status edits to managers and the task artist", () => {
    const p = transition(product(), { type: "claim" }, "adnan", "3D Artist");
    expect(() =>
      transition(
        p,
        { type: "catalog-status", status: "Completed" },
        "maninder",
        "3D Artist",
      ),
    ).toThrow();
    expect(() =>
      transition(
        p,
        { type: "catalog-status", status: "On Hold" },
        "riya",
        "Reviewer",
      ),
    ).toThrow();
    expect(
      transition(
        p,
        { type: "catalog-status", status: "On Hold" },
        "adnan",
        "3D Artist",
      ).status,
    ).toBe("On Hold");
  });
  it("saves specifications without changing model or production state, and validates edits", () => {
    const p = transition(product(), { type: "claim" }, "maninder", "3D Artist");
    const details: ProductDetails = {
      name: p.name,
      brand: "Test brand",
      category: "Chairs",
      productUrl: p.productUrl,
      specifications: {
        barcode: "123",
        storefront: "",
        length: "80",
        width: "60",
        height: "90",
        unit: "cm",
        color: "Sand",
        weight: "12",
        usageArea: "Indoor",
        roomType: "Living room",
        material: "Wood",
        price: "500",
        currency: "INR",
      },
    };
    const next = transition(
      p,
      { type: "details", details },
      "maninder",
      "3D Artist",
    );
    expect(next.specifications?.length).toBe("80");
    expect(next.modelUrl).toBe(p.modelUrl);
    expect(next.status).toBe(p.status);
    expect(next.assigneeId).toBe(p.assigneeId);
    expect(() =>
      transition(p, { type: "details", details }, "adnan", "3D Artist"),
    ).toThrow();
    expect(() =>
      transition(p, { type: "details", details }, "maninder", "Reviewer"),
    ).toThrow();
    expect(() =>
      transition(
        p,
        {
          type: "details",
          details: {
            ...details,
            specifications: { ...details.specifications, length: "-1" },
          },
        },
        "maninder",
        "Admin / Manager",
      ),
    ).toThrow("positive");
    expect(() =>
      transition(
        p,
        {
          type: "details",
          details: { ...details, productUrl: "javascript:alert(1)" },
        },
        "maninder",
        "Admin / Manager",
      ),
    ).toThrow("URL");
  });
  it("completes claim → production → review → correction → resubmit → approval", () => {
    let p = product();
    p = transition(p, { type: "claim" }, "maninder", "3D Artist");
    expect(p.status).toBe("In Progress");
    expect(p.assigneeId).toBe("maninder");
    expect(p.claimedAt).toBeTruthy();
    p = transition(
      p,
      {
        type: "save",
        modelUrl: "https://example.com/chair.glb",
        checklist: Array(10).fill(true),
      },
      "maninder",
      "3D Artist",
    );
    p = transition(p, { type: "submit" }, "maninder", "3D Artist");
    expect(p.status).toBe("In Review");
    p = transition(
      p,
      { type: "correct", comment: "Fix cushion thickness." },
      "riya",
      "Reviewer",
    );
    expect(p.reviewComment).toBe("Fix cushion thickness.");
    expect(p.status).toBe("Corrections Required");
    p = transition(p, { type: "submit" }, "maninder", "3D Artist");
    p = transition(p, { type: "approve" }, "riya", "Reviewer");
    expect(p.status).toBe("Completed");
    expect(p.reviewStatus).toBe("Approved");
    expect(p.approvedAt).toBeTruthy();
    expect(p.activity[0].text).toContain("completed");
  });
  it("rejects a second claimant and preserves ownership", () => {
    const p = transition(product(), { type: "claim" }, "adnan", "3D Artist");
    expect(() =>
      transition(p, { type: "claim" }, "maninder", "3D Artist"),
    ).toThrow("already been claimed");
    expect(p.assigneeId).toBe("adnan");
  });
  it("requires a model URL, checklist, and non-empty correction comment", () => {
    let p = transition(product(), { type: "claim" }, "maninder", "3D Artist");
    expect(() =>
      transition(p, { type: "submit" }, "maninder", "3D Artist"),
    ).toThrow("GLB URL");
    p = transition(
      p,
      { type: "save", modelUrl: "https://example.com/a.glb" },
      "maninder",
      "3D Artist",
    );
    expect(() =>
      transition(p, { type: "submit" }, "maninder", "3D Artist"),
    ).toThrow("checklist");
    p = transition(
      p,
      { type: "save", checklist: Array(10).fill(true) },
      "maninder",
      "3D Artist",
    );
    p = transition(p, { type: "submit" }, "maninder", "3D Artist");
    expect(() =>
      transition(p, { type: "correct", comment: "  " }, "riya", "Reviewer"),
    ).toThrow("comment");
  });
  it("blocks artists from approving, reviewers from claiming, and other artists from editing", () => {
    expect(() =>
      transition(product(), { type: "claim" }, "riya", "Reviewer"),
    ).toThrow();
    const p = transition(product(), { type: "claim" }, "maninder", "3D Artist");
    expect(() =>
      transition(
        p,
        { type: "save", modelUrl: "https://example.com/a.glb" },
        "adnan",
        "3D Artist",
      ),
    ).toThrow();
    expect(() =>
      transition(
        { ...p, status: "In Review" },
        { type: "approve" },
        "maninder",
        "3D Artist",
      ),
    ).toThrow();
  });
  it("does not reopen completed tasks through reassignment or status edits", () => {
    const p = { ...product(), status: "Completed" as const };
    expect(() =>
      transition(
        p,
        { type: "assign", assigneeId: "adnan" },
        "maninder",
        "Admin / Manager",
      ),
    ).toThrow();
    expect(() =>
      transition(
        p,
        { type: "status", status: "Available" },
        "maninder",
        "Admin / Manager",
      ),
    ).toThrow();
  });
  it("keeps reviewers read-only even when they are the assigned user", () => {
    const p = transition(product(), { type: "claim" }, "maninder", "3D Artist");
    expect(() =>
      transition(
        p,
        { type: "save", checklist: Array(10).fill(true) },
        "maninder",
        "Reviewer",
      ),
    ).toThrow();
    expect(() =>
      transition(
        {
          ...p,
          modelUrl: "https://example.com/a.glb",
          checklist: Array(10).fill(true),
        },
        { type: "submit" },
        "maninder",
        "Reviewer",
      ),
    ).toThrow();
  });
  it("validates URL schemes", () => {
    const p = transition(product(), { type: "claim" }, "maninder", "3D Artist");
    expect(() =>
      transition(
        p,
        { type: "save", modelUrl: "javascript:alert(1)" },
        "maninder",
        "3D Artist",
      ),
    ).toThrow("valid");
  });
});
describe("CSV import", () => {
  it("preserves quoted fields and maps the supplied sheet headers", () => {
    const { products, errors } = parseCSV(
      'Product Category,SKU Id,Product Name,Product URL,Status,Assignee,Batch No\nChairs,100,"Chair, Sand",www.example.com/chair,Done,Maninder Singh,024',
    );
    expect(errors).toEqual([]);
    expect(products[0].name).toBe("Chair, Sand");
    expect(products[0].status).toBe("Completed");
    expect(products[0].assigneeId).toBe("maninder");
    expect(products[0].productUrl).toBe("https://www.example.com/chair");
  });
  it("rejects missing names, bad URLs, duplicates, and unknown statuses", () => {
    const { errors } = parseCSV(
      "Product Name,SKU ID,Product URL,Status\n,100,javascript:alert(1),Invalid\nChair,100,https://example.com,Available",
    );
    expect(errors.join(" ")).toMatch(/Product Name/);
    expect(errors.join(" ")).toMatch(/Invalid Product URL/);
    expect(errors.join(" ")).toMatch(/Unknown status/);
    expect(errors.join(" ")).toMatch(/Duplicate SKU/);
  });
  it("requires known assignees for active imported tasks", () => {
    expect(
      parseCSV(
        "Product Name,SKU ID,Product URL,Status,Assignee\nChair,100,https://example.com,In Progress,Unknown",
      ).errors.join(" "),
    ).toMatch(/Unknown assignee/);
  });
});
