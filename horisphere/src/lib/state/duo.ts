/** Préférences du module « Deux mondes » (deux villes, format, couleurs, options d'affichage). */
import { getLocation } from "@/lib/catalog";
import { isHex, normalizeHex } from "@/lib/theme/color";
import { createPersistedStore, usePersisted } from "./persisted";

export type DuoLayout = "mini" | "confort";

export interface DuoPreference {
  locationIdA: string;
  locationIdB: string;
  layoutMode: DuoLayout;
  /** Couleurs propres à chaque moitié ; absentes = couleurs du thème */
  themeOverrides?: { a?: string; b?: string };
  showDelta: boolean;
  showDate: boolean;
  /** Faux tant que l'utilisateur n'a pas enregistré sa propre configuration (exemple par défaut) */
  configured: boolean;
}

import { DUO_KEY } from "./keys";
export { DUO_KEY };

export const DEFAULT_DUO: DuoPreference = {
  locationIdA: "quebec-ca",
  locationIdB: "douala-cm",
  layoutMode: "mini",
  showDelta: true,
  showDate: true,
  configured: false,
};

export function sanitizeDuo(raw: unknown): DuoPreference {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<DuoPreference>;
  const a = typeof r.locationIdA === "string" && getLocation(r.locationIdA) ? r.locationIdA : DEFAULT_DUO.locationIdA;
  const b = typeof r.locationIdB === "string" && getLocation(r.locationIdB) ? r.locationIdB : DEFAULT_DUO.locationIdB;
  const t = r.themeOverrides && typeof r.themeOverrides === "object" ? r.themeOverrides : undefined;
  const overrides: DuoPreference["themeOverrides"] = {};
  if (t && isHex(t.a)) overrides.a = normalizeHex(t.a);
  if (t && isHex(t.b)) overrides.b = normalizeHex(t.b);
  return {
    locationIdA: a,
    locationIdB: b,
    layoutMode: r.layoutMode === "confort" ? "confort" : "mini",
    themeOverrides: Object.keys(overrides).length ? overrides : undefined,
    showDelta: r.showDelta !== false,
    showDate: r.showDate !== false,
    configured: r.configured === true,
  };
}

export const duoStore = createPersistedStore<DuoPreference>({
  key: DUO_KEY,
  version: 1,
  initial: DEFAULT_DUO,
  sanitize: (raw) => sanitizeDuo(raw),
});

export function swapDuo(d: DuoPreference): DuoPreference {
  const o = d.themeOverrides;
  return {
    ...d,
    locationIdA: d.locationIdB,
    locationIdB: d.locationIdA,
    themeOverrides: o ? { a: o.b, b: o.a } : undefined,
  };
}

/** Affecte une ville à une moitié du duo (si elle occupe déjà l'autre moitié, on inverse). */
export function assignDuo(d: DuoPreference, slot: "a" | "b", locationId: string): DuoPreference {
  const other = slot === "a" ? d.locationIdB : d.locationIdA;
  if (other === locationId) return { ...swapDuo(d), configured: true };
  return { ...d, [slot === "a" ? "locationIdA" : "locationIdB"]: locationId, configured: true };
}

export function useDuo(): DuoPreference {
  return usePersisted(duoStore);
}
