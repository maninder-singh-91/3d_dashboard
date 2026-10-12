import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";

export default function HdriThumbnail({ file, busy, onUpload }: {
  file?: File;
  busy: boolean;
  onUpload: (file?: File) => void;
}) {
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setPreview("");
    if (file) void (async () => {
      const { HDRLoader } = await import("three/examples/jsm/loaders/HDRLoader.js");
      const hdr = new HDRLoader().setDataType(1015).parse(await file.arrayBuffer());
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = Math.max(1, Math.round(320 * hdr.height / hdr.width));
      const context = canvas.getContext("2d");
      if (!context) return;
      const pixels = context.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const source = (Math.floor(y * hdr.height / canvas.height) * hdr.width + Math.floor(x * hdr.width / canvas.width)) * 4;
          const target = (y * canvas.width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            const value = Math.max(0, hdr.data[source + channel]);
            pixels.data[target + channel] = Math.round(255 * Math.pow(value / (1 + value), 1 / 2.2));
          }
          pixels.data[target + 3] = 255;
        }
      }
      context.putImageData(pixels, 0, 0);
      if (!cancelled) setPreview(canvas.toDataURL());
    })().catch(() => { /* Keep the upload tile usable if a preview cannot be decoded. */ });
    return () => { cancelled = true; };
  }, [file]);
  return <button
    type="button"
    className={`hdri-thumbnail${dragging ? " dragging" : ""}`}
    disabled={busy}
    aria-label={file ? `Drag or Upload HDRI to replace ${file.name}` : "Drag or Upload HDRI"}
    onClick={() => onUpload()}
    onDragOver={(event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = busy ? "none" : "copy";
      if (!busy) setDragging(true);
    }}
    onDragLeave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    }}
    onDrop={(event) => {
      event.preventDefault();
      setDragging(false);
      const incoming = event.dataTransfer.files[0];
      if (!busy && incoming) onUpload(incoming);
    }}
  >
    {preview ? <img src={preview} alt="HDRI environment preview" /> : <ImagePlus size={28} />}
    <span>{busy ? "Saving HDRI…" : dragging ? "Drop HDRI here" : "Drag or Upload HDRI"}</span>
    {file && <small>{file.name}</small>}
  </button>;
}
