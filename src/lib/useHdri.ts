import { useEffect, useState } from 'react';
import { hdriFile } from './hdriFiles';
export function useHdri(productId: string) {
  const [file, setFile] = useState<File>();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setFile(undefined);
    void hdriFile(productId, 'load').then(value => {
      if (!cancelled) setFile(value);
    }).catch(() => { if (!cancelled) setError('Could not load the saved HDRI.'); });
    return () => { cancelled = true; };
  }, [productId]);
  useEffect(() => {
    if (!file) { setUrl(''); return; }
    const objectUrl = URL.createObjectURL(file);
    // model-viewer selects its HDR decoder by URL suffix; fragments do not alter blob fetching.
    setUrl(`${objectUrl}#.hdr`);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  async function update(value?: File) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await hdriFile(productId, value ? 'save' : 'remove', value);
      setFile(value);
    } catch (e) { setError((e as Error).message || 'Could not save HDRI. Please try again.'); }
    finally { setBusy(false); }
  }
  return { file, url, busy, error, update };
}
