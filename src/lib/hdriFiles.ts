export async function validateHdriFile(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith('.hdr')) throw Error('Choose a Radiance HDR file (.hdr).');
  if (file.size > 20 * 1024 * 1024) throw Error('Choose an HDRI no larger than 20 MB.');
  const header = await file.slice(0, 8192).text();
  const dimensions = header.match(/\n-Y\s+(\d+)\s+\+X\s+(\d+)\s*\n/);
  if (!/^#\?(RADIANCE|RGBE)\r?\n/.test(header) ||
      !header.includes('FORMAT=32-bit_rle_rgbe') || !dimensions) {
    throw Error('This file is not a supported Radiance HDR image.');
  }
  const height = Number(dimensions[1]), width = Number(dimensions[2]);
  const headerEnd = (dimensions.index ?? 0) + dimensions[0].length;
  if (!height || !width || width > 8192 || height > 4096 || file.size < headerEnd + (width < 8 ? width * height * 4 : height * 12)) {
    throw Error('Choose a valid HDRI up to 8192 × 4096 pixels.');
  }
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('glamar-product-environments', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('environments');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function hdriFile(productId: string, operation: 'load' | 'save' | 'remove', file?: File): Promise<File | undefined> {
  if (operation === 'save') {
    if (!file) throw Error('Choose an HDRI file.');
    await validateHdriFile(file);
  }
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('environments', operation === 'load' ? 'readonly' : 'readwrite');
    const store = tx.objectStore('environments');
    const request = operation === 'load' ? store.get(productId)
      : operation === 'save' ? store.put(file, productId) : store.delete(productId);
    tx.oncomplete = () => { db.close(); resolve(operation === 'load' ? request.result : undefined); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
