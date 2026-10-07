import { parseCSV } from "./imports";
import { seed } from "./seed";

// Demo uploads only read bytes for progress; their contents are never parsed.
export async function prepareDemoCatalog(
  file: File,
  onProgress?: (progress: CatalogFileProgress) => void,
) {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name))
    throw Error("Choose a CSV or Excel file (.csv, .xlsx, .xls).");
  if (file.size > 5 * 1024 * 1024)
    throw Error("Choose a file smaller than 5 MB.");
  await readCatalogBytes(file, onProgress);
  const now = new Date().toISOString();
  return structuredClone(seed.products).map((product, index) => ({
    ...product,
    id: crypto.randomUUID(),
    isDemo: true,
    imageUrl: product.imageUrl || `/images/product-${index % 5}.jpg`,
    createdAt: now,
    updatedAt: now,
  }));
}

export type CatalogFileProgress =
  { phase: "reading"; percent: number } | { phase: "processing" };

async function readCatalogBytes(
  file: File,
  onProgress?: (progress: CatalogFileProgress) => void,
) {
  const bytes = new Uint8Array(file.size);
  const chunkSize = 256 * 1024;
  onProgress?.({ phase: "reading", percent: 0 });
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunk = new Uint8Array(
      await file.slice(offset, offset + chunkSize).arrayBuffer(),
    );
    bytes.set(chunk, offset);
    onProgress?.({
      phase: "reading",
      percent: Math.round(((offset + chunk.length) / file.size) * 100),
    });
  }
  onProgress?.({ phase: "processing" });
  // Let the interface paint before synchronous workbook parsing starts.
  if (onProgress) await new Promise((resolve) => setTimeout(resolve, 0));
  return bytes;
}

export async function parseCatalogFile(
  file: File,
  options: {
    demo?: boolean;
    onProgress?: (progress: CatalogFileProgress) => void;
  } = {},
) {
  const extension = file.name.toLowerCase().split(".").pop();
  if (!["csv", "xlsx", "xls"].includes(extension || ""))
    throw Error("Choose a CSV or Excel file (.csv, .xlsx, .xls).");
  if (file.size > 5 * 1024 * 1024)
    throw Error("Choose a file smaller than 5 MB.");
  const bytes = await readCatalogBytes(file, options.onProgress);
  if (extension === "csv")
    return parseCSV(new TextDecoder().decode(bytes), options);

  const { read, utils } = await import("xlsx");
  let workbook;
  try {
    workbook = read(bytes, { type: "array" });
  } catch {
    throw Error("This Excel file could not be read. Save it again and retry.");
  }
  // Read the first populated worksheet, preserving displayed SKU formatting.
  const sheet = workbook.SheetNames.map((name) => workbook.Sheets[name]).find(
    (sheet) =>
      utils
        .sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })
        .some((row) =>
          row.some(
            (cell) =>
              cell !== null && cell !== undefined && String(cell).trim() !== "",
          ),
        ),
  );
  if (!sheet) throw Error("This Excel file has no products.");
  return parseCSV(utils.sheet_to_csv(sheet), options);
}
