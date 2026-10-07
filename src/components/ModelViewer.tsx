import { useEffect, useRef, useState, createElement } from "react";
import { Modal } from "./UI";
import { useModelUrl } from "../lib/useModelUrl";
import "@google/model-viewer";
import type { ModelViewerElement } from "@google/model-viewer";
export type MaterialSetting = {
  color: string;
  metallic: number;
  roughness: number;
};
export type ViewerSettings = {
  background: string;
  exposure: number;
  shadow: number;
  rotate: boolean;
  materials: Record<string, MaterialSetting>;
};
export function ModelStage({
  url: source,
  name,
  settings,
  onMaterials,
  onLoadError,
  onScreenshot,
}: {
  url: string;
  name: string;
  settings?: ViewerSettings;
  onMaterials?: (
    materials: {
      name: string;
      index: number;
      color: string;
      metallic: number;
      roughness: number;
    }[],
  ) => void;
  onLoadError?: () => void;
  onScreenshot?: (image: string) => void;
}) {
  const { url, error: modelResolutionError } = useModelUrl(source);
  const ref = useRef<ModelViewerElement | null>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setError(false);
    setLoaded(false);
    const el = ref.current;
    if (!el) return;
    const fail = () => {
        setError(true);
        onLoadError?.();
      },
      load = () => {
        setLoaded(true);
        onMaterials?.(
          (el.model?.materials || [])
            .filter((material) => material.isLoaded && material.isActive)
            .map((material) => ({
              name: material.name || `Material ${material.index + 1}`,
              index: material.index,
              color:
                "#" +
                material.pbrMetallicRoughness.baseColorFactor
                  .slice(0, 3)
                  .map((v) =>
                    Math.round(v * 255)
                      .toString(16)
                      .padStart(2, "0"),
                  )
                  .join(""),
              metallic: material.pbrMetallicRoughness.metallicFactor,
              roughness: material.pbrMetallicRoughness.roughnessFactor,
            })),
        );
      };
    el.addEventListener("error", fail);
    el.addEventListener("load", load);
    if (el.loaded) load();
    return () => {
      el.removeEventListener("error", fail);
      el.removeEventListener("load", load);
    };
  }, [url]);
  useEffect(() => {
    if (!loaded || !settings) return;
    for (const [index, value] of Object.entries(settings.materials)) {
      const material = ref.current?.model?.materials[Number(index)];
      if (!material) continue;
      const rgb = value.color
        .match(/[a-f\d]{2}/gi)
        ?.map((v) => parseInt(v, 16) / 255);
      if (rgb?.length === 3)
        material.pbrMetallicRoughness.setBaseColorFactor([
          rgb[0],
          rgb[1],
          rgb[2],
          material.pbrMetallicRoughness.baseColorFactor[3],
        ]);
      material.pbrMetallicRoughness.setMetallicFactor(value.metallic);
      material.pbrMetallicRoughness.setRoughnessFactor(value.roughness);
    }
  }, [loaded, settings]);
  useEffect(() => {
    if (!loaded || error || !onScreenshot) return;
    let cancelled = false;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const viewer = ref.current;
        if (!viewer) return;
        void (async () => {
          try {
            const blob = await viewer.toBlob({
              mimeType: "image/png",
              idealAspect: true,
            });
            const bitmap = await createImageBitmap(blob);
            try {
              if (cancelled) return;
              const canvas = document.createElement("canvas");
              canvas.width = canvas.height = 256;
              const context = canvas.getContext("2d");
              if (!context) return;
              const scale = Math.min(256 / bitmap.width, 256 / bitmap.height);
              const width = bitmap.width * scale;
              const height = bitmap.height * scale;
              context.drawImage(
                bitmap,
                (256 - width) / 2,
                (256 - height) / 2,
                width,
                height,
              );
              onScreenshot(canvas.toDataURL("image/png"));
            } finally {
              bitmap.close();
            }
          } catch {
            // Keep the placeholder if the browser cannot capture this model.
          }
        })();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [loaded, error, url, onScreenshot]);
  return (
    <>
      <div
        className="viewer"
        style={settings ? { background: settings.background } : undefined}
      >
        {createElement("model-viewer", {
          ref,
          src: url,
          alt: `3D model of ${name}`,
          "camera-controls": true,
          "auto-rotate": settings ? settings.rotate : true,
          "shadow-intensity": settings?.shadow ?? "1",
          "environment-image": "neutral",
          exposure: settings?.exposure ?? "1",
          "camera-orbit": "30deg 75deg auto",
          style: { width: "100%", height: "var(--model-stage-height, 480px)" },
        })}
        {!loaded && !error && (
          <span className="viewer-loading">Loading 3D model…</span>
        )}
        {(error || modelResolutionError) && (
          <div className="viewer-error">
            <h3>Unable to load this model</h3>
            <p>
              {modelResolutionError || "Check that the URL serves a GLB file and allows cross-origin access."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default function ModelViewer({
  url,
  name,
  onClose,
}: {
  url: string;
  name: string;
  onClose: () => void;
}) {
  return (
    <Modal title="3D model preview" subtitle={name} onClose={onClose} wide>
      <ModelStage key={url} url={url} name={name} />
    </Modal>
  );
}
