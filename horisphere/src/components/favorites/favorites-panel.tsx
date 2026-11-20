"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Star } from "lucide-react";
import { getLocation, countryName } from "@/lib/catalog";
import { calendarDayDiff, formatDelta, getZonedParts } from "@/lib/time/engine";
import { formatTime, relativeDayLabel } from "@/lib/time/format";
import { dayPeriod, solarAltitude } from "@/lib/time/solar";
import { favorites, useFavorites } from "@/lib/state/favorites";
import { useSettings } from "@/lib/state/settings";
import { useActiveTheme } from "@/lib/state/theme";
import { useDeviceZone, useNow } from "@/lib/time/ticker";
import { DayPeriodBadge } from "@/components/clock/parts";
import { DEFAULT_ACCENTS } from "@/components/clock/clock-card";
import { cx, Flag } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

export const EXAMPLE_IDS = ["quebec-ca", "douala-cm", "paris-fr", "tokyo-jp"];

export function FavoritesEmpty({ compact }: { compact?: boolean }) {
  return (
    <div className={cx("rounded-[calc(var(--radius-card)-6px)] border border-dashed border-border p-4", compact && "p-3")}>
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
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-semibold hover:border-primary-ink"
            >
              <Plus className="size-3.5" aria-hidden />
              <Flag cc={l.cc} />
              {l.city}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Liste compacte des favoris avec l'heure actualisée (panneau latéral desktop, liste mobile). */
export function FavoritesPanel({ className, max }: { className?: string; max?: number }) {
  const list = useFavorites();
  const now = useNow();
  const deviceZone = useDeviceZone();
  const settings = useSettings();
  const theme = useActiveTheme();
  const shown = max ? list.slice(0, max) : list;

  return (
    <section aria-labelledby="favoris-panel-titre" className={cx("hs-themed rounded-card border border-border bg-surface-raised p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="favoris-panel-titre" className="flex items-center gap-2 font-display text-xl font-semibold">
          <Star className="size-5 text-secondary-ink" aria-hidden />
          Mes favoris
          {list.length > 0 && <span className="text-sm font-semibold text-text-muted tabular">({list.length})</span>}
        </h2>
        <Link href="/favoris" className="rounded-control px-2 py-1 text-sm font-semibold text-primary-ink hover:underline">
          Gérer
        </Link>
      </div>
      {list.length === 0 ? (
        <FavoritesEmpty compact />
      ) : (
        <ul className="-mx-2 grid gap-0.5">
          <AnimatePresence initial={false}>
            {shown.map((f, i) => {
              const l = getLocation(f.locationId);
              if (!l) return null;
              const p = now ? getZonedParts(now, l.tz) : null;
              const dev = now && deviceZone ? getZonedParts(now, deviceZone) : null;
              const period = now ? dayPeriod(solarAltitude(now, l.lat, l.lon)) : null;
              const accent = theme.clockOverrides[l.id]?.accent ?? DEFAULT_ACCENTS[i % 2];
              const dd = p && dev ? calendarDayDiff(dev, p) : 0;
              return (
                <motion.li
                  key={f.locationId}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <Link
                    href={`/ville/${l.id}`}
                    className="group flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-sunken"
                  >
                    <span aria-hidden className="h-8 w-1 shrink-0 rounded-full" style={{ background: accent }} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Flag cc={l.cc} />
                        <span className="truncate">{l.city}</span>
                      </span>
                      <span className="block truncate text-xs text-text-muted">
                        {countryName(l.cc)}
                        {p && dev ? ` · ${formatDelta(p.offsetMinutes - dev.offsetMinutes, { zeroLabel: "votre heure" })}` : ""}
                        {dd ? ` · ${relativeDayLabel(dd)}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tabular block text-lg leading-tight font-semibold">
                        {p ? formatTime(p, settings.hourCycle) : "--:--"}
                      </span>
                      {period && p && <DayPeriodBadge period={period} hour={p.hour} compact className="text-xs text-text-muted" />}
                    </span>
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
