import { describe, expect, it } from "vitest";
import { arViewLink, arViewModel } from "./arView";
describe("AR sharing", () => {
  it("links to an AR page with the exact model source and product name", () => {
    const source = "https://assets.example.com/chair.glb?version=2&texture=on";
    const link = new URL(arViewLink(source, "https://console.example.com", "Chair & table"));
    expect(link.origin).toBe("https://console.example.com");
    expect(link.searchParams.get("name")).toBe("Chair & table");
    expect(arViewModel(link.search)).toBe(source);
    expect(arViewModel(new URL(arViewLink("/models/chair.glb", link.origin, "Chair")).search)).toBe("https://console.example.com/models/chair.glb");
  });
  it("does not share missing models, browser-only files or executable URLs", () => {
    for (const source of ["", "local-model:123", "blob:https://example.com/123", "javascript:alert(1)", "data:text/html,test"])
      expect(arViewLink(source, "https://example.com", "Chair")).toBe("");
    expect(arViewModel("?ar-model=javascript%3Aalert(1)")).toBe("");
    expect(arViewModel("?ar-model=not-a-url")).toBe("");
  });
});
