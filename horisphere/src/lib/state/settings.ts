/** Réglages de l'application (format horaire, secondes, animations, carte). */
import type { HourCycle } from "@/lib/time/format";
import { createPersistedStore, usePersisted } from "./persisted";

export type MotionPreference = "system" | "reduced" | "full";
export type MapProjection = "globe" | "mercator";

export interface AppSettings {
  locale: "fr";
  hourCycle: HourCycle;
  showSeconds: boolean;
  motion: MotionPreference;
  mapCollapsedOnMobile: boolean;
  mapProjection: MapProjection;
  weekStart: 1 | 0;
}

import { SETTINGS_KEY } from "./keys";
export { SETTINGS_KEY };

export const DEFAULT_SETTINGS: AppSettings = {
  locale: "fr",
  hourCycle: "h23",
  showSeconds: true,
  motion: "system",
  mapCollapsedOnMobile: false,
  mapProjection: "mercator",
  weekStart: 1,
};

export function sanitizeSettings(raw: unknown): AppSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<AppSettings>;
  return {
    locale: "fr",
    hourCycle: r.hourCycle === "h12" ? "h12" : "h23",
    showSeconds: r.showSeconds !== false,
    motion: r.motion === "reduced" || r.motion === "full" ? r.motion : "system",
    mapCollapsedOnMobile: r.mapCollapsedOnMobile === true,
    mapProjection: r.mapProjection === "globe" ? "globe" : "mercator",
    weekStart: r.weekStart === 0 ? 0 : 1,
  };
}

export const settingsStore = createPersistedStore<AppSettings>({
  key: SETTINGS_KEY,
  version: 1,
  initial: DEFAULT_SETTINGS,
  sanitize: (raw) => sanitizeSettings(raw),
});

export function updateSettings(patch: Partial<AppSettings>) {
  settingsStore.set((s) => ({ ...s, ...patch }));
}

export function useSettings(): AppSettings {
  return usePersisted(settingsStore);
}
