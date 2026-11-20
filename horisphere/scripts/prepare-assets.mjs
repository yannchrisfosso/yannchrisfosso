// Copie les ressources sous licence libre depuis node_modules vers public/ (non versionnées) :
//  - drapeaux SVG : flag-icons (MIT) → public/flags/<cc>.svg
//  - worker MapLibre GL (BSD-3) → public/vendor/
//  - fonds de carte : world-atlas, Natural Earth 1:50m (domaine public) → public/geo/
import { copyFileSync, mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules");
const catalog = JSON.parse(readFileSync(join(root, "src/data/locations.json"), "utf8"));

mkdirSync(join(root, "public/flags"), { recursive: true });
let flags = 0;
for (const cc of Object.keys(catalog.countries)) {
  const src = join(nm, "flag-icons/flags/4x3", cc.toLowerCase() + ".svg");
  if (existsSync(src)) {
    copyFileSync(src, join(root, "public/flags", cc.toLowerCase() + ".svg"));
    flags++;
  }
}
mkdirSync(join(root, "public/geo"), { recursive: true });
copyFileSync(join(nm, "world-atlas/countries-50m.json"), join(root, "public/geo/countries-50m.json"));
// Worker MapLibre (BSD-3) : servi tel quel, car son URL relative ne survit pas au bundling
const mlVersion = JSON.parse(readFileSync(join(nm, "maplibre-gl/package.json"), "utf8")).version;
mkdirSync(join(root, "public/vendor"), { recursive: true });
copyFileSync(join(nm, "maplibre-gl/dist/maplibre-gl-worker.mjs"), join(root, `public/vendor/maplibre-gl-worker-${mlVersion}.mjs`));
writeFileSync(join(root, "src/data/vendor.json"), JSON.stringify({ maplibreWorker: `/vendor/maplibre-gl-worker-${mlVersion}.mjs` }) + "\n");
// Service worker : version unique par build (purge des pages en cache à chaque déploiement)
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const swVersion = `${pkg.version}-${(process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || Date.now().toString(36)}`;
const sw = readFileSync(join(root, "scripts/templates/sw.template.js"), "utf8")
  .replace("__VERSION__", swVersion)
  .replace("__WORKER__", `/vendor/maplibre-gl-worker-${mlVersion}.mjs`);
writeFileSync(join(root, "public/sw.js"), sw);
console.log(`prepare-assets : ${flags} drapeaux, fond de carte Natural Earth 1:50m`);
