import type { Product } from "./types";

export const MAX_GENERATION_PRODUCTS = 15;
export const CREDITS_PER_PRODUCT = 1.5;
export type GenerationProductStatus =
  "Ready" | "Generating" | "Completed" | "Failed" | "Needs attention";
export type GenerationResult = {
  status: GenerationProductStatus;
  outputUrl?: string;
  message?: string;
};
export type GenerationSelectionState = {
  selectedProductIds: string[];
  batchProductIds: string[];
  activeProductId: string | null;
  results: Record<string, GenerationResult>;
};
export const emptyGenerationSelection: GenerationSelectionState = {
  selectedProductIds: [],
  batchProductIds: [],
  activeProductId: null,
  results: {},
};
export function skuIdentity(product: Pick<Product, "id" | "sku">) {
  return product.sku.trim().toLowerCase() || product.id;
}
export function calculateCredits(count: number) {
  return count * CREDITS_PER_PRODUCT;
}
export function selectedProducts(
  ids: readonly string[],
  products: readonly Product[],
): Product[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const seen = new Set<string>();
  return ids
    .flatMap((id) => {
      const product = byId.get(id);
      if (!product || seen.has(skuIdentity(product))) return [];
      seen.add(skuIdentity(product));
      return [product];
    })
    .slice(0, MAX_GENERATION_PRODUCTS);
}
export type GenerationSelectionAction =
  | { type: "toggle"; id: string; products: readonly Product[] }
  | { type: "remove"; id: string }
  | { type: "proceed"; products: readonly Product[] }
  | { type: "open"; id: string }
  | { type: "back" }
  | { type: "result"; id: string; result: GenerationResult };
export function generationSelectionReducer(
  state: GenerationSelectionState,
  action: GenerationSelectionAction,
): GenerationSelectionState {
  switch (action.type) {
    case "toggle": {
      const product = action.products.find((p) => p.id === action.id);
      if (!product) return state;
      const selected = selectedProducts(
        state.selectedProductIds,
        action.products,
      );
      const existing = selected.find(
        (p) => skuIdentity(p) === skuIdentity(product),
      );
      if (!existing && selected.length >= MAX_GENERATION_PRODUCTS) return state;
      return {
        ...state,
        selectedProductIds: existing
          ? selected.filter((p) => p.id !== existing.id).map((p) => p.id)
          : [...selected.map((p) => p.id), product.id],
      };
    }
    case "remove":
      return {
        ...state,
        selectedProductIds: state.selectedProductIds.filter(
          (id) => id !== action.id,
        ),
      };
    case "proceed": {
      const ids = selectedProducts(
        state.selectedProductIds,
        action.products,
      ).map((p) => p.id);
      if (!ids.length) return state;
      return {
        ...state,
        selectedProductIds: ids,
        batchProductIds: [...ids],
        activeProductId: null,
      };
    }
    case "open":
      return state.batchProductIds.includes(action.id)
        ? { ...state, activeProductId: action.id }
        : state;
    case "back":
      return { ...state, activeProductId: null };
    case "result": {
      if (!state.batchProductIds.includes(action.id)) return state;
      // A completed status must be backed by a real output from a renderer.
      if (action.result.status === "Completed" && !action.result.outputUrl)
        return state;
      const old = state.results[action.id];
      if (
        old?.status === action.result.status &&
        old?.message === action.result.message &&
        old?.outputUrl === action.result.outputUrl
      )
        return state;
      return {
        ...state,
        results: { ...state.results, [action.id]: action.result },
      };
    }
  }
}
