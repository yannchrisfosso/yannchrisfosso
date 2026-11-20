/** Favoris : ajout sans doublon, suppression, réorganisation. Stockage local, sans compte. */
import { getLocation } from "@/lib/catalog";
import { createPersistedStore, usePersisted } from "./persisted";

export interface Favorite {
  locationId: string;
  position: number;
  createdAt: string;
}

import { FAVORITES_KEY } from "./keys";
export { FAVORITES_KEY };

export function sanitizeFavorites(raw: unknown): Favorite[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Favorite[] = [];
  for (const f of raw) {
    const id = f && typeof f === "object" ? (f as Favorite).locationId : undefined;
    if (typeof id !== "string" || seen.has(id) || !getLocation(id)) continue;
    seen.add(id);
    const createdAt = typeof (f as Favorite).createdAt === "string" ? (f as Favorite).createdAt : new Date(0).toISOString();
    out.push({ locationId: id, position: out.length, createdAt });
  }
  return out;
}

export const favoritesStore = createPersistedStore<Favorite[]>({
  key: FAVORITES_KEY,
  version: 1,
  initial: [],
  sanitize: (raw) => sanitizeFavorites(raw),
});

const renumber = (list: Favorite[]) => list.map((f, i) => ({ ...f, position: i }));

export function addFavoriteTo(list: Favorite[], locationId: string, now = new Date()): Favorite[] {
  if (list.some((f) => f.locationId === locationId) || !getLocation(locationId)) return list;
  return renumber([...list, { locationId, position: list.length, createdAt: now.toISOString() }]);
}

export function removeFavoriteFrom(list: Favorite[], locationId: string): Favorite[] {
  return renumber(list.filter((f) => f.locationId !== locationId));
}

export function moveFavoriteIn(list: Favorite[], locationId: string, delta: number): Favorite[] {
  const i = list.findIndex((f) => f.locationId === locationId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const copy = [...list];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return renumber(copy);
}

export function reorderFavorites(list: Favorite[], orderedIds: string[]): Favorite[] {
  const map = new Map(list.map((f) => [f.locationId, f]));
  const out = orderedIds.map((id) => map.get(id)).filter((f): f is Favorite => !!f);
  for (const f of list) if (!orderedIds.includes(f.locationId)) out.push(f);
  return renumber(out);
}

export const favorites = {
  add: (id: string) => favoritesStore.set((l) => addFavoriteTo(l, id)),
  remove: (id: string) => favoritesStore.set((l) => removeFavoriteFrom(l, id)),
  toggle: (id: string) =>
    favoritesStore.set((l) => (l.some((f) => f.locationId === id) ? removeFavoriteFrom(l, id) : addFavoriteTo(l, id))),
  move: (id: string, delta: number) => favoritesStore.set((l) => moveFavoriteIn(l, id, delta)),
  reorder: (ids: string[]) => favoritesStore.set((l) => reorderFavorites(l, ids)),
  has: (id: string) => favoritesStore.get().some((f) => f.locationId === id),
};

export function useFavorites(): Favorite[] {
  return usePersisted(favoritesStore);
}
