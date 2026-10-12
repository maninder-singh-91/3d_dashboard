import type { Product } from "./types";

export const MAX_GENERATION_PRODUCTS = 15;
export const CREDITS_PER_PRODUCT = 1.5;
export type GenerationProductStatus =
  "In Queue" | "Ready" | "Generating" | "Completed" | "Failed" | "Needs attention";
export type GenerationResult = {
  status: GenerationProductStatus;
  outputUrl?: string;
  message?: string;
  progress?: number;
  generationId?: string;
};
export function generationDisplayStatus(result: GenerationResult | undefined, index: number) {
  if (result) return result.status === "Generating" ? "In progress" : result.status;
  return ["In Queue", "In progress", "Ready"][Math.max(0, index) % 3];
}
export function generationDisplayProgress(result: GenerationResult | undefined, index: number) {
  if (!result) return Math.max(0, index) % 3 === 1 ? 45 : undefined;
  return result.status === "Generating" && typeof result.progress === "number" && Number.isFinite(result.progress)
    ? Math.max(0, Math.min(100, result.progress)) : undefined;
}
export type GenerationSelectionState = {
  selectedProductIds: string[];
  batchProductIds: string[];
  submittedProductIds?: string[];
  activeProductId: string | null;
  results: Record<string, GenerationResult>;
};
export const emptyGenerationSelection: GenerationSelectionState = {
  selectedProductIds: [],
  batchProductIds: [],
  submittedProductIds: [],
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
  | { type: "begin-selection" }
  | { type: "single"; id: string; products: readonly Product[] }
  | { type: "toggle"; id: string; products: readonly Product[] }
  | { type: "remove"; id: string }
  | { type: "proceed"; products: readonly Product[] }
  | { type: "open"; id: string }
  | { type: "back" }
  | { type: "cancel"; id: string }
  | { type: "result"; id: string; result: GenerationResult };
export function generationSelectionReducer(
  state: GenerationSelectionState,
  action: GenerationSelectionAction,
): GenerationSelectionState {
  switch (action.type) {
    case "begin-selection":
      return { ...state, selectedProductIds: [] };
    case "single":
      return action.products.some((p) => p.id === action.id)
        ? { ...state, selectedProductIds: [], batchProductIds: [action.id], submittedProductIds: [...new Set([...(state.submittedProductIds || []), ...state.batchProductIds, action.id])], activeProductId: action.id, results: { ...state.results, [action.id]: { status: "In Queue" } } }
        : state;
    case "toggle": {
      const submitted = new Set([...(state.submittedProductIds || []), ...state.batchProductIds]);
      if (submitted.has(action.id)) return state;
      const product = action.products.find((p) => p.id === action.id);
      if (!product) return state;
      const selected = selectedProducts(
        state.selectedProductIds,
        action.products.filter((p) => !submitted.has(p.id)),
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
      const submitted = new Set([...(state.submittedProductIds || []), ...state.batchProductIds]);
      const ids = selectedProducts(
        state.selectedProductIds,
        action.products.filter((p) => !submitted.has(p.id)),
      ).map((p) => p.id);
      if (!ids.length) return state;
      return {
        ...state,
        selectedProductIds: [],
        batchProductIds: [...ids],
        submittedProductIds: [...new Set([...submitted, ...ids])],
        activeProductId: null,
      };
    }
    case "open":
      return state.batchProductIds.includes(action.id)
        ? { ...state, activeProductId: action.id }
        : state;
    case "back":
      return { ...state, activeProductId: null };
    case "cancel": {
      const index = state.batchProductIds.indexOf(action.id);
      if (index < 0 || generationDisplayStatus(state.results[action.id], index) !== "In Queue") return state;
      const results = { ...state.results };
      state.batchProductIds.forEach((id, index) => {
        if (id !== action.id && !results[id]) {
          const status = generationDisplayStatus(undefined, index);
          results[id] = { status: status === "In progress" ? "Generating" : status === "In Queue" ? "In Queue" : "Ready" };
        }
      });
      delete results[action.id];
      return { ...state, results, batchProductIds: state.batchProductIds.filter(id => id !== action.id),
        submittedProductIds: (state.submittedProductIds || []).filter(id => id !== action.id),
        activeProductId: state.activeProductId === action.id ? null : state.activeProductId };
    }
    case "result": {
      if (!state.batchProductIds.includes(action.id)) return state;
      // A completed status must be backed by a real output from a renderer.
      if (action.result.status === "Completed" && !action.result.outputUrl)
        return state;
      const old = state.results[action.id];
      if (
        old?.status === action.result.status &&
        old?.message === action.result.message &&
        old?.progress === action.result.progress &&
        old?.generationId === action.result.generationId &&
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
