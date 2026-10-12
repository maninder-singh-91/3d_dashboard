import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GenerationWorkspace from "./GenerationWorkspace";
import { newProduct } from "../lib/imports";
afterEach(() => vi.unstubAllGlobals());
describe("Pending generation workspace", () => {
  it("shows progress and locks settings without cancellation or a model", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    const product = newProduct({ name: "Chair" });
    const html = renderToStaticMarkup(<GenerationWorkspace products={[product]} activeProduct={product} jobStatus="In progress" jobProgress={62} onCancel={() => {}} />);
    expect(html).toContain('aria-label="Generation progress"');
    expect(html).toContain('value="62"');
    expect(html).toContain('Generation in progress');
    expect(html).toContain('<fieldset class="generation-settings-fields" disabled=""');
    expect(html).not.toContain('Cancel Generation');
    expect(html).not.toContain('<model-viewer');
  });
  it("shows In Queue with cancellation and disabled settings", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    const product = newProduct({ name: "Chair" });
    const html = renderToStaticMarkup(<GenerationWorkspace products={[product]} activeProduct={product} jobStatus="In Queue" onCancel={() => {}} onBack={() => {}} />);
    expect(html).toContain('In Queue');
    expect(html).toContain('Cancel Generation');
    expect(html).toContain('Generation Queue');
    expect(html).toContain('<fieldset class="generation-settings-fields" disabled=""');
    expect(html).not.toContain('<model-viewer');
  });
});
