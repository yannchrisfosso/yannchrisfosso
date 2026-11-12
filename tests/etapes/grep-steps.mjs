// Sécurité des étapes : aucun texte d'étape ne doit apparaître dans les fichiers publics.
// Usage : node tests/etapes/grep-steps.mjs [url-de-base]   (sans URL : fichiers de catalogue-cocktails/site/)
// VERCEL_BYPASS = jeton de contournement pour une prévisualisation protégée.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STEPS } from "../../catalogue-cocktails/lib/steps-data.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../catalogue-cocktails/site");
const needles = [...new Set(Object.values(STEPS).flat())];
const variants = (t) => [t, JSON.stringify(t).slice(1, -1), t.replace(/'/g, "&#39;"), t.replace(/"/g, "&quot;")];
const base = process.argv[2];
let sources = [];
if (base) {
  const paths = ["/", "/index.html", "/bar", "/bar.html", "/sw.js", "/config.js", "/version.json", "/manifest.webmanifest", "/404.html", "/vendor/qrcode.js", "/api/soiree"];
  const headers = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : {};
  for (const p of paths) { const r = await fetch(new URL(p, base), { headers }); sources.push([p, await r.text()]); }
  for (const id of ["mojito", "negroni"]) { const r = await fetch(new URL("/api/etapes?id=" + id, base), { headers }); console.log(`/api/etapes?id=${id} sans session → ${r.status}`); if (r.ok) sources.push([`/api/etapes?id=${id}`, await r.text()]); }
} else {
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  sources = walk(ROOT).filter((f) => /\.(html|js|json|webmanifest|css|txt|xml)$/.test(f)).map((f) => [path.relative(ROOT, f), readFileSync(f, "utf8")]);
}
const hits = [];
for (const [name, text] of sources) for (const t of needles) if (variants(t).some((v) => text.includes(v))) hits.push(`${name} : « ${t.slice(0, 60)}… »`);
console.log(`${needles.length} étapes cherchées dans ${sources.length} fichiers ${base ? "servis par " + base : "de site/"} → ${hits.length} trouvée(s)`);
hits.slice(0, 10).forEach((h) => console.log("  ✘ " + h));
process.exit(hits.length ? 1 : 0);
