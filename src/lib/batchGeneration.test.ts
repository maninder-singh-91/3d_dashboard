import { describe, expect, it } from "vitest";
import { createGenerationJob, itemStatus, jobStatus } from "./batchGeneration";
const item = (id: string) => ({
  productId: id,
  name: "Chair",
  sku: id,
  imageUrl: "",
  referenceCount: 1,
});
describe("Demo batch generation", () => {
  it("requires unique products and a reference for each", () => {
    expect(() => createGenerationJob("", [item("1")])).toThrow();
    expect(() => createGenerationJob("Batch", [])).toThrow();
    expect(() =>
      createGenerationJob("Batch", [item("1"), item("1")]),
    ).toThrow();
    expect(() =>
      createGenerationJob("Batch", [{ ...item("1"), referenceCount: 0 }]),
    ).toThrow("reference");
  });
  it("processes three products at a time and survives serialization", () => {
    const job = JSON.parse(
      JSON.stringify(
        createGenerationJob(
          "Batch",
          [item("1"), item("2"), item("3"), item("4")],
          1000,
        ),
      ),
    );
    expect(itemStatus(job, 0, 1000)).toBe("Queued");
    expect(itemStatus(job, 0, 2000)).toBe("Generating");
    expect(itemStatus(job, 3, 2000)).toBe("Queued");
    expect(jobStatus(job, 5000).ready).toBe(3);
    expect(jobStatus(job, 8000).status).toBe("Completed");
  });
  it("cancels pending products while preserving completed previews", () => {
    const job = {
      ...createGenerationJob(
        "Batch",
        [item("1"), item("2"), item("3"), item("4")],
        1000,
      ),
      cancelledAt: 5500,
    };
    expect(itemStatus(job, 0, 99999)).toBe("Ready");
    expect(itemStatus(job, 3, 99999)).toBe("Cancelled");
    expect(jobStatus(job, 99999)).toEqual({
      ready: 3,
      total: 4,
      status: "Cancelled",
    });
  });
});
