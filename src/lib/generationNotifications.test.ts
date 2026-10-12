import { afterEach, expect, it, vi } from "vitest";
import { completionNotifications, revisionNotifications, generationNotificationKey, loadGenerationNotifications } from "./generationNotifications";
import { newProduct } from "./imports";
afterEach(() => vi.unstubAllGlobals());
const product = newProduct({ name: "Chair", sku: "CHAIR-1" });
it("notifies once on completion and again for a distinct regeneration", () => {
  const result = { status: "Completed" as const, outputUrl: "/chair.glb", generationId: "run-1" };
  const notifications = completionNotifications({ [product.id]: { status: "Generating" } }, { [product.id]: result }, [product], [], "2026-10-12T17:00:00Z");
  expect(notifications).toHaveLength(1);
  expect(notifications[0]).toMatchObject({ productId: product.id, name: "Chair", sku: "CHAIR-1", read: false });
  expect(completionNotifications({ [product.id]: result }, { [product.id]: result }, [product], notifications)).toBe(notifications);
  expect(completionNotifications({ [product.id]: result }, { [product.id]: { ...result, generationId: "run-2" } }, [product], notifications)).toHaveLength(2);
});
it("ignores queued, running, failed and incomplete outputs", () => {
  for (const status of ["In Queue", "Generating", "Ready", "Failed", "Completed"] as const) {
    expect(completionNotifications({}, { [product.id]: { status } }, [product], [])).toEqual([]);
  }
});
it("loads notifications only from the selected organisation", () => {
  const notification = completionNotifications({}, { [product.id]: { status: "Completed", outputUrl: "/chair.glb", generationId: "run-1" } }, [product], []);
  vi.stubGlobal("localStorage", { getItem: (key: string) => key === generationNotificationKey("WestElm") ? JSON.stringify(notification) : null });
  expect(loadGenerationNotifications("WestElm")).toEqual(notification);
  expect(loadGenerationNotifications("Other")).toEqual([]);
});

it("notifies on a new revision comment once and preserves generation updates", () => {
  const before = { ...product, reviewCycleCount: 1, revisionComment: "" };
  const after = { ...before, revisionComment: "Fix the texture", updatedAt: "2026-10-12T17:30:00Z" };
  const existing = completionNotifications({}, { [product.id]: { status: "Completed", outputUrl: "/chair.glb", generationId: "run-1" } }, [product], []);
  const notifications = revisionNotifications([before], [after], existing);
  expect(notifications).toHaveLength(2);
  expect(notifications[0]).toMatchObject({ kind: "revision", name: "Chair", comment: "Fix the texture", cycle: 1, read: false });
  expect(revisionNotifications([after], [{ ...after, updatedAt: "later" }], notifications)).toBe(notifications);
  expect(revisionNotifications([before], [after], notifications)).toBe(notifications);
});
it("does not notify for a cleared or unchanged revision comment", () => {
  const commented = { ...product, revisionComment: "Fix the shape", reviewCycleCount: 1 };
  expect(revisionNotifications([commented], [commented], [])).toEqual([]);
  expect(revisionNotifications([commented], [{ ...commented, revisionComment: "" }], [])).toEqual([]);
});
