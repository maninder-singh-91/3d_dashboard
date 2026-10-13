import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GenerationSelectionModal from "./GenerationSelectionModal";
import { newProduct } from "../lib/imports";
import { defaultModelGenerationSettings } from "../lib/modelGenerationSettings";

it("does not show stale selections or enable generation before a batch is chosen", () => {
  const product = { ...newProduct({ name: "Previous selection", sku: "OLD-SKU" }), batchId: "024" };
  const props = {
    products: [product], batches: [], selected: [product], query: "",
    settings: defaultModelGenerationSettings, onBatch: () => {}, onQuery: () => {},
    onToggle: () => {}, onRemove: () => {}, onClose: () => {}, onProceed: () => {}, onSettingsChange: () => {},
  };
  const withoutBatch = renderToStaticMarkup(<GenerationSelectionModal {...props} batch="" />);
  expect(withoutBatch).not.toContain('aria-label="Added products"');
  expect(withoutBatch).not.toContain("Previous selection");
  expect(withoutBatch).toContain("0 products");
  expect(withoutBatch).toContain('class="button primary" disabled=""');
  const wrongBatch = renderToStaticMarkup(<GenerationSelectionModal {...props} batch="025" />);
  expect(wrongBatch).not.toContain("Previous selection");
  expect(wrongBatch).toContain('class="button primary" disabled=""');
  const queued = renderToStaticMarkup(<GenerationSelectionModal {...props} batch="024" alreadyQueued />);
  expect(queued).not.toContain('class="button primary"');
  const withBatch = renderToStaticMarkup(<GenerationSelectionModal {...props} batch="024" />);
  expect(withBatch).toContain('aria-label="Added products"');
  expect(withBatch).toContain("Previous selection");
  expect(withBatch).toContain('class="button primary" disabled=""');
  expect(withBatch).toContain("Add length, width, height and dimension unit");
});
