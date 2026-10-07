import { useEffect, useState } from "react";
import { loadModelFile } from "./modelFiles";
import { localModelKey } from "./modelReference";
export function useModelUrl(source: string) {
  const [resolved, setResolved] = useState({ source: "", url: "", error: "" });
  const key = localModelKey(source);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let objectUrl = "";
    void loadModelFile(key).then((file) => {
      if (cancelled) return;
      if (!file) throw Error("The saved model is unavailable on this device.");
      objectUrl = URL.createObjectURL(file);
      setResolved({ source, url: objectUrl, error: "" });
    }).catch((error: Error) => {
      if (!cancelled) setResolved({ source, url: "", error: error.message });
    });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [source, key]);
  return key ? (resolved.source === source ? resolved : { url: "", error: "" }) : { url: source, error: "" };
}
