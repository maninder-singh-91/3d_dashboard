import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import QRCode from "qrcode";

export default function ModelQrCode({ url, name }: { url: string; name: string }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setImage("");
    setError("");
    if (url) void QRCode.toDataURL(url, { width: 512, margin: 4, errorCorrectionLevel: "M" })
      .then((value) => { if (active) setImage(value); })
      .catch(() => { if (active) setError("QR code could not be created."); });
    return () => { active = false; };
  }, [url]);
  async function download() {
    try {
      const blob = await (await fetch(image)).blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${name.replace(/[^a-z0-9_-]/gi, "-")}-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch { setError("QR code could not be downloaded."); }
  }
  return <div className="model-qr-code" aria-label="Product QR code">
    <div className="model-qr-tile">
    {image ? <a href={url} target="_blank" rel="noreferrer" aria-label="Open AR view" title="Open AR view"><img src={image} alt={`QR code for ${name}`} /></a> : <QrCode size={48} aria-hidden="true" />}
    </div>
    {image && <>
      <p className="model-qr-instruction">Scan the QR code to<br />try this product</p>
      <button type="button" className="model-qr-download" onClick={() => void download()} aria-label="Download QR code">Download</button>
    </>}
    {!url && <span>Use a hosted model link to enable AR sharing.</span>}
    {error && <span role="alert">{error}</span>}
  </div>;
}
