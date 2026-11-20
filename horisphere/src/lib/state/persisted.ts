/**
 * Petit magasin d'état persistant et versionné (localStorage), compatible useSyncExternalStore.
 * Enveloppe stockée : { v: <version de schéma>, data: <valeur>, ...extra }.
 * Une valeur illisible ou d'une version inconnue est remplacée par la valeur par défaut, sans planter.
 */
import { useSyncExternalStore } from "react";

export interface PersistedStore<T> {
  key: string;
  get(): T;
  set(next: T | ((prev: T) => T), extra?: Record<string, unknown>): void;
  reset(): void;
  subscribe(fn: () => void): () => void;
  /** Valeur par défaut (rendu serveur et premier rendu d'hydratation) */
  initial: T;
}

export interface StoreOptions<T> {
  key: string;
  version: number;
  initial: T;
  /** Valide/répare une valeur lue ; reçoit aussi la version stockée pour les migrations */
  sanitize: (raw: unknown, storedVersion: number) => T;
}

export function storageAvailable(): boolean {
  try {
    const k = "__hs_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function createPersistedStore<T>(opts: StoreOptions<T>): PersistedStore<T> {
  let value: T = opts.initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(opts.key);
      if (raw) {
        const env = JSON.parse(raw) as { v?: number; data?: unknown };
        const v = typeof env?.v === "number" ? env.v : 0;
        value = v > opts.version ? opts.initial : opts.sanitize(env?.data, v);
      }
    } catch {
      value = opts.initial;
    }
  };

  const emit = () => listeners.forEach((l) => l());

  const store: PersistedStore<T> = {
    key: opts.key,
    initial: opts.initial,
    get() {
      load();
      return value;
    },
    set(next, extra) {
      load();
      value = typeof next === "function" ? (next as (p: T) => T)(value) : next;
      try {
        window.localStorage.setItem(opts.key, JSON.stringify({ v: opts.version, data: value, ...extra }));
      } catch {
        /* stockage plein ou bloqué : l'état reste en mémoire pour la session */
      }
      emit();
    },
    reset() {
      value = opts.initial;
      try {
        window.localStorage.removeItem(opts.key);
      } catch {
        /* ignoré */
      }
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  if (typeof window !== "undefined") {
    // Synchronisation entre onglets
    window.addEventListener("storage", (e) => {
      if (e.key !== opts.key) return;
      loaded = false;
      load();
      emit();
    });
  }
  return store;
}

export function usePersisted<T>(store: PersistedStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

/** Petit magasin en mémoire (non persistant). */
export function createMemoryStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T | ((p: T) => T)) {
      value = typeof next === "function" ? (next as (p: T) => T)(value) : next;
      listeners.forEach((l) => l());
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    initial,
  };
}

export type MemoryStore<T> = ReturnType<typeof createMemoryStore<T>>;

export function useMemoryStore<T>(store: MemoryStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}
