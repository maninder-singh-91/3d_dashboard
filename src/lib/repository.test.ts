import { beforeEach, describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ManualProductUpload from "../components/ManualProductUpload";
import { newProduct } from "./imports";
import { productSpecificationsOf } from "./productSpecifications";
import { repository } from "./repository";
import { prepareDemoCatalog } from "./catalogFile";
import { productStatusLabel } from "./productStatus";
let queue = Promise.resolve();
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  const session = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => session.get(k) || null,
    setItem: (k: string, v: string) => session.set(k, v),
  });
  vi.stubGlobal("window", { dispatchEvent: () => true });
  queue = Promise.resolve();
  vi.stubGlobal("navigator", {
    locks: {
      request: (_key: string, fn: () => void) => {
        const run = queue.then(fn);
        queue = run.catch(() => {});
        return run;
      },
    },
  });
});
describe("Repository concurrency", () => {
  it("starts Eyewa fresh once, backs up its demo data, and retains subsequent imports", async () => {
    const glamar = repository.read();
    const key = "modello.workspace.v1.org.Eyewa";
    const previous = JSON.stringify(glamar);
    localStorage.setItem(key, previous);
    localStorage.setItem("glamar.generation-notifications.Eyewa", '[{"id":"old"}]');
    sessionStorage.setItem("glamar.navigation.Eyewa", '{"page":"3D Generation"}');
    sessionStorage.setItem("glamar.demo-organisation.v1", "Eyewa");
    expect(repository.read()).toEqual({ version: 1, products: [], batches: [] });
    expect(localStorage.getItem(`${key}.backup`)).toBe(previous);
    expect(localStorage.getItem("glamar.generation-notifications.Eyewa")).toBe("[]");
    expect(sessionStorage.getItem("glamar.navigation.Eyewa")).toBe("null");
    const product = { ...glamar.products[0], id: "eyewa-new-product" };
    await repository.import([product]);
    expect(repository.read().products).toEqual([product]);
    sessionStorage.setItem("glamar.demo-organisation.v1", "GLAMAR");
    expect(repository.read()).toEqual(glamar);
  });
  it("saves manually entered dimensions and prefills them in existing product generation", async () => {
    const product = newProduct({ name: "Manual dimensions chair", sku: "NO-CATALOG-DIMENSIONS", status: "In Progress", assigneeId: "maninder" });
    await repository.import([product]);
    expect(productSpecificationsOf(product).length).toBe("");
    await repository.update(product.id, { type: "details", details: {
      name: product.name, brand: product.brand, category: product.category, productUrl: product.productUrl,
      specifications: { ...productSpecificationsOf(product), length: "120.5", width: "80.25", height: "42", unit: "in" },
    } }, "maninder", "Admin / Manager");
    const saved = repository.read().products.find(item => item.id === product.id)!;
    expect(saved.specifications).toMatchObject({ length: "120.5", width: "80.25", height: "42", unit: "in" });
    const html = renderToStaticMarkup(createElement(ManualProductUpload, { product: saved, busy: false, onUpload: async () => true }));
    expect(html).toContain('value="120.5"');
    expect(html).toContain('value="80.25"');
    expect(html).toContain('value="42"');
    expect(html).toContain('<span>in</span>');
    expect(saved.status).toBe("In Progress");
  });

  it("forces production listings unpublished on import and rejects mixed bulk publishing atomically", async () => {
    const original = repository.read();
    const todo = original.products.find((p) => p.status === "Available")!;
    const review = original.products.find((p) => p.status === "In Review")!;
    await expect(repository.setConsoleStatus([todo.id, review.id], "Published", "Admin / Manager")).rejects.toThrow("must remain unpublished");
    expect(repository.read()).toEqual(original);
    for (const status of ["Available", "New", "Claimed", "In Progress", "Corrections Required"] as const) {
      const imported = { ...todo, id: `forced-${status}`, sku: `forced-${status}`, status, consoleStatus: "Published" as const };
      await repository.import([imported]);
      expect(repository.read().products.find((p) => p.id === imported.id)?.consoleStatus).toBe("Draft");
    }
    localStorage.setItem("modello.workspace.v1", JSON.stringify({ ...original, products: [{ ...todo, consoleStatus: "Published" }] }));
    expect(repository.read().products[0].consoleStatus).toBe("Draft");
  });
  it("deletes selected products atomically and rejects missing IDs or non-managers", async () => {
    const before = repository.read();
    const ids = before.products.slice(0, 2).map((p) => p.id);
    await expect(repository.removeMany(ids, "3D Artist")).rejects.toThrow("Only a manager");
    await expect(repository.removeMany([...ids, "missing"], "Admin / Manager")).rejects.toThrow("no longer exists");
    expect(repository.read()).toEqual(before);
    await repository.removeMany(ids, "Admin / Manager");
    expect(repository.read().products).toEqual(before.products.filter((p) => !ids.includes(p.id)));
    expect(repository.read().batches).toEqual(before.batches);
  });
  it("opens an empty WestElm catalog without changing GlamAR and preserves empty catalogs", async () => {
    const glamar = repository.read();
    sessionStorage.setItem("glamar.demo-organisation.v1", "WestElm");
    expect(repository.read()).toEqual({ version: 1, products: [], batches: [] });
    const product = { ...glamar.products[0], id: "westelm-product" };
    await repository.import([product]);
    expect(repository.read().products).toEqual([product]);
    await repository.remove(product.id, "Admin / Manager");
    expect(repository.read().products).toEqual([]);
    await repository.resetDemo();
    expect(repository.read().products).toEqual([]);
    sessionStorage.setItem("glamar.demo-organisation.v1", "GLAMAR");
    expect(repository.read()).toEqual(glamar);
  });
  it("keeps a queued write in the organisation where it started", async () => {
    const glamar = repository.read();
    sessionStorage.setItem("glamar.demo-organisation.v1", "WestElm");
    const product = { ...glamar.products[0], id: "queued-westelm-product" };
    const importing = repository.import([product]);
    sessionStorage.setItem("glamar.demo-organisation.v1", "GLAMAR");
    await importing;
    expect(repository.read()).toEqual(glamar);
    sessionStorage.setItem("glamar.demo-organisation.v1", "WestElm");
    expect(repository.read().products).toEqual([product]);
  });
  it("updates console status in bulk without changing production details", async () => {
    const original = repository.read().products.filter((p) => ["In Review", "Completed"].includes(p.status)).slice(0, 3);
    const ids = original.slice(0, 2).map((p) => p.id);
    await repository.setConsoleStatus(ids, "Published", "Admin / Manager");
    const published = repository.read().products;
    for (const before of original.slice(0, 2)) {
      const after = published.find((p) => p.id === before.id)!;
      expect(after.consoleStatus).toBe("Published");
      expect(after.status).toBe(before.status);
      expect(after.assigneeId).toBe(before.assigneeId);
      expect(after.modelUrl).toBe(before.modelUrl);
    }
    expect(published.find((p) => p.id === original[2].id)).toEqual(original[2]);
    await repository.setConsoleStatus(ids, "Draft", "Admin / Manager");
    expect(
      repository
        .read()
        .products.filter((p) => ids.includes(p.id))
        .every((p) => p.consoleStatus === "Draft"),
    ).toBe(true);
  });
  it("rejects unauthorized and stale bulk selections without partially changing status", async () => {
    const before = repository.read();
    const id = before.products[0].id;
    await expect(
      repository.setConsoleStatus([id], "Published", "3D Artist"),
    ).rejects.toThrow("Only a manager");
    await expect(
      repository.setConsoleStatus(
        [id, "missing-product"],
        "Published",
        "Admin / Manager",
      ),
    ).rejects.toThrow("no longer exists");
    expect(repository.read()).toEqual(before);
  });
  it("persists a hold reason without changing the task status and prevents unauthorized edits", async () => {
    const target = repository
      .read()
      .products.find((p) => p.status === "Available")!;
    await repository.update(
      target.id,
      { type: "catalog-status", status: "On Hold" },
      "maninder",
      "Admin / Manager",
    );
    await repository.update(
      target.id,
      { type: "hold-reason", reason: "  Waiting for dimensions  " },
      "maninder",
      "3D Artist",
    );
    const saved = repository.read().products.find((p) => p.id === target.id)!;
    expect(saved.holdReason).toBe("Waiting for dimensions");
    expect(saved.status).toBe("On Hold");
    await expect(
      repository.update(
        target.id,
        { type: "hold-reason", reason: "Changed" },
        "adnan",
        "3D Artist",
      ),
    ).rejects.toThrow("assigned artist");
    await repository.update(
      target.id,
      { type: "catalog-status", status: "In Progress" },
      "maninder",
      "Admin / Manager",
    );
    await expect(
      repository.update(
        target.id,
        { type: "hold-reason", reason: "Changed" },
        "maninder",
        "Admin / Manager",
      ),
    ).rejects.toThrow("on hold");
    expect(
      repository.read().products.find((p) => p.id === target.id)?.holdReason,
    ).toBe("Waiting for dimensions");
  });
  it("persists all catalog status choices for listing badges and counts", async () => {
    const original = repository.read();
    const target = original.products.find((p) => p.status === "Available")!;
    const choices = [
      ["Available", "To do"],
      ["In Progress", "In Progress"],
      ["In Review", "Review"],
      ["On Hold", "Hold"],
      ["Completed", "Done"],
    ] as const;
    for (const [status, label] of choices) {
      await repository.update(
        target.id,
        { type: "catalog-status", status },
        "maninder",
        "Admin / Manager",
      );
      const saved = repository.read().products.find((p) => p.id === target.id)!;
      expect(productStatusLabel(saved.status)).toBe(label);
      expect(saved.assigneeId).toBe(status === "Available" ? null : "maninder");
      expect(Boolean(saved.approvedAt)).toBe(status === "Completed");
      expect(Boolean(saved.submittedAt)).toBe(status === "In Review");
      expect(saved.reviewStatus).toBe(
        status === "In Review"
          ? "Pending review"
          : status === "Completed"
            ? "Approved"
            : "Not submitted",
      );
      for (const group of ["To do", "In Progress", "Review", "Hold", "Done"]) {
        const expected =
          original.products.filter(
            (p) => p.id !== target.id && productStatusLabel(p.status) === group,
          ).length + Number(label === group);
        expect(
          repository
            .read()
            .products.filter((p) => productStatusLabel(p.status) === group),
        ).toHaveLength(expected);
      }
    }
    expect(
      repository.read().products.filter((p) => p.id !== target.id),
    ).toEqual(original.products.filter((p) => p.id !== target.id));
  });
  it("accepts repeated demo files without parsing contents or rejecting existing SKUs", async () => {
    const original = repository.read();
    // Deliberately not a workbook: demo uploads must not inspect its contents.
    const file = new File(
      ["not a workbook; no headers or valid URLs"],
      "demo.xlsx",
    );
    const first = (await prepareDemoCatalog(file)).map((p) => ({
      ...p,
      batchId: "025",
    }));
    const second = (await prepareDemoCatalog(file)).map((p) => ({
      ...p,
      batchId: "026",
    }));
    await repository.import(first);
    await repository.import(second);
    const current = repository.read();
    expect(current.products).toEqual([
      ...second,
      ...first,
      ...original.products,
    ]);
    expect(new Set(current.products.map((p) => p.id)).size).toBe(
      current.products.length,
    );
    expect(first.every((p) => p.isDemo && p.imageUrl)).toBe(true);
    expect(current.batches.some((b) => b.id === "026")).toBe(true);
  });
  it("imports into the selected new batch without changing existing products", async () => {
    const original = repository.read();
    const imported = {
      ...original.products[0],
      id: "demo-upload",
      sku: "DEMO-001",
      batchId: "025",
      isDemo: true,
    };
    await repository.import([imported]);
    const current = repository.read();
    expect(current.products[0]).toEqual(imported);
    expect(current.products.slice(1)).toEqual(original.products);
    expect(current.batches.find((b) => b.id === "025")?.name).toBe(
      "Batch #025",
    );
  });
  it("deletes only the selected product and rejects non-manager deletion", async () => {
    const original = repository.read();
    const target = original.products[0];
    await expect(repository.remove(target.id, "3D Artist")).rejects.toThrow(
      "manager",
    );
    expect(repository.read().products).toEqual(original.products);
    await repository.remove(target.id, "Admin / Manager");
    expect(repository.read().products).toEqual(original.products.slice(1));
    expect(repository.read().batches).toEqual(original.batches);
    await expect(
      repository.remove(target.id, "Admin / Manager"),
    ).rejects.toThrow("no longer exists");
  });
  it("allows only one simultaneous claimant to persist", async () => {
    const p = repository.read().products.find((p) => p.status === "Available")!;
    const results = await Promise.allSettled([
      repository.update(p.id, { type: "claim" }, "maninder", "3D Artist"),
      repository.update(p.id, { type: "claim" }, "adnan", "3D Artist"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(
      repository.read().products.find((v) => v.id === p.id)?.assigneeId,
    ).toBe("maninder");
  });
  it("rejects duplicate imports atomically", async () => {
    const original = repository.read();
    await expect(repository.import([original.products[0]])).rejects.toThrow(
      "already exists",
    );
    expect(repository.read().products).toHaveLength(original.products.length);
  });
});
