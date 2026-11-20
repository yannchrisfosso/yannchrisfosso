/**
 * Favoris : ajout sans doublon, suppression, réorganisation, ensembles (« Famille », « Travail »…).
 * Stockage local versionné, sans compte.
 *  - v1 : tableau de favoris
 *  - v2 : { items: Favorite[], sets: FavoriteSet[] } — les données v1 sont migrées automatiquement.
 */
import { getLocation } from "@/lib/catalog";
import { createPersistedStore, usePersisted } from "./persisted";
import { FAVORITES_KEY } from "./keys";

export { FAVORITES_KEY };

export interface Favorite {
  locationId: string;
  position: number;
  createdAt: string;
  /** Ensembles auxquels appartient ce favori */
  setIds?: string[];
}

export interface FavoriteSet {
  id: string;
  name: string;
  createdAt: string;
}

export interface FavoritesData {
  items: Favorite[];
  sets: FavoriteSet[];
}

export const MAX_SET_NAME = 32;

export function defaultSets(now = new Date(0)): FavoriteSet[] {
  return [
    { id: "famille", name: "Famille", createdAt: now.toISOString() },
    { id: "travail", name: "Travail", createdAt: now.toISOString() },
  ];
}

export function sanitizeFavorites(raw: unknown, validSets?: Set<string>): Favorite[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Favorite[] = [];
  for (const f of raw) {
    const id = f && typeof f === "object" ? (f as Favorite).locationId : undefined;
    if (typeof id !== "string" || seen.has(id) || !getLocation(id)) continue;
    seen.add(id);
    const createdAt = typeof (f as Favorite).createdAt === "string" ? (f as Favorite).createdAt : new Date(0).toISOString();
    const rawSets = (f as Favorite).setIds;
    const setIds = Array.isArray(rawSets)
      ? [...new Set(rawSets.filter((s): s is string => typeof s === "string" && (!validSets || validSets.has(s))))]
      : [];
    out.push({ locationId: id, position: out.length, createdAt, ...(setIds.length ? { setIds } : {}) });
  }
  return out;
}

export function sanitizeSets(raw: unknown): FavoriteSet[] {
  if (!Array.isArray(raw)) return defaultSets();
  const seen = new Set<string>();
  const out: FavoriteSet[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const { id, name, createdAt } = s as FavoriteSet;
    if (typeof id !== "string" || !id || seen.has(id) || typeof name !== "string" || !name.trim()) continue;
    seen.add(id);
    out.push({ id, name: name.trim().slice(0, MAX_SET_NAME), createdAt: typeof createdAt === "string" ? createdAt : new Date(0).toISOString() });
  }
  return out;
}

/** Lecture et migration des données stockées (v1 → v2). */
export function sanitizeFavoritesData(raw: unknown, storedVersion: number): FavoritesData {
  if (storedVersion <= 1 || Array.isArray(raw)) {
    return { items: sanitizeFavorites(raw), sets: defaultSets() };
  }
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<FavoritesData>;
  const sets = sanitizeSets(r.sets);
  return { items: sanitizeFavorites(r.items, new Set(sets.map((s) => s.id))), sets };
}

export const favoritesStore = createPersistedStore<FavoritesData>({
  key: FAVORITES_KEY,
  version: 2,
  initial: { items: [], sets: defaultSets() },
  sanitize: (raw, v) => sanitizeFavoritesData(raw, v),
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

// --- Ensembles ---------------------------------------------------------------------------

function slugId(name: string, taken: Set<string>): string {
  const base =
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "ensemble";
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

export function createSetIn(data: FavoritesData, name: string, now = new Date()): { data: FavoritesData; id: string | null } {
  const clean = name.trim().slice(0, MAX_SET_NAME);
  if (!clean || data.sets.some((s) => s.name.toLowerCase() === clean.toLowerCase())) return { data, id: null };
  const id = slugId(clean, new Set(data.sets.map((s) => s.id)));
  return { data: { ...data, sets: [...data.sets, { id, name: clean, createdAt: now.toISOString() }] }, id };
}

export function renameSetIn(data: FavoritesData, id: string, name: string): FavoritesData {
  const clean = name.trim().slice(0, MAX_SET_NAME);
  if (!clean || data.sets.some((s) => s.id !== id && s.name.toLowerCase() === clean.toLowerCase())) return data;
  return { ...data, sets: data.sets.map((s) => (s.id === id ? { ...s, name: clean } : s)) };
}

export function deleteSetIn(data: FavoritesData, id: string): FavoritesData {
  return {
    sets: data.sets.filter((s) => s.id !== id),
    items: data.items.map((f) => {
      if (!f.setIds?.includes(id)) return f;
      const setIds = f.setIds.filter((s) => s !== id);
      const { setIds: _omit, ...rest } = f;
      void _omit;
      return setIds.length ? { ...rest, setIds } : rest;
    }),
  };
}

export function toggleInSetIn(data: FavoritesData, setId: string, locationId: string): FavoritesData {
  if (!data.sets.some((s) => s.id === setId)) return data;
  return {
    ...data,
    items: data.items.map((f) => {
      if (f.locationId !== locationId) return f;
      const cur = f.setIds ?? [];
      const setIds = cur.includes(setId) ? cur.filter((s) => s !== setId) : [...cur, setId];
      return { ...f, setIds };
    }),
  };
}

export function favoritesInSet(items: Favorite[], setId: string | null): Favorite[] {
  return setId ? items.filter((f) => f.setIds?.includes(setId)) : items;
}

const onItems = (fn: (l: Favorite[]) => Favorite[]) => favoritesStore.set((d) => ({ ...d, items: fn(d.items) }));

export const favorites = {
  add: (id: string) => onItems((l) => addFavoriteTo(l, id)),
  remove: (id: string) => onItems((l) => removeFavoriteFrom(l, id)),
  toggle: (id: string) =>
    onItems((l) => (l.some((f) => f.locationId === id) ? removeFavoriteFrom(l, id) : addFavoriteTo(l, id))),
  move: (id: string, delta: number) => onItems((l) => moveFavoriteIn(l, id, delta)),
  reorder: (ids: string[]) => onItems((l) => reorderFavorites(l, ids)),
  has: (id: string) => favoritesStore.get().items.some((f) => f.locationId === id),
  createSet: (name: string) => {
    let created: string | null = null;
    favoritesStore.set((d) => {
      const r = createSetIn(d, name);
      created = r.id;
      return r.data;
    });
    return created as string | null;
  },
  renameSet: (id: string, name: string) => favoritesStore.set((d) => renameSetIn(d, id, name)),
  deleteSet: (id: string) => favoritesStore.set((d) => deleteSetIn(d, id)),
  toggleInSet: (setId: string, locationId: string) => favoritesStore.set((d) => toggleInSetIn(d, setId, locationId)),
};

export function useFavoritesData(): FavoritesData {
  return usePersisted(favoritesStore);
}

export function useFavorites(): Favorite[] {
  return usePersisted(favoritesStore).items;
}
