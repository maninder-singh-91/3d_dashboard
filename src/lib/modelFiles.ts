export async function validateModelFile(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith(".glb"))
    throw Error("Choose a GLB model file.");
  if (file.size > 20 * 1024 * 1024)
    throw Error("Choose a model no larger than 20 MB.");
  if (file.size < 20) throw Error("This file is not a valid GLB model.");
  const header = new DataView(await file.slice(0, 12).arrayBuffer());
  if (
    header.getUint32(0, true) !== 0x46546c67 ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== file.size
  )
    throw Error("This file is not a valid GLB 2.0 model.");
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("glamar-product-models", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("models");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadModelFile(
  productId: string,
): Promise<File | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("models", "readonly");
    const request = tx.objectStore("models").get(productId);
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveModelFile(
  productId: string,
  file: File,
): Promise<void> {
  await validateModelFile(file);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("models", "readwrite");
    tx.objectStore("models").put(file, productId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function removeModelFile(productId: string): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("models", "readwrite");
    tx.objectStore("models").delete(productId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
