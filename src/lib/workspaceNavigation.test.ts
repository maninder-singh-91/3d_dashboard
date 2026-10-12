import { describe, expect, it, vi } from "vitest";
import { seed } from "./seed";
import { navigationKey, restoreNavigation, loadNavigation } from "./workspaceNavigation";

describe("workspace navigation restoration", () => {
  const product = seed.products[0];
  it("restores the open product and page", () => {
    const restored = restoreNavigation(JSON.stringify({ page: "Products", selected: product.id }), seed.products);
    expect(restored.page).toBe("Products");
    expect(restored.selected).toBe(product.id);
  });
  it("falls back safely for corrupt state or a removed product", () => {
    expect(restoreNavigation("broken", seed.products).page).toBe("Dashboard");
    expect(restoreNavigation('{"page":"invalid"}', seed.products).page).toBe("Dashboard");
    expect(restoreNavigation('{"page":"Dashboard","selected":"removed"}', seed.products).selected).toBeNull();
  });
  it("restores generation workspace and flags interrupted generation", () => {
    const restored = restoreNavigation(JSON.stringify({ page: "3D Generation", generationFlow: {
      selectedProductIds: [product.id, "removed"], batchProductIds: [product.id], activeProductId: product.id,
      results: { [product.id]: { status: "Generating" } },
    } }), seed.products);
    expect(restored.generationFlow.activeProductId).toBe(product.id);
    expect(restored.generationFlow.selectedProductIds).toEqual([]);
    expect(restored.generationFlow.results[product.id].status).toBe("Needs attention");
  });
  it("keeps organisation navigation separate", () => {
    expect(navigationKey("GLAMAR")).not.toBe(navigationKey("EYEWA"));
  });
});

it("lands on 3D Assets after organisation selection while retaining the generation queue", () => {
  const product = seed.products[0];
  vi.stubGlobal("sessionStorage", { getItem: () => JSON.stringify({ page: "3D Generation", selected: product.id,
    generationFlow: { selectedProductIds: [], batchProductIds: [product.id], submittedProductIds: [product.id], activeProductId: product.id, results: { [product.id]: { status: "In Queue" } } } }) });
  try {
    const selected = loadNavigation("WestElm", seed.products, true);
    expect(selected.page).toBe("Dashboard");
    expect(selected.selected).toBeNull();
    expect(selected.generationFlow.activeProductId).toBeNull();
    expect(selected.generationFlow.batchProductIds).toEqual([product.id]);
    expect(selected.generationFlow.results[product.id].status).toBe("In Queue");
    expect(loadNavigation("WestElm", seed.products).page).toBe("3D Generation");
  } finally { vi.unstubAllGlobals(); }
});
