"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Moon, Plus, Star, Sun } from "lucide-react";
import { getLocation, countryName } from "@/lib/catalog";
import { calendarDayDiff, formatDelta, getZonedParts } from "@/lib/time/engine";
import { formatTime, relativeDayLabel } from "@/lib/time/format";
import { dayPeriod, DAY_PERIOD_LABEL, solarAltitude } from "@/lib/time/solar";
import { favorites, useFavorites } from "@/lib/state/favorites";
import { useSettings } from "@/lib/state/settings";
import { useDeviceZone, useNow } from "@/lib/time/ticker";
import { cx, Flag } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

export const EXAMPLE_IDS = ["quebec-ca", "douala-cm", "paris-fr", "tokyo-jp"];

export function FavoritesEmpty({ compact }: { compact?: boolean }) {
  return (
    <div className={cx("rounded-[calc(var(--radius-card)-6px)] border border-dashed border-border-glow/70 p-4", compact && "p-3")}>
      <p className="font-semibold">Aucun favori pour l&apos;instant.</p>
      <p className="mt-1 text-sm text-text-muted">
        Ajoutez les villes qui comptent pour vous : elles restent sur cet appareil, sans compte.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLE_IDS.map((id) => {
          const l = getLocation(id)!;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                favorites.add(id);
                toast(`${l.city} ajoutée aux favoris`);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-glow/70 px-3 text-sm font-semibold hover:border-primary-ink"
            >
              <Plus className="size-3.5" aria-hidden />
              <Flag cc={l.cc} round className="text-[0.75rem]" />
              {l.city}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Favoris avec l'heure actualisée.
 * - « panel » : panneau latéral (ordinateur) — drapeau rond, ville/pays, grande heure, chevron ;
 * - « compact » : liste mobile — « Ville · Pays », heure, soleil/lune, chevron.
 */
export function FavoritesPanel({ className, max, variant = "panel" }: { className?: string; max?: number; variant?: "panel" | "compact" }) {
  const list = useFavorites();
  const now = useNow();
  const deviceZone = useDeviceZone();
  const settings = useSettings();
  const shown = max ? list.slice(0, max) : list;
  const compact = variant === "compact";
  const titleId = compact ? "favoris-compact-titre" : "favoris-panel-titre";

  return (
    <section aria-labelledby={titleId} className={cx("hs-themed hs-panel rounded-card p-4 sm:p-5", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id={titleId} className="flex items-center gap-2 font-display text-[1.35rem] font-medium">
          <Star className="size-5 text-secondary-ink" aria-hidden />
          Mes favoris
          {list.length > 0 && <span className="sr-only">({list.length})</span>}
        </h2>
        <Link href="/favoris" className="inline-flex items-center gap-0.5 rounded-control px-2 py-1 text-sm font-semibold text-text-muted hover:text-text">
          Tout voir <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      {list.length === 0 ? (
        <FavoritesEmpty compact />
      ) : (
        <ul className="-mx-2 grid">
          <AnimatePresence initial={false}>
            {shown.map((f) => {
              const l = getLocation(f.locationId);
              if (!l) return null;
              const p = now ? getZonedParts(now, l.tz) : null;
              const dev = now && deviceZone ? getZonedParts(now, deviceZone) : null;
              const period = now ? dayPeriod(solarAltitude(now, l.lat, l.lon)) : null;
              const night = period === "night" || period === "twilight";
              const dd = p && dev ? calendarDayDiff(dev, p) : 0;
              const detail = `${p && dev ? formatDelta(p.offsetMinutes - dev.offsetMinutes, { zeroLabel: "votre heure" }) : ""}${dd ? ` · ${relativeDayLabel(dd)}` : ""}`;
              return (
                <motion.li
                  key={f.locationId}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="border-b border-[color-mix(in_srgb,var(--color-border-glow)_35%,transparent)] last:border-0"
                >
                  <Link
                    href={`/ville/${l.id}`}
                    title={detail || undefined}
                    className="group flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-sunken"
                  >
                    <Flag cc={l.cc} round className={compact ? "text-[0.9rem]" : "text-[1.1rem]"} />
                    {compact ? (
                      <span className="min-w-0 flex-1 truncate font-display text-[1.05rem]">
                        {l.city} <span className="text-[0.85rem] text-text-muted">· {countryName(l.cc)}</span>
                      </span>
                    ) : (
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[1.1rem] leading-tight">{l.city}</span>
                        <span className="block truncate text-xs text-text-muted">
                          {countryName(l.cc)}
                          {detail ? ` · ${detail}` : ""}
                        </span>
                      </span>
                    )}
                    <span className={cx("tabular shrink-0 font-display leading-none font-medium", compact ? "text-[1.15rem]" : "text-[1.45rem]")}>
                      {p ? formatTime(p, settings.hourCycle) : "--:--"}
                    </span>
                    {compact && period && (
                      <span className="shrink-0 text-secondary-ink" title={DAY_PERIOD_LABEL[period]}>
                        {night ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
                        <span className="sr-only">{DAY_PERIOD_LABEL[period]}</span>
                      </span>
                    )}
                    <ChevronRight className="size-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      {max && list.length > max && (
        <Link href="/favoris" className="mt-2 block text-center text-sm font-semibold text-primary-ink hover:underline">
          Voir les {list.length} favoris
        </Link>
      )}
    </section>
  );
}
