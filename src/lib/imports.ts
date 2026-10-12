import Papa from "papaparse";
import type { Product, Status } from "./types";
import { statuses } from "./types";
import { team } from "./seed";
import { validUrl } from "./workflow";
import { requiresUnpublished } from "./productStatus";
export function newProduct(values: Partial<Product>): Product {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Untitled product",
    sku: `NEW-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    category: "Chairs",
    brand: "Unspecified",
    productUrl: "",
    imageUrl: "",
    status: "Available",
    assigneeId: null,
    batchId: "024",
    reviewStatus: "Not submitted",
    reviewComment: "",
    reviewCycleCount: ["In Review", "Submitted"].includes(values.status || "") ? 1 : 0,
    modelUrl: "",
    createdAt: now,
    updatedAt: now,
    claimedAt: null,
    submittedAt: null,
    approvedAt: null,
    priority: "Normal",
    difficulty: "Standard",
    checklist: Array(10).fill(false),
    activity: [{ text: "Product imported and made available.", at: now }],
    ...values,
    consoleStatus: requiresUnpublished(values.status || "Available") ? "Draft" : values.consoleStatus || "Draft",
  };
}
// Replace this adapter with a server-side extraction service when connected.
export async function extractProduct(url: string): Promise<Product> {
  if (!validUrl(url)) throw Error("Use a valid HTTP or HTTPS product URL.");
  const parsed = new URL(url);
  const slug = decodeURIComponent(
    parsed.pathname.split("/").filter(Boolean).pop() || "New product",
  );
  return newProduct({
    productUrl: url,
    name: slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    brand: parsed.hostname.replace(/^www\./, "").split(".")[0],
  });
}
export function parseCSV(
  text: string,
  options: { demo?: boolean } = {},
): {
  products: Product[];
  errors: string[];
} {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
  });
  const errors = result.errors.map((e) => `CSV: ${e.message}`);
  const products: Product[] = [];
  for (const [i, r] of result.data.entries()) {
    const row = i + 2;
    const rawStatus = r.Status?.trim() || "Available";
    const status = (
      rawStatus === "To do"
        ? "Available"
        : rawStatus === "Hold"
          ? "On Hold"
          : rawStatus === "Review"
            ? "In Review"
            : rawStatus === "Done"
              ? "Completed"
              : rawStatus
    ) as Status;
    const assignee = r.Assignee?.trim();
    const member = assignee
      ? team.find((t) => t.name.toLowerCase() === assignee.toLowerCase())
      : undefined;
    const source = (r["Product URL"] || "").trim();
    const url = source.startsWith("www.") ? `https://${source}` : source;
    const sku = r["SKU ID"] || r["SKU Id"] || "";
    if (!r["Product Name"]?.trim())
      errors.push(`Row ${row}: Product Name is required.`);
    if (!sku) errors.push(`Row ${row}: SKU ID is required.`);
    if ((!options.demo || url) && !validUrl(url))
      errors.push(`Row ${row}: Invalid Product URL.`);
    if (!statuses.includes(status))
      errors.push(`Row ${row}: Unknown status “${rawStatus}”.`);
    if (assignee && !member)
      errors.push(`Row ${row}: Unknown assignee “${assignee}”.`);
    if (status === "Available" && member)
      errors.push(`Row ${row}: Available products cannot have an assignee.`);
    if (
      [
        "Claimed",
        "In Progress",
        "Submitted",
        "In Review",
        "Corrections Required",
        "Approved",
        "Completed",
      ].includes(status) &&
      !member
    )
      errors.push(`Row ${row}: ${status} requires an assignee.`);
    for (const key of ["Product Image URL", "3D Model URL"])
      if (r[key] && !validUrl(r[key]))
        errors.push(`Row ${row}: Invalid ${key}.`);
    products.push(
      newProduct({
        name: r["Product Name"] || "",
        sku,
        category: r["Product Category"] || "Other",
        brand: r.Brand || "Unspecified",
        productUrl: url,
        imageUrl:
          r["Product Image URL"] ||
          (options.demo
            ? /glasses|frames|eyewear/i.test(r["Product Category"] || "")
              ? `/images/demo-eyewear/${/sunglasses/i.test(r["Product Category"] || "") ? "sun" : "optical"}-${i % 3}.svg`
              : `/images/product-${i % 5}.jpg`
            : ""),
        ...(options.demo ? { isDemo: true } : {}),
        status,
        assigneeId: member?.id || null,
        batchId: r["Batch No"]?.trim() || "024",
        reviewStatus: r["Review Status"] || "Not submitted",
        modelUrl: r["3D Model URL"] || "",
        claimedAt: member ? new Date().toISOString() : null,
      }),
    );
  }
  const seen = new Set<string>();
  for (const p of products) {
    if (seen.has(p.sku)) errors.push(`Duplicate SKU ${p.sku} in this file.`);
    seen.add(p.sku);
  }
  return { products, errors };
}
