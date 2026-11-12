// Serveur de test local (règle « tester en local » du PRD) : sert catalogue-cocktails/site,
// exécute les vraies fonctions Netlify et applique les redirections /bar et /admin.
// Usage : ADMIN_PIN=xxxxxx SESSION_SECRET=yyy node tests/local/server.mjs  (port 8787)
import { register } from "node:module";
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
register(new URL("./loader.mjs", import.meta.url).href);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../catalogue-cocktails");
const SITE = path.join(ROOT, "site");
globalThis.Netlify = { env: { get: (k) => process.env[k] } };
const fns = {
  "/api/soiree": (await import(pathToFileURL(path.join(ROOT, "netlify/functions/soiree.mjs")).href)).default,
  "/api/soiree-admin": (await import(pathToFileURL(path.join(ROOT, "netlify/functions/soiree-admin.mjs")).href)).default,
};
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".mp4": "video/mp4" };
let failApi = false; // POST /__test/api-down {on:true} simule un serveur injoignable

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let p = decodeURIComponent(url.pathname);
  if (p === "/__test/api-down") { failApi = url.searchParams.get("on") === "1"; res.end("ok"); return; }
  if (fns[p]) {
    if (failApi && p === "/api/soiree") { res.writeHead(503); res.end(); return; }
    const chunks = []; for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const r = await fns[p](request, { ip: req.socket.remoteAddress, params: {} });
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  if (p === "/admin") { res.writeHead(302, { Location: "/bar" }); res.end(); return; }
  if (p === "/bar" || p === "/bar/") p = "/bar.html";
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(SITE, path.normalize(p));
  try {
    if (!file.startsWith(SITE) || !(await stat(file)).isFile()) throw 0;
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); res.end(await readFile(path.join(SITE, "404.html")));
  }
}).listen(process.env.PORT || 8787, () => console.log("local test server on", process.env.PORT || 8787));
