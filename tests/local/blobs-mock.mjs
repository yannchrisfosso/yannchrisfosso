// Remplace @netlify/blobs en local : stockage en mémoire, partagé par tout le processus.
const stores = globalThis.__blobStores || (globalThis.__blobStores = new Map());
export function getStore(opts) {
  const name = typeof opts === "string" ? opts : opts.name;
  if (!stores.has(name)) stores.set(name, new Map());
  const m = stores.get(name);
  return {
    async get(key, o = {}) { if (!m.has(key)) return null; const v = m.get(key); return o.type === "json" ? JSON.parse(v) : v; },
    async set(key, v) { m.set(key, String(v)); return { modified: true }; },
    async setJSON(key, v) { m.set(key, JSON.stringify(v)); return { modified: true }; },
    async delete(key) { m.delete(key); },
    async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: "" })) }; },
  };
}
