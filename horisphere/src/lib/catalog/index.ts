/**
 * Catalogue de lieux. Données générées par scripts/build-catalog.mjs (voir docs/DONNEES.md).
 * Un lieu est toujours une ville rattachée à une zone IANA, avec son pays comme contexte :
 * on ne calcule jamais l'heure à partir du seul pays.
 */
import data from "@/data/locations.json";
import { getOffsetMinutes, isSupportedTimeZone, type Instant } from "@/lib/time/engine";

export interface Location {
  id: string;
  city: string;
  cc: string;
  region?: string;
  tz: string;
  lat: number;
  lon: number;
  /** 0 à 3 : 3 = grande destination */
  pop: number;
  src: "tzdb" | "curated";
  /** Clés de recherche normalisées supplémentaires (nom anglais, alias, identifiant IANA) */
  keys: string[];
  /** Ville proposée par défaut quand on recherche le pays */
  ref?: boolean;
}

export interface Country {
  fr: string;
  en: string;
  keys: string[];
}

interface CatalogData {
  meta: { tzdb: string; count: number; sources: string[] };
  countries: Record<string, Country>;
  locations: Location[];
}

const catalog = data as CatalogData;

export const CATALOG_META = catalog.meta;
export const COUNTRIES = catalog.countries;

let supported: Location[] | null = null;
/** Lieux dont la zone est connue du navigateur courant (les zones très récentes peuvent manquer). */
export function allLocations(): Location[] {
  if (!supported) supported = catalog.locations.filter((l) => isSupportedTimeZone(l.tz));
  return supported;
}

let byId: Map<string, Location> | null = null;
export function getLocation(id: string | null | undefined): Location | undefined {
  if (!id) return undefined;
  if (!byId) byId = new Map(catalog.locations.map((l) => [l.id, l]));
  return byId.get(id);
}

export function allLocationIds(): string[] {
  return catalog.locations.map((l) => l.id);
}

export function countryName(cc: string): string {
  return COUNTRIES[cc]?.fr ?? cc;
}

export function locationsOfCountry(cc: string): Location[] {
  return allLocations().filter((l) => l.cc === cc);
}

/** Libellé court : « Douala, Cameroun » */
export function locationLabel(l: Location): string {
  return `${l.city}, ${countryName(l.cc)}`;
}

/** Nombre de décalages UTC distincts en vigueur dans un pays à un instant (≥ 2 = pays multi-fuseaux). */
export function countryOffsetCount(cc: string, at: Instant): number {
  return new Set(locationsOfCountry(cc).map((l) => getOffsetMinutes(at, l.tz))).size;
}

/** Lieu du catalogue correspondant le mieux à une zone IANA (ex. zone de l'appareil). */
export function locationForZone(tz: string): Location | undefined {
  const list = allLocations().filter((l) => l.tz === tz);
  return list.find((l) => l.src === "tzdb") ?? list[0];
}

export function popularLocations(minPop = 3): Location[] {
  return allLocations().filter((l) => l.pop >= minPop);
}

/** Emoji drapeau (repli texte) à partir du code ISO. */
export function flagEmoji(cc: string): string {
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
