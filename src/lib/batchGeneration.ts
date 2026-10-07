export const DEMO_MODEL_URL = "/models/studio-chair.glb";
export interface GenerationItem {
  productId: string;
  name: string;
  sku: string;
  imageUrl: string;
  referenceCount: number;
}
export interface GenerationJob {
  id: string;
  name: string;
  createdAt: number;
  cancelledAt?: number;
  items: GenerationItem[];
}
export type GenerationStatus = "Queued" | "Generating" | "Ready" | "Cancelled";
const key = "glamar.batch-generation.demo.v1";

// The demo derives progress from time so navigation/reload cannot lose a run.
export function itemStatus(
  job: GenerationJob,
  index: number,
  now = Date.now(),
): GenerationStatus {
  const elapsed = Math.max(0, (job.cancelledAt ?? now) - job.createdAt);
  const start = 1000 + Math.floor(index / 3) * 3000;
  if (elapsed >= start + 3000) return "Ready";
  if (job.cancelledAt !== undefined) return "Cancelled";
  return elapsed >= start ? "Generating" : "Queued";
}
export function jobStatus(job: GenerationJob, now = Date.now()) {
  const ready = job.items.filter(
    (_, i) => itemStatus(job, i, now) === "Ready",
  ).length;
  return {
    ready,
    total: job.items.length,
    status:
      ready === job.items.length
        ? "Completed"
        : job.cancelledAt !== undefined
          ? "Cancelled"
          : "Generating",
  } as const;
}
export function readGenerationJobs(): GenerationJob[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  const jobs = JSON.parse(raw);
  if (
    !Array.isArray(jobs) ||
    jobs.some(
      (j) =>
        typeof j.id !== "string" ||
        typeof j.createdAt !== "number" ||
        !Array.isArray(j.items),
    )
  )
    throw Error("Saved generation history could not be read.");
  return jobs;
}
export async function updateGenerationJobs(
  change: (jobs: GenerationJob[]) => GenerationJob[],
) {
  return navigator.locks.request(key, () => {
    const jobs = change(readGenerationJobs());
    localStorage.setItem(key, JSON.stringify(jobs));
    window.dispatchEvent(new Event("glamar-generation-update"));
    return jobs;
  });
}
export function createGenerationJob(
  name: string,
  items: GenerationItem[],
  now = Date.now(),
): GenerationJob {
  if (!name.trim()) throw Error("Enter a batch name.");
  if (!items.length) throw Error("Select at least one product.");
  if (items.some((item) => item.referenceCount < 1))
    throw Error("Add a reference image for every selected product.");
  if (new Set(items.map((item) => item.productId)).size !== items.length)
    throw Error("Each product can appear only once in a batch.");
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: now,
    items: items.map((item) => ({ ...item })),
  };
}
