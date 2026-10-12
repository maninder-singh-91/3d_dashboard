import type { GenerationResult } from "./generationSelection";
import type { Product } from "./types";
import { reviewCycleCount } from "./revisions";
export type GenerationNotification = { id: string; productId: string; name: string; sku: string; createdAt: string; read: boolean;
  kind?: "generation" | "revision"; cycle?: number; comment?: string };
export const generationNotificationKey = (organisation: string) => `glamar.generation-notifications.${encodeURIComponent(organisation)}`;
export function loadGenerationNotifications(organisation: string): GenerationNotification[] {
  try {
    const saved = JSON.parse(localStorage.getItem(generationNotificationKey(organisation)) || "[]");
    return Array.isArray(saved) ? saved.filter(item => item && typeof item.id === "string" && typeof item.productId === "string" && typeof item.name === "string" && typeof item.createdAt === "string").slice(0, 100) : [];
  } catch { return []; }
}
export function completionNotifications(previous: Record<string, GenerationResult>, current: Record<string, GenerationResult>, products: Product[], existing: GenerationNotification[], now = new Date().toISOString()) {
  const additions: GenerationNotification[] = [];
  for (const [productId, result] of Object.entries(current)) {
    if (result.status !== "Completed" || !result.outputUrl) continue;
    const old = previous[productId];
    if (old?.status === "Completed" && old.generationId === result.generationId && old.outputUrl === result.outputUrl) continue;
    const product = products.find(product => product.id === productId);
    if (!product) continue;
    const id = `${productId}:${result.generationId || now}`;
    if (existing.some(item => item.id === id)) continue;
    additions.push({ id, productId, name: product.name, sku: product.sku, createdAt: now, read: false });
  }
  return additions.length ? [...additions, ...existing].slice(0, 100) : existing;
}
export function revisionNotifications(previous: Product[], current: Product[], existing: GenerationNotification[], now = new Date().toISOString()) {
  const additions: GenerationNotification[] = [];
  for (const product of current) {
    const comment = product.revisionComment?.trim();
    if (!comment) continue;
    const cycle = reviewCycleCount(product);
    const old = previous.find(item => item.id === product.id);
    if (old?.revisionComment?.trim() === comment && reviewCycleCount(old) === cycle) continue;
    const id = `${product.id}:revision:${cycle}:${product.updatedAt}`;
    if (existing.some(item => item.id === id)) continue;
    additions.push({ id, kind: "revision", productId: product.id, name: product.name, sku: product.sku,
      createdAt: now, read: false, cycle, comment });
  }
  return additions.length ? [...additions, ...existing].slice(0, 100) : existing;
}
