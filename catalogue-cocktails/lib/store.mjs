// Module de stockage unique pour « Disponibles ce soir ».
// Le même code tourne sur Netlify (Netlify Blobs) et sur Vercel (Upstash Redis) :
//   STORAGE_BACKEND = "netlify-blobs" (défaut) | "upstash"
// Interface : getJSON(key) · setJSON(key, value) · set(key, value, { ttlSeconds }) · del(key) · keys(prefix) · hasTTL
// Clés logiques : "soiree", "presets", "login-fail/<horodatage>-<aléa>", "login-ok/<horodatage>".

/* ---------- Netlify Blobs (store « bar-de-yann ») ---------- */
async function netlifyBlobs() {
  const { getStore } = await import("@netlify/blobs");
  const s = getStore({ name: "bar-de-yann", consistency: "strong" });
  return {
    hasTTL: false,
    getJSON: (k) => s.get(k, { type: "json" }),
    setJSON: (k, v) => s.setJSON(k, v),
    set: (k, v) => s.set(k, String(v)), // pas d'expiration native : le ménage est fait par le code appelant
    del: (k) => s.delete(k),
    keys: async (prefix) => (await s.list({ prefix })).blobs.map((b) => b.key),
  };
}

/* ---------- Upstash Redis (API REST, sans dépendance) ---------- */
// Toutes les clés sont préfixées « yanniel: » ; deux clés ont un nom lisible.
const PREFIX = "yanniel:";
const NAMES = { soiree: "disponibles-ce-soir", presets: "modeles" };
const toRedis = (k) => PREFIX + (NAMES[k] || k);
const fromRedis = (k) => {
  const bare = k.slice(PREFIX.length);
  return Object.keys(NAMES).find((n) => NAMES[n] === bare) || bare;
};

function upstash(env) {
  const url = env("KV_REST_API_URL") || env("UPSTASH_REDIS_REST_URL");
  const token = env("KV_REST_API_TOKEN") || env("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) throw new Error("upstash_not_configured");
  const cmd = async (...args) => {
    const r = await fetch(url.replace(/\/$/, ""), {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) throw new Error("upstash: " + (d.error || r.status));
    return d.result;
  };
  return {
    hasTTL: true,
    getJSON: async (k) => { const v = await cmd("GET", toRedis(k)); return v == null ? null : JSON.parse(v); },
    setJSON: (k, v) => cmd("SET", toRedis(k), JSON.stringify(v)),
    set: (k, v, o = {}) => o.ttlSeconds ? cmd("SET", toRedis(k), String(v), "EX", String(o.ttlSeconds)) : cmd("SET", toRedis(k), String(v)),
    del: (k) => cmd("DEL", toRedis(k)),
    keys: async (prefix) => {
      const out = []; let cursor = "0";
      do {
        const [next, batch] = await cmd("SCAN", cursor, "MATCH", toRedis(prefix) + "*", "COUNT", "500");
        out.push(...batch.map(fromRedis)); cursor = String(next);
      } while (cursor !== "0");
      return out;
    },
  };
}

/** @param {(name: string) => string | undefined} env lecture d'une variable d'environnement */
export async function getBarStore(env) {
  const backend = (env("STORAGE_BACKEND") || "netlify-blobs").toLowerCase();
  return backend === "upstash" ? upstash(env) : netlifyBlobs();
}
