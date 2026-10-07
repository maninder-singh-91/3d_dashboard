export const LOCAL_MODEL_PREFIX = "local-model:";
export const localModelKey = (url: string) => url.startsWith(LOCAL_MODEL_PREFIX) ? url.slice(LOCAL_MODEL_PREFIX.length) : "";
export const isLocalModel = (url: string) => Boolean(localModelKey(url));
