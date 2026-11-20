/**
 * Recherche internationale : tolérante aux accents, à la casse, aux alias et aux noms français/anglais.
 * Résultats classés puis regroupés par pays. Entièrement locale (aucun appel réseau).
 */
import { allLocations, COUNTRIES, type Location } from "@/lib/catalog";

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`ʻ]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface SearchHit {
  location: Location;
  score: number;
  /** Vrai si le résultat vient d'une correspondance sur le pays plutôt que sur la ville */
  viaCountry: boolean;
}

export interface SearchGroup {
  cc: string;
  country: string;
  hits: SearchHit[];
}

interface Indexed {
  location: Location;
  city: string;
  cityWords: string[];
  keys: string[];
  region: string;
}

let index: Indexed[] | null = null;
function getIndex(): Indexed[] {
  if (!index) {
    index = allLocations().map((l) => {
      const city = normalize(l.city);
      return {
        location: l,
        city,
        cityWords: city.split(" "),
        keys: l.keys,
        region: l.region ? normalize(l.region) : "",
      };
    });
  }
  return index;
}

function textScore(q: string, target: string, words: string[]): number {
  if (!target) return 0;
  if (target === q) return 100;
  if (target.startsWith(q)) return 80 - Math.min(10, target.length - q.length) * 0.5;
  if (words.some((w) => w.startsWith(q))) return 60;
  if (q.length >= 3 && target.includes(q)) return 35;
  return 0;
}

function countryScore(q: string, cc: string): number {
  const c = COUNTRIES[cc];
  if (!c) return 0;
  let best = 0;
  for (const k of c.keys) {
    if (k === q) best = Math.max(best, k.length <= 3 ? 70 : 75);
    else if (q.length >= 3 && k.startsWith(q)) best = Math.max(best, 55);
  }
  return best;
}

export function search(query: string, limit = 40): SearchHit[] {
  const q = normalize(query);
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const item of getIndex()) {
    let score = textScore(q, item.city, item.cityWords);
    for (const k of item.keys) {
      const s = textScore(q, k, k.split(" "));
      // un alias exact vaut presque le nom lui-même ; les clés techniques (IANA) un peu moins
      score = Math.max(score, s === 100 ? 92 : s * 0.85);
    }
    if (item.region) score = Math.max(score, textScore(q, item.region, item.region.split(" ")) * 0.5);
    let viaCountry = false;
    const cs = countryScore(q, item.location.cc);
    if (cs > score) {
      score = cs + (item.location.ref ? 8 : 0);
      viaCountry = true;
    }
    if (score > 0) {
      score += item.location.pop * 3;
      hits.push({ location: item.location, score, viaCountry });
    }
  }
  hits.sort((a, b) => b.score - a.score || a.location.city.localeCompare(b.location.city, "fr"));
  return hits.slice(0, limit);
}

/** Regroupe les résultats par pays, en conservant l'ordre du meilleur résultat de chaque pays. */
export function groupByCountry(hits: SearchHit[]): SearchGroup[] {
  const groups = new Map<string, SearchGroup>();
  for (const h of hits) {
    const cc = h.location.cc;
    if (!groups.has(cc)) groups.set(cc, { cc, country: COUNTRIES[cc]?.fr ?? cc, hits: [] });
    groups.get(cc)!.hits.push(h);
  }
  return [...groups.values()];
}
