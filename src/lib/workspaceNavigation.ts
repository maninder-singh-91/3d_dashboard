import { emptyGenerationSelection, selectedProducts, type GenerationSelectionState } from "./generationSelection";
import type { Product } from "./types";

const pages = ["Dashboard", "3D Generation", "Products", "Batch Render", "My Tasks", "Unassigned", "In Review", "Completed", "Team", "Reports", "Settings", "Batches"] as const;
export type Page = typeof pages[number];
export type WorkspaceNavigation = { page: Page; selected: string | null; generationFlow: GenerationSelectionState };
export const navigationKey = (organisation: string) => `glamar.navigation.${encodeURIComponent(organisation)}`;
export function restoreNavigation(raw: string | null, products: Product[]): WorkspaceNavigation {
  const fallback: WorkspaceNavigation = { page: "Dashboard", selected: null, generationFlow: emptyGenerationSelection };
  try {
    const saved = JSON.parse(raw || "null");
    if (!saved || !pages.includes(saved.page)) return fallback;
    const ids = (value: unknown) => selectedProducts(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [], products).map(p => p.id);
    const flow = saved.generationFlow;
    const batchProductIds = ids(flow?.batchProductIds);
    const submittedProductIds = [...new Set([...(Array.isArray(flow?.submittedProductIds) ? flow.submittedProductIds.filter((id: unknown) => typeof id === "string" && products.some((p) => p.id === id)) : []), ...batchProductIds])] as string[];
    const results: GenerationSelectionState["results"] = {};
    for (const id of batchProductIds) {
      const result = flow?.results?.[id];
      if (!result) continue;
      if (result.status === "Generating") results[id] = { status: "Needs attention", message: "Generation was interrupted by a refresh. Please start it again." };
      else if (["In Queue", "Ready", "Failed", "Needs attention"].includes(result.status) || (result.status === "Completed" && typeof result.outputUrl === "string" && result.outputUrl)) results[id] = result;
    }
    return {
      page: saved.page,
      selected: products.some(p => p.id === saved.selected) ? saved.selected : null,
      generationFlow: {
        selectedProductIds: ids(flow?.selectedProductIds).filter((id) => !submittedProductIds.includes(id)),
        batchProductIds,
        submittedProductIds,
        activeProductId: batchProductIds.includes(flow?.activeProductId) ? flow.activeProductId : null,
        results,
      },
    };
  } catch { return fallback; }
}
export function loadNavigation(organisation: string, products: Product[], startOnAssets = false) {
  let navigation: WorkspaceNavigation;
  try { navigation = restoreNavigation(sessionStorage.getItem(navigationKey(organisation)), products); }
  catch { navigation = restoreNavigation(null, products); }
  return startOnAssets ? { ...navigation, page: "Dashboard" as const, selected: null,
    generationFlow: { ...navigation.generationFlow, activeProductId: null } } : navigation;
}
