import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GenerationBatch from "./GenerationBatch";
import { newProduct } from "../lib/imports";
it("groups generation cards by state without changing their original progress", () => {
  const products = ["Queued chair", "Running chair", "Finished chair", "Failed chair"].map(name => newProduct({ name }));
  const html = renderToStaticMarkup(<GenerationBatch products={products} results={{ [products[3].id]: { status: "Failed" } }} onOpen={() => {}} onCancel={() => {}} />);
  const group = (name: string) => html.split(`aria-label="${name} generations"`)[1].split('</section>')[0];
  expect(group("In Queue")).toContain("Queued chair");
  expect(group("In Queue")).toContain("Cancel generation for Queued chair");
  expect(group("In Progress")).not.toContain("Cancel generation for");
  expect(group("Done")).not.toContain("Cancel generation for");
  expect(group("Needs attention")).not.toContain("Cancel generation for");
  expect(group("In Queue")).not.toContain("Running chair");
  expect(group("In Progress")).toContain("Running chair");
  expect(group("In Progress")).toContain('value="45"');
  expect(group("Done")).toContain("Finished chair");
  expect(group("Needs attention")).toContain("Failed chair");
});
