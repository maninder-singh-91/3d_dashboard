import { createElement, useState } from "react";
import "@google/model-viewer";
import "../ar-view.css";
export default function ArView({ modelUrl, name }: { modelUrl: string; name: string }) {
  const [error, setError] = useState(false);
  return <main className="ar-view-page">
    <h1>{name || "Product AR view"}</h1>
    {createElement("model-viewer", {
      src: modelUrl, alt: `3D model of ${name || "product"}`, ar: true,
      "ar-modes": "webxr scene-viewer quick-look", "camera-controls": true,
      "shadow-intensity": "1", "environment-image": "neutral",
      onError: () => setError(true),
    }, <button type="button" slot="ar-button" className="button primary">View in your space</button>)}
    <p>{error ? "The model could not be loaded. Please check the model link." : "On a supported phone, tap View in your space to open AR."}</p>
  </main>;
}
