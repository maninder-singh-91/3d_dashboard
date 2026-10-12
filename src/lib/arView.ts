export function arViewLink(modelUrl: string, origin: string, name: string): string {
  if (!modelUrl.trim()) return "";
  try {
    const model = new URL(modelUrl, origin);
    if (!["http:", "https:"].includes(model.protocol)) return "";
    const page = new URL("/", origin);
    page.searchParams.set("ar-model", model.href);
    page.searchParams.set("name", name);
    return page.href;
  } catch { return ""; }
}
export function arViewModel(query: string): string {
  try {
    const source = new URLSearchParams(query).get("ar-model");
    if (!source) return "";
    const url = new URL(source);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}
