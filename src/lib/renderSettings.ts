export const renderFields = {
  renderType: { label: "Render Type", options: ["Standard", "Premium"] },
  aspect: {
    label: "Aspect ratio",
    options: ["Portrait · 9:16", "Square · 1:1", "Landscape · 16:9"],
  },
  resolution: {
    label: "Resolution",
    options: ["720 · Standard", "1080 · High", "2160 · Ultra HD"],
  },
  duration: {
    label: "Duration",
    options: ["5 seconds", "10 seconds", "15 seconds", "Custom"],
  },
  background: {
    label: "Background",
    options: ["Grey radial gradient", "White studio", "Dark studio"],
  },
  pose: {
    label: "Product pose",
    options: ["Resting on surface", "Upright", "Current viewport"],
  },
  camera: {
    label: "Camera Angle",
    options: [
      "360° orbit",
      "Gentle hero sweep",
      "Slow push-in",
      "Top-down sweep",
      "Hero-to-detail reveal",
    ],
  },
  bloom: { label: "Star bloom", options: ["Off", "On"] },
  blending: { label: "Blending mode", options: ["Normal", "Overlay"] },
  placement: {
    label: "Logo placement",
    options: ["Bottom right", "Bottom left", "Top right", "Top left"],
  },
  music: {
    label: "Music",
    options: [
      "No music",
      "Corporate",
      "Orchestral hybrid",
      "Cinematic",
      "Electronic rock",
      "Contemporary classical",
      "Custom",
    ],
  },
  format: { label: "Export format", options: ["MP4", "MOV", "WebM"] },
} as const;
export type RenderField = keyof typeof renderFields;
export type RenderSettings = Record<RenderField, string> & {
  customDuration: number;
};
export const defaultRenderSettings: RenderSettings = {
  renderType: "Standard",
  aspect: "Landscape · 16:9",
  resolution: "1080 · High",
  duration: "10 seconds",
  background: "Grey radial gradient",
  pose: "Resting on surface",
  camera: "360° orbit",
  bloom: "Off",
  blending: "Normal",
  placement: "Bottom right",
  music: "No music",
  format: "MP4",
  customDuration: 10,
};
export function restoreRenderSettings(value: unknown): RenderSettings {
  const next = { ...defaultRenderSettings };
  if (!value || typeof value !== "object") return next;
  const saved = value as Record<string, unknown>;
  for (const key of Object.keys(renderFields) as RenderField[]) {
    if ((renderFields[key].options as readonly unknown[]).includes(saved[key]))
      next[key] = saved[key] as string;
  }
  if (
    typeof saved.customDuration === "number" &&
    Number.isFinite(saved.customDuration)
  )
    next.customDuration = Math.min(
      120,
      Math.max(1, Math.round(saved.customDuration)),
    );
  return next;
}
