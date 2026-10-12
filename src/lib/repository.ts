import type { ConsoleStatus, Database, Product, Role } from "./types";
import { seed } from "./seed";
import { transition, type Action } from "./workflow";
import { saveModelFile, removeModelFile } from "./modelFiles";
import { LOCAL_MODEL_PREFIX } from "./modelReference";
import { requiresUnpublished } from "./productStatus";
import { navigationKey } from "./workspaceNavigation";
import { generationNotificationKey } from "./generationNotifications";
const LEGACY_KEY = "modello.workspace.v1";
function workspaceKey() {
  let organisation = "GLAMAR";
  try { organisation = sessionStorage.getItem("glamar.demo-organisation.v1") || "GLAMAR"; } catch { /* Use the original workspace if session storage is unavailable. */ }
  return organisation === "GLAMAR" ? LEGACY_KEY : `${LEGACY_KEY}.org.${encodeURIComponent(organisation)}`;
}
function initialDatabase(key: string): Database {
  return key === LEGACY_KEY ? structuredClone(seed) : { version: 1, products: [], batches: [] };
}
export interface ProductRepository {
  read(): Database;
  syncModel(id: string, sku: string, url: string, file: File | undefined, userId: string, role: Role): Promise<void>;
  setConsoleStatus(
    ids: string[],
    status: ConsoleStatus,
    role: Role,
  ): Promise<void>;
  update(id: string, action: Action, userId: string, role: Role): Promise<void>;
  remove(id: string, role: Role): Promise<void>;
  removeMany(ids: string[], role: Role): Promise<void>;
  import(products: Product[]): Promise<void>;
  createBatch(name: string): Promise<string>;
  resetDemo(): Promise<void>;
  restoreBackup(): Promise<void>;
}
function read(key = workspaceKey()): Database {
  // Start Eyewa fresh once, retaining a recoverable snapshot of its previous demo data.
  const eyewaKey = `${LEGACY_KEY}.org.Eyewa`;
  const freshKey = `${eyewaKey}.fresh.v1`;
  if (key === eyewaKey && !localStorage.getItem(freshKey)) {
    const previous = localStorage.getItem(key);
    if (previous) localStorage.setItem(`${key}.backup`, previous);
    const noticesKey = generationNotificationKey("Eyewa");
    const previousNotices = localStorage.getItem(noticesKey);
    if (previousNotices) localStorage.setItem(`${noticesKey}.backup`, previousNotices);
    localStorage.setItem(noticesKey, "[]");
    try {
      const navKey = navigationKey("Eyewa");
      const previousNavigation = sessionStorage.getItem(navKey);
      if (previousNavigation) sessionStorage.setItem(`${navKey}.backup`, previousNavigation);
      sessionStorage.setItem(navKey, "null");
    } catch { /* Product validation also drops stale navigation when session storage is unavailable. */ }
    localStorage.setItem(key, JSON.stringify(initialDatabase(key)));
    localStorage.setItem(freshKey, "true");
  }
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (
        data.version === 1 &&
        Array.isArray(data.products) &&
        Array.isArray(data.batches)
      ) {
        let migrated = false;
        for (const p of data.products as Product[]) {
          if (requiresUnpublished(p.status) && p.consoleStatus === "Published") {
            p.consoleStatus = "Draft";
            migrated = true;
          }
          if (p.singleProductDraft === undefined && p.batchId.startsWith("manual-") && p.name === "Untitled product" &&
            p.brand === "Unspecified" && p.category === "Unspecified" && !p.productUrl && !p.modelUrl && !p.imageUrl &&
            ["Available", "New"].includes(p.status)) {
            p.singleProductDraft = true;
            migrated = true;
          }
        }
        if (migrated) localStorage.setItem(key, JSON.stringify(data));
        return data;
      }
    } catch {
      /* Retain a recoverable corrupt snapshot. */ localStorage.setItem(
        `${key}.recovery`,
        raw,
      );
    }
  }
  const initial = initialDatabase(key);
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}
async function write(fn: (db: Database, key: string) => void | Promise<void>) {
  const key = workspaceKey();
  if (!navigator.locks)
    throw Error(
      "This browser does not support safe task claiming. Use a current browser on localhost or HTTPS.",
    );
  await navigator.locks.request(key, async () => {
    const db = read(key);
    await fn(db, key);
    localStorage.setItem(key, JSON.stringify(db));
    window.dispatchEvent(new Event("modello-update"));
  });
}
export const repository: ProductRepository = {
  read,
  async removeMany(ids, role) {
    if (role !== "Admin / Manager") throw Error("Only a manager can delete products.");
    const selected = new Set(ids);
    if (!selected.size) return;
    await write((db) => {
      if ([...selected].some((id) => !db.products.some((p) => p.id === id)))
        throw Error("A selected product no longer exists. Refresh and try again.");
      db.products = db.products.filter((p) => !selected.has(p.id));
    });
  },
  async syncModel(id, sku, url, file, userId, role) {
    let storedKey = "";
    try {
      await write(async (db) => {
        const index = db.products.findIndex((p) => p.id === id);
        if (index < 0) throw Error("The product is no longer in the listing.");
        const fileKey = file ? crypto.randomUUID() : "";
        const modelUrl = file ? `${LOCAL_MODEL_PREFIX}${fileKey}` : url;
        const next = transition(db.products[index], { type: "sync-model", sku, modelUrl }, userId, role);
        if (file) { await saveModelFile(fileKey, file); storedKey = fileKey; }
        db.products[index] = next;
      });
    } catch (error) {
      if (storedKey) await removeModelFile(storedKey).catch(() => {});
      throw error;
    }
  },
  async setConsoleStatus(ids, status, role) {
    if (role !== "Admin / Manager")
      throw Error("Only a manager can change console status.");
    if (status !== "Published" && status !== "Draft")
      throw Error("Invalid console status.");
    const selected = new Set(ids);
    if (!selected.size) return;
    await write((db) => {
      if ([...selected].some((id) => !db.products.some((p) => p.id === id)))
        throw Error(
          "A selected product no longer exists. Refresh the listing and try again.",
        );
      if (status === "Published" && db.products.some((p) => selected.has(p.id) && requiresUnpublished(p.status)))
        throw Error("To do and In Progress products must remain unpublished.");
      const at = new Date().toISOString();
      for (const product of db.products) {
        if (
          !selected.has(product.id) ||
          (product.consoleStatus ?? "Draft") === status
        )
          continue;
        product.consoleStatus = status;
        product.updatedAt = at;
        product.activity.push({
          text: `Console status changed to ${status}`,
          at,
        });
      }
    });
  },
  async remove(id, role) {
    if (role !== "Admin / Manager")
      throw Error("Only a manager can delete products.");
    await write((db) => {
      const index = db.products.findIndex((product) => product.id === id);
      if (index < 0) throw Error("Product no longer exists.");
      db.products.splice(index, 1);
    });
  },
  async resetDemo() {
    await write((db, key) => {
      localStorage.setItem(`${key}.backup`, JSON.stringify(db));
      const sample = initialDatabase(key);
      db.products = sample.products;
      db.batches = sample.batches;
    });
  },
  async restoreBackup() {
    await write((db, key) => {
      const backup = localStorage.getItem(`${key}.backup`);
      if (!backup) throw Error("No backup is available yet.");
      const previous = JSON.parse(backup) as Database;
      if (previous.version !== 1 || !Array.isArray(previous.products))
        throw Error("The backup is not compatible.");
      db.products = previous.products;
      db.batches = previous.batches;
    });
  },
  async update(id, action, userId, role) {
    await write((db) => {
      const i = db.products.findIndex((p) => p.id === id);
      if (i < 0) throw Error("Task not found.");
      db.products[i] = transition(db.products[i], action, userId, role);
    });
  },
  async import(products) {
    await write((db) => {
      const keys = new Set(db.products.map((p) => p.sku));
      const ids = new Set(db.products.map((p) => p.id));
      for (const p of products) {
        if (requiresUnpublished(p.status)) p.consoleStatus = "Draft";
        if (ids.has(p.id)) throw Error(`Product UID ${p.id} already exists. Enter a unique value.`);
        ids.add(p.id);
        if (!p.isDemo && keys.has(p.sku))
          throw Error(
            `SKU ${p.sku} already exists. Remove duplicates before importing.`,
          );
        keys.add(p.sku);
        if (!db.batches.some((b) => b.id === p.batchId))
          db.batches.push({
            id: p.batchId,
            name: `Batch #${p.batchId}`,
            createdAt: new Date().toISOString(),
          });
      }
      db.products.unshift(...products);
    });
  },
  async createBatch(name) {
    const id = crypto.randomUUID().slice(0, 6);
    await write((db) => {
      db.batches.unshift({ id, name, createdAt: new Date().toISOString() });
    });
    return id;
  },
};
