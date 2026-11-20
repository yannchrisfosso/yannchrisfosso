"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Columns2, Globe, Map as MapIcon, Minimize2, Maximize2, Star, X } from "lucide-react";
import { countryName, getLocation, type Location } from "@/lib/catalog";
import { formatUtcOffset, getZonedParts } from "@/lib/time/engine";
import { capitalize, formatShortDate } from "@/lib/time/format";
import { dayPeriod, solarAltitude } from "@/lib/time/solar";
import { favorites, useFavorites } from "@/lib/state/favorites";
import { updateSettings, useSettings } from "@/lib/state/settings";
import { useResolvedTheme } from "@/lib/state/theme";
import { useNow } from "@/lib/time/ticker";
import { DayPeriodBadge, TimeDisplay } from "@/components/clock/parts";
import { ButtonLink, cx, Flag, IconButton, Segmented } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

const WorldMap = dynamic(() => import("./world-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="flex size-full items-center justify-center">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted">
        <Globe className="size-4 motion-safe:animate-spin [animation-duration:3s]" aria-hidden /> Chargement de la carte…
      </span>
    </div>
  );
}

function subscribeReduced(fn: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}
function useReducedMotion(): boolean {
  const { motion } = useSettings();
  const system = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  return motion === "reduced" || (motion === "system" && system);
}

/** Charge la carte seulement quand elle approche de l'écran (performance mobile). */
function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (!("IntersectionObserver" in window)) {
      queueMicrotask(() => setNear(true));
      return;
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near] as const;
}

function SelectedPlace({ loc, onClose }: { loc: Location; onClose: () => void }) {
  const now = useNow();
  const settings = useSettings();
  const favs = useFavorites();
  const isFav = favs.some((f) => f.locationId === loc.id);
  const p = now ? getZonedParts(now, loc.tz) : null;
  const period = now ? dayPeriod(solarAltitude(now, loc.lat, loc.lon)) : null;
  return (
    <div className="hs-rise absolute inset-x-2 bottom-2 z-10 rounded-card border border-border-surface bg-surface p-3 text-on-surface shadow-card sm:right-auto sm:bottom-3 sm:left-3 sm:w-[320px] sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-display text-lg leading-tight font-semibold">
            <Flag cc={loc.cc} />
            <span className="truncate">{loc.city}</span>
          </p>
          <p className="truncate text-xs text-on-surface-muted">
            {countryName(loc.cc)} · {loc.tz}
          </p>
        </div>
        <IconButton label="Fermer" tone="surface" onClick={onClose} className="-mt-1 -mr-1 size-8">
          <X className="size-4" aria-hidden />
        </IconButton>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <TimeDisplay parts={p} cycle={settings.hourCycle} seconds={settings.showSeconds} className="text-3xl leading-none font-semibold" />
        <div className="text-right text-xs text-on-surface-muted">
          {p && <p>{capitalize(formatShortDate(p))}</p>}
          {p && <p>{formatUtcOffset(p.offsetMinutes)}</p>}
        </div>
      </div>
      {period && p && <DayPeriodBadge period={period} hour={p.hour} className="mt-1 text-sm" />}
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink href={`/ville/${loc.id}`} variant="primary" size="sm">
          Voir le détail <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
        <button
          type="button"
          onClick={() => {
            favorites.toggle(loc.id);
            toast(isFav ? `${loc.city} retirée des favoris` : `${loc.city} ajoutée aux favoris`);
          }}
          aria-pressed={isFav}
          className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border-surface px-3 text-sm font-semibold"
        >
          <Star className={cx("size-4", isFav && "fill-current text-primary-ink-surface")} aria-hidden />
          {isFav ? "Favori" : "Ajouter"}
        </button>
        <Link
          href={`/deux-mondes?ajouter=${loc.id}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border-surface px-3 text-sm font-semibold"
        >
          <Columns2 className="size-4" aria-hidden /> Deux mondes
        </Link>
      </div>
    </div>
  );
}

/** Bloc carte de l'accueil : carte vivante, réglages globe/plan, réduction mobile, lieu sélectionné. */
export function MapPanel({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string | null) => void }) {
  const settings = useSettings();
  const theme = useResolvedTheme();
  const favs = useFavorites();
  const now = useNow();
  const reduced = useReducedMotion();
  const [ref, near] = useNearViewport<HTMLDivElement>();
  const collapsed = settings.mapCollapsedOnMobile;

  const selected = getLocation(selectedId);

  return (
    <section aria-labelledby="carte-titre" className="hs-themed overflow-hidden rounded-card border border-border bg-surface-sunken">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-2 sm:px-5">
        <div className="min-w-0">
          <h2 id="carte-titre" className="font-display text-lg font-semibold">
            Le monde, en ce moment
          </h2>
          <p className="text-xs text-text-muted">Ombre de la nuit et du crépuscule calculée en direct.</p>
        </div>
        <div className="flex items-center gap-1">
          <div className={cx(collapsed && "hidden md:block")}>
            <Segmented
              size="sm"
              label="Projection de la carte"
              value={settings.mapProjection}
              onChange={(v) => updateSettings({ mapProjection: v })}
              options={[
                { value: "globe", label: "Globe", icon: <Globe className="size-3.5" aria-hidden /> },
                { value: "mercator", label: "Plan", icon: <MapIcon className="size-3.5" aria-hidden /> },
              ]}
            />
          </div>
          <IconButton
            label={collapsed ? "Afficher la carte" : "Réduire la carte"}
            className="md:hidden"
            aria-expanded={!collapsed}
            aria-controls="carte-zone"
            onClick={() => updateSettings({ mapCollapsedOnMobile: !collapsed })}
          >
            {collapsed ? <Maximize2 className="size-4" aria-hidden /> : <Minimize2 className="size-4" aria-hidden />}
          </IconButton>
        </div>
      </div>
      <div
        id="carte-zone"
        ref={ref}
        className={cx("relative h-[280px] sm:h-[380px] lg:h-[460px]", collapsed && "max-md:hidden")}
      >
        {near && !(collapsed && typeof window !== "undefined" && window.innerWidth < 768) && (
          <WorldMap
            className="size-full"
            theme={theme}
            favoriteIds={favs.map((f) => f.locationId)}
            focusId={selectedId}
            selectedId={selectedId}
            onSelect={(l) => onSelect(l.id)}
            projection={settings.mapProjection}
            reducedMotion={reduced}
            hourCycle={settings.hourCycle}
            now={now}
          />
        )}
        {selected && <SelectedPlace loc={selected} onClose={() => onSelect(null)} />}
      </div>
    </section>
  );
}
