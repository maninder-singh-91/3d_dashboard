import { describe, expect, it } from "vitest";
import { newProduct } from "./imports";
import {
  calculateCredits,
  emptyGenerationSelection,
  generationSelectionReducer as reduce,
  selectedProducts,
} from "./generationSelection";

const products = Array.from({ length: 20 }, (_, i) => ({
  ...newProduct({
    name: `Product ${i}`,
    sku: `SKU-${i}`,
    productUrl: "https://example.com/product",
  }),
  id: `p-${i}`,
  batchId: "024",
}));
function select(count: number) {
  let state = emptyGenerationSelection;
  for (const product of products.slice(0, count))
    state = reduce(state, { type: "toggle", id: product.id, products });
  return state;
}
describe("Generation selection flow", () => {
  it("calculates credits for empty, one, five, fourteen and fifteen products", () => {
    expect([0, 1, 5, 14, 15].map(calculateCredits)).toEqual([
      0, 1.5, 7.5, 21, 22.5,
    ]);
  });
  it("caps selection at 15 even for repeated rapid reducer actions", () => {
    const state = select(20);
    expect(state.selectedProductIds).toHaveLength(15);
    expect(reduce(state, { type: "toggle", id: "p-19", products })).toBe(state);
    const removed = reduce(state, { type: "remove", id: "p-0" });
    expect(removed.selectedProductIds).toHaveLength(14);
    expect(
      reduce(removed, { type: "toggle", id: "p-19", products })
        .selectedProductIds,
    ).toHaveLength(15);
  });
  it("deduplicates SKUs across batches and synchronizes deselection", () => {
    const duplicate = {
      ...products[0],
      id: "another-batch",
      batchId: "025",
      sku: " sku-0 ",
    };
    const all = [...products, duplicate];
    let state = reduce(emptyGenerationSelection, {
      type: "toggle",
      id: "p-0",
      products: all,
    });
    state = reduce(state, { type: "toggle", id: duplicate.id, products: all });
    expect(state.selectedProductIds).toEqual([]);
    expect(
      selectedProducts(["p-0", duplicate.id, "p-0", "missing"], all).map(
        (p) => p.id,
      ),
    ).toEqual(["p-0"]);
  });
  it("preserves the exact 14 products across Proceed, open, back, and another product", () => {
    let state = reduce(select(15), { type: "remove", id: "p-3" });
    const expected = [...state.selectedProductIds];
    state = reduce(state, { type: "proceed", products });
    expect(state.batchProductIds).toEqual(expected);
    state = reduce(state, { type: "open", id: "p-2" });
    expect(state.activeProductId).toBe("p-2");
    state = reduce(state, { type: "back" });
    expect(state.batchProductIds).toEqual(expected);
    state = reduce(state, { type: "open", id: "p-4" });
    expect(state.activeProductId).toBe("p-4");
    expect(state.selectedProductIds).toEqual(expected);
  });
  it("does not submit zero products or open a product outside the generation batch", () => {
    expect(
      reduce(emptyGenerationSelection, { type: "proceed", products }),
    ).toBe(emptyGenerationSelection);
    const state = reduce(select(1), { type: "proceed", products });
    expect(reduce(state, { type: "open", id: "p-19" })).toBe(state);
  });
  it("keeps committed cards when a selection draft changes or is dismissed", () => {
    const state = reduce(select(5), { type: "proceed", products });
    const draft = reduce(state, { type: "remove", id: "p-0" });
    expect(draft.batchProductIds).toEqual(state.batchProductIds);
    expect(draft.selectedProductIds).toHaveLength(4);
  });
  it("ignores deleted products and never mutates the catalog", () => {
    const before = structuredClone(products);
    const state = reduce(select(5), {
      type: "proceed",
      products: products.slice(1),
    });
    expect(state.batchProductIds).toEqual(["p-1", "p-2", "p-3", "p-4"]);
    expect(products).toEqual(before);
  });
  it("supports genuine generation results, rejecting completed status without output", () => {
    let state = reduce(select(1), { type: "proceed", products });
    expect(state.results).toEqual({});
    expect(
      reduce(state, {
        type: "result",
        id: "p-0",
        result: { status: "Completed" },
      }),
    ).toBe(state);
    for (const status of [
      "Generating",
      "Failed",
      "Needs attention",
      "Ready",
    ] as const) {
      state = reduce(state, { type: "result", id: "p-0", result: { status } });
      expect(state.results["p-0"].status).toBe(status);
    }
    state = reduce(state, {
      type: "result",
      id: "p-0",
      result: {
        status: "Completed",
        outputUrl: "https://example.com/rendered-output.mp4",
      },
    });
    expect(state.results["p-0"].status).toBe("Completed");
  });
});
