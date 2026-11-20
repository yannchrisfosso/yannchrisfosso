/**
 * Thème : une version enregistrée (persistée) et un brouillon d'aperçu (en mémoire).
 * - Le brouillon s'applique immédiatement à toute l'interface (aperçu en direct).
 * - Il n'est écrit dans le stockage qu'au clic sur « Enregistrer ».
 * - Chaque modification du brouillon est empilée pour pouvoir être annulée une à une.
 */
import { useMemo, useSyncExternalStore } from "react";
import { DEFAULT_THEME, resolveTheme, sanitizeTheme, type ThemePreference } from "@/lib/theme/tokens";
import { createMemoryStore, createPersistedStore, usePersisted, useMemoryStore } from "./persisted";

import { THEME_KEY } from "./keys";
export { THEME_KEY };

export const savedThemeStore = createPersistedStore<ThemePreference>({
  key: THEME_KEY,
  version: 1,
  initial: DEFAULT_THEME,
  sanitize: (raw) => sanitizeTheme(raw),
});

interface DraftState {
  draft: ThemePreference | null;
  history: ThemePreference[];
}

export const draftStore = createMemoryStore<DraftState>({ draft: null, history: [] });

export function useSavedTheme(): ThemePreference {
  return usePersisted(savedThemeStore);
}

export function useDraftState(): DraftState {
  return useMemoryStore(draftStore);
}

/** Thème effectivement affiché : le brouillon s'il existe, sinon l'enregistré. */
export function useActiveTheme(): ThemePreference {
  const saved = useSavedTheme();
  const { draft } = useDraftState();
  return draft ?? saved;
}

export function themesEqual(a: ThemePreference, b: ThemePreference): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const themeActions = {
  /** Modifie le brouillon (crée le brouillon à partir de l'enregistré si besoin). */
  edit(patch: Partial<ThemePreference> | ((t: ThemePreference) => ThemePreference)) {
    const { draft, history } = draftStore.get();
    const base = draft ?? savedThemeStore.get();
    const next = sanitizeTheme(typeof patch === "function" ? patch(base) : { ...base, ...patch });
    if (themesEqual(next, base)) return;
    draftStore.set({ draft: next, history: [...history, base].slice(-50) });
  },
  undo() {
    const { history } = draftStore.get();
    if (!history.length) return;
    const prev = history[history.length - 1];
    const rest = history.slice(0, -1);
    draftStore.set({ draft: themesEqual(prev, savedThemeStore.get()) && !rest.length ? null : prev, history: rest });
  },
  /** Abandonne toutes les modifications non enregistrées. */
  discard() {
    draftStore.set({ draft: null, history: [] });
  },
  save() {
    const { draft } = draftStore.get();
    if (draft) persistTheme(draft);
    draftStore.set({ draft: null, history: [] });
  },
  /** Revient au thème par défaut, en brouillon (à enregistrer pour confirmer). */
  resetToDefault() {
    themeActions.edit(() => DEFAULT_THEME);
  },
};

/** Écrit le thème et les variables résolues des deux modes (lues par le script anti-flash). */
export function persistTheme(theme: ThemePreference) {
  const css = { dark: resolveTheme(theme, true).vars, light: resolveTheme(theme, false).vars };
  savedThemeStore.set(theme, { css });
}

/** Suit prefers-color-scheme du système. */
function subscribeScheme(fn: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}
export function useSystemDark(): boolean {
  return useSyncExternalStore(
    subscribeScheme,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => true,
  );
}

export function useResolvedTheme() {
  const theme = useActiveTheme();
  const systemDark = useSystemDark();
  return useMemo(() => resolveTheme(theme, systemDark), [theme, systemDark]);
}
