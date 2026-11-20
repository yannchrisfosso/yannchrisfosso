// Génère src/data/locations.json à partir de :
//  - data/tzdb/zone.tab et iso3166.tab (base IANA tzdb, domaine public, version dans data/tzdb/VERSION)
//  - data/catalog/zones-fr.mjs (noms français, régions, popularité)
//  - data/catalog/extra-cities.mjs (grandes villes supplémentaires rattachées à une zone IANA)
// Les noms de pays en français viennent d'Intl.DisplayNames (données CLDR embarquées dans Node/ICU).
// Usage : node scripts/build-catalog.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ZONES_FR } from "../data/catalog/zones-fr.mjs";
import { EXTRA_CITIES, REFERENCE_CITY, COUNTRY_ALIASES } from "../data/catalog/extra-cities.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tzVersion = readFileSync(join(root, "data/tzdb/VERSION"), "utf8").trim();

export function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`ʻ]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const slugify = (s) => normalize(s).replace(/ /g, "-");

function parseIso6709(coord) {
  // ±DDMM±DDDMM ou ±DDMMSS±DDDMMSS
  const m = coord.match(/^([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?$/);
  if (!m) throw new Error("coordonnée invalide " + coord);
  const lat = (m[1] === "-" ? -1 : 1) * (+m[2] + +m[3] / 60 + (m[4] ? +m[4] / 3600 : 0));
  const lon = (m[5] === "-" ? -1 : 1) * (+m[6] + +m[7] / 60 + (m[8] ? +m[8] / 3600 : 0));
  return [Math.round(lat * 100) / 100, Math.round(lon * 100) / 100];
}

const readTab = (f) =>
  readFileSync(join(root, "data/tzdb", f), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t"));

const isoNamesEn = Object.fromEntries(readTab("iso3166.tab").map(([cc, name]) => [cc, name]));
const dn = new Intl.DisplayNames(["fr"], { type: "region" });

const countries = {};
function country(cc) {
  if (!countries[cc]) {
    const fr = dn.of(cc) ?? isoNamesEn[cc] ?? cc;
    const en = isoNamesEn[cc] ?? cc;
    const keys = new Set([normalize(fr), normalize(en), cc.toLowerCase(), ...(COUNTRY_ALIASES[cc] ?? []).map(normalize)]);
    countries[cc] = { fr, en, keys: [...keys] };
  }
  return countries[cc];
}

const locations = [];
const seenSlugs = new Set();
function add(loc) {
  let id = slugify(`${loc.city} ${loc.cc}`);
  if (seenSlugs.has(id)) id = slugify(`${loc.city} ${loc.region ?? loc.tz.split("/").pop()} ${loc.cc}`);
  if (seenSlugs.has(id)) throw new Error("slug en double : " + id);
  seenSlugs.add(id);
  locations.push({ id, ...loc });
}

for (const [cc, coord, tz, comment] of readTab("zone.tab")) {
  country(cc);
  const meta = ZONES_FR[tz] ?? {};
  const raw = tz.split("/").pop().replace(/_/g, " ");
  const city = meta.n ?? raw;
  const [lat, lon] = parseIso6709(coord);
  const aliases = new Set([raw, tz, ...(meta.a ?? [])]);
  if (comment) aliases.add(comment);
  add({
    city,
    cc,
    region: meta.r,
    tz,
    lat,
    lon,
    pop: meta.p ?? 0,
    src: "tzdb",
    keys: [...new Set([...aliases].map(normalize))].filter((k) => k && k !== normalize(city)),
  });
}

for (const [city, cc, tz, lat, lon, pop, region, aliases = []] of EXTRA_CITIES) {
  country(cc);
  add({
    city,
    cc,
    region,
    tz,
    lat,
    lon,
    pop,
    src: "curated",
    keys: aliases.map(normalize).filter((k) => k !== normalize(city)),
  });
}

// Ville de référence par pays
const byCountry = {};
for (const l of locations) (byCountry[l.cc] ??= []).push(l);
for (const [cc, list] of Object.entries(byCountry)) {
  const wanted = REFERENCE_CITY[cc];
  let ref = wanted ? list.find((l) => l.city === wanted) : undefined;
  if (wanted && !ref) throw new Error(`ville de référence introuvable pour ${cc} : ${wanted}`);
  ref ??= [...list].sort((a, b) => b.pop - a.pop)[0];
  ref.ref = true;
}

// Vérifications : toutes les zones sont reconnues par l'ICU de Node
for (const l of locations) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: l.tz });
  } catch {
    throw new Error("zone inconnue de l'ICU : " + l.tz);
  }
}
const isoCodes = Object.keys(isoNamesEn);
const missing = isoCodes.filter((cc) => !byCountry[cc]);

locations.sort((a, b) => a.cc.localeCompare(b.cc) || b.pop - a.pop || a.city.localeCompare(b.city, "fr"));
const out = {
  meta: {
    tzdb: tzVersion,
    generatedBy: "scripts/build-catalog.mjs",
    sources: [
      "IANA tzdb zone.tab et iso3166.tab (domaine public)",
      "Noms de pays : CLDR via Intl.DisplayNames (licence Unicode)",
      "Villes supplémentaires et noms français : data/catalog (saisie manuelle, coordonnées ≈ GeoNames CC BY 4.0)",
    ],
    count: locations.length,
  },
  countries,
  locations,
};
mkdirSync(join(root, "src/data"), { recursive: true });
writeFileSync(join(root, "src/data/locations.json"), JSON.stringify(out));
console.log(
  `${locations.length} lieux, ${Object.keys(countries).length} pays/territoires (tzdb ${tzVersion})` +
    (missing.length ? ` — codes ISO sans lieu : ${missing.join(", ")}` : ""),
);
