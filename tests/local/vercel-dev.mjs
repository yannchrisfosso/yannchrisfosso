// Équivalent local de « vercel dev » (qui exige un compte Vercel connecté) :
// - sert catalogue-cocktails/site comme Vercel (outputDirectory), avec les rewrites, redirects et headers de vercel.json ;
// - exécute les fonctions catalogue-cocktails/api/*.mjs (exports GET / POST, API Web standard) ;
// - simule l'API REST d'Upstash Redis (GET, SET … EX, DEL, SCAN MATCH) avec expiration réelle des clés.
// Usage : ADMIN_PIN=xxxxxx SESSION_SECRET=yyy node tests/local/vercel-dev.mjs   (site : 8788, faux Upstash : 8790)
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../catalogue-cocktails");
const VERCEL = JSON.parse(await readFile(path.join(ROOT, "vercel.json"), "utf8"));
const SITE = path.join(ROOT, VERCEL.outputDirectory);
const PORT = Number(process.env.PORT || 8788), REDIS_PORT = 8790;

/* ---------- Faux Upstash (REST) ---------- */
const db = new Map(); // clé -> { v, exp }
const alive = (k) => { const e = db.get(k); if (e && e.exp && e.exp <= Date.now()) db.delete(k); return db.has(k); };
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  if (req.headers.authorization !== "Bearer local-upstash-token") { res.writeHead(401); res.end(JSON.stringify({ error: "unauthorized" })); return; }
  const [cmd, ...a] = JSON.parse(Buffer.concat(chunks).toString());
  let result = null;
  switch (cmd.toUpperCase()) {
    case "GET": result = alive(a[0]) ? db.get(a[0]).v : null; break;
    case "SET": { const ex = a.findIndex((x) => String(x).toUpperCase() === "EX"); db.set(a[0], { v: String(a[1]), exp: ex > 0 ? Date.now() + Number(a[ex + 1]) * 1000 : 0 }); result = "OK"; break; }
    case "DEL": result = alive(a[0]) ? (db.delete(a[0]), 1) : 0; break;
    case "SCAN": { const m = a[a.findIndex((x) => String(x).toUpperCase() === "MATCH") + 1] || "*"; const pre = m.replace(/\*$/, ""); result = ["0", [...db.keys()].filter((k) => alive(k) && k.startsWith(pre))]; break; }
    case "TTL": result = alive(a[0]) ? (db.get(a[0]).exp ? Math.ceil((db.get(a[0]).exp - Date.now()) / 1000) : -1) : -2; break;
    default: res.writeHead(400); res.end(JSON.stringify({ error: "unknown command " + cmd })); return;
  }
  res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ result }));
}).listen(REDIS_PORT, "127.0.0.1");
process.env.STORAGE_BACKEND = "upstash";
process.env.KV_REST_API_URL = `http://127.0.0.1:${REDIS_PORT}`;
process.env.KV_REST_API_TOKEN = "local-upstash-token";

/* ---------- Fonctions /api ---------- */
const api = {
  "/api/soiree": await import(pathToFileURL(path.join(ROOT, "api/soiree.mjs")).href),
  "/api/soiree-admin": await import(pathToFileURL(path.join(ROOT, "api/soiree-admin.mjs")).href),
};

/* ---------- Règles de vercel.json ---------- */
const toRe = (src) => new RegExp("^" + src.split("(.*)").map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.*)") + "$");
const headerRules = VERCEL.headers.map((h) => ({ re: toRe(h.source), headers: h.headers }));
const headersFor = (p) => { const out = {}; for (const r of headerRules) if (r.re.test(p)) for (const h of r.headers) out[h.key] = h.value; return out; };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".mp4": "video/mp4" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = decodeURIComponent(url.pathname);
  const send = (status, body, extra = {}) => { res.writeHead(status, { ...headersFor(p), ...extra }); res.end(body); };
  if (api[p]) {
    const fn = api[p][req.method];
    if (!fn) return send(405, "Method Not Allowed");
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await fn(new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }));
    return send(r.status, Buffer.from(await r.arrayBuffer()), Object.fromEntries(r.headers));
  }
  const redirect = VERCEL.redirects.find((r) => toRe(r.source).test(p));
  if (redirect) return send(redirect.permanent ? 308 : 307, "", { Location: redirect.destination });
  const tryFile = async (rel) => { const f = path.join(SITE, path.normalize(rel)); try { if (f.startsWith(SITE) && (await stat(f)).isFile()) return f; } catch {} return null; };
  let file = await tryFile(p.endsWith("/") ? p + "index.html" : p);
  if (!file) { const rw = VERCEL.rewrites.find((r) => toRe(r.source).test(p)); if (rw) file = await tryFile(rw.destination); }
  if (!file) return send(404, await readFile(path.join(SITE, "404.html")), { "Content-Type": TYPES[".html"] });
  const data = await readFile(file), type = TYPES[path.extname(file)] || "application/octet-stream";
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (m) { // requêtes Range (indispensables à Safari pour la vidéo), comme sur Vercel
    const start = m[1] === "" ? Math.max(0, data.length - Number(m[2])) : Number(m[1]);
    const end = m[1] !== "" && m[2] !== "" ? Math.min(Number(m[2]), data.length - 1) : data.length - 1;
    return send(206, data.subarray(start, end + 1), { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": String(end - start + 1) });
  }
  send(200, data, { "Content-Type": type, "Accept-Ranges": "bytes" });
}).listen(PORT, () => console.log(`vercel-dev local : http://localhost:${PORT} (faux Upstash : ${REDIS_PORT})`));
