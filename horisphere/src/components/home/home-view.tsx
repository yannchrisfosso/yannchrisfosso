"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Download, Plus, Settings2 } from "lucide-react";
import { getLocation, locationForZone, type Location } from "@/lib/catalog";
import { favorites, useFavorites } from "@/lib/state/favorites";
import { useDuo } from "@/lib/state/duo";
import { useSettings } from "@/lib/state/settings";
import { useActiveTheme } from "@/lib/state/theme";
import { useDeviceZone, useNow } from "@/lib/time/ticker";
import { ClockCard } from "@/components/clock/clock-card";
import { computeLocationTime } from "@/components/clock/use-location-time";
import { DuoStrip } from "@/components/duo/duo-strip";
import { EXAMPLE_IDS, FavoritesPanel } from "@/components/favorites/favorites-panel";
import { MapPanel } from "@/components/map/map-panel";
import { SearchBox } from "@/components/search/search-box";
import { ButtonLink, cx, Flag, SectionTitle } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

const QUICK = ["quebec-ca", "douala-cm", "paris-fr", "tokyo-jp", "new-york-us", "katmandou-np"];

function ClockRow() {
  const now = useNow();
  const deviceZone = useDeviceZone();
  const favs = useFavorites();
  const settings = useSettings();
  const theme = useActiveTheme();
  const local = deviceZone ? locationForZone(deviceZone) : undefined;
  const hasFavs = favs.length > 0;
  const ids = hasFavs ? favs.map((f) => f.locationId) : EXAMPLE_IDS;
  const items: { loc: Location; label?: string; suggestion?: boolean }[] = [];
  if (local) items.push({ loc: local, label: "Votre heure" });
  for (const id of ids) {
    const l = getLocation(id);
    if (l && l.id !== local?.id) items.push({ loc: l, suggestion: !hasFavs });
  }

  return (
    <section aria-labelledby="horloges-titre" className="min-w-0">
      <SectionTitle eyebrow={hasFavs ? "Vos lieux" : "Suggestions"} title="Horloges" id="horloges-titre">
        <Link href="/favoris" className="text-sm font-semibold text-primary-ink hover:underline">
          Organiser
        </Link>
      </SectionTitle>
      {!hasFavs && (
        <p className="-mt-2 mb-4 text-sm text-text-muted">
          Quelques villes pour commencer : touchez l&apos;étoile pour les garder dans vos favoris.
        </p>
      )}
      {deviceZone && !local && (
        <p className="mb-3 text-sm text-text-muted">
          Fuseau de votre appareil : <strong className="text-text">{deviceZone}</strong>
        </p>
      )}
      <ul
        className={cx(
          "hs-snap -mx-4 flex scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] sm:gap-4 sm:overflow-visible sm:px-0",
        )}
        aria-label="Horloges"
      >
        {items.map(({ loc, label, suggestion }, i) => {
          const isFav = favs.some((f) => f.locationId === loc.id);
          return (
            <li key={loc.id} className="w-[min(82vw,320px)] shrink-0 sm:w-auto">
              <ClockCard
                className={cx("hs-rise h-full", i < 4 && `hs-rise-${Math.min(4, i + 1)}`)}
                location={loc}
                info={now ? computeLocationTime(loc, now, deviceZone) : null}
                settings={settings}
                clockStyle={theme.clockStyle}
                cardStyle={theme.cardStyle}
                override={theme.clockOverrides[loc.id]}
                accentIndex={i}
                label={label ?? (suggestion ? "Suggestion" : undefined)}
                isFavorite={isFav}
                onToggleFavorite={() => {
                  favorites.toggle(loc.id);
                  toast(isFav ? `${loc.city} retirée des favoris` : `${loc.city} ajoutée aux favoris`);
                }}
              />
            </li>
          );
        })}
        <li className="w-[min(60vw,240px)] shrink-0 sm:w-auto">
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById("recherche-accueil");
              input?.scrollIntoView({ block: "center", behavior: "smooth" });
              input?.focus({ preventScroll: true });
            }}
            className="hs-themed flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border p-5 text-center font-semibold text-text-muted transition-colors hover:border-primary-ink hover:text-text"
          >
            <Plus className="size-6" aria-hidden />
            Ajouter une ville
          </button>
        </li>
      </ul>
    </section>
  );
}

function DuoBand() {
  const duo = useDuo();
  const now = useNow();
  const settings = useSettings();
  return (
    <section aria-labelledby="duo-titre" className="hs-themed rounded-card border border-border bg-surface-raised p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="duo-titre" className="font-display text-xl font-semibold">
            Deux mondes
          </h2>
          <p className="text-sm text-text-muted">
            {duo.configured ? "Vos deux villes essentielles, d'un coup d'œil." : "Exemple : Québec et Douala. Choisissez vos deux villes."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/deux-mondes" size="sm" variant={duo.configured ? "secondary" : "primary"}>
            <Settings2 className="size-4" aria-hidden />
            {duo.configured ? "Personnaliser" : "Configurer"}
          </ButtonLink>
          <ButtonLink href="/installer" size="sm" variant="ghost">
            <Download className="size-4" aria-hidden />
            Garder à portée de main
          </ButtonLink>
        </div>
      </div>
      <DuoStrip pref={duo} now={now} cycle={settings.hourCycle} headingLevel={3} className="max-w-3xl" />
    </section>
  );
}

export function HomeView() {
  const [focusId, setFocusId] = useState<string | null>(null);

  // /?lieu=<id> : ouvre un lieu sur la carte (lien « Voir sur la carte » de la fiche détaillée).
  // Lu après l'hydratation pour que la page d'accueil reste entièrement statique.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("lieu");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique de l'URL après montage
    if (id && getLocation(id)) setFocusId(id);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
        <section aria-labelledby="titre-accueil" className="hs-rise pt-1">
          <p className="text-xs font-bold tracking-[0.18em] text-secondary-ink uppercase">Horloge mondiale · {" "}sans compte</p>
          <h1 id="titre-accueil" className="mt-2 max-w-3xl font-display text-[2.15rem] leading-[1.05] font-semibold sm:text-5xl lg:text-[3.6rem]">
            Le temps du monde, <em className="font-medium text-primary-ink">à votre manière.</em>
          </h1>
          <p className="mt-3 max-w-2xl text-[1.02rem] text-text-muted sm:text-lg">
            L&apos;heure exacte de chaque ville, jour et nuit en direct, et vos deux mondes côte à côte.
          </p>
          <SearchBox className="mt-5 max-w-2xl" inputId="recherche-accueil" />
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Accès rapide">
            {QUICK.map((id) => {
              const l = getLocation(id)!;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setFocusId(id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 text-sm font-semibold transition-colors hover:border-primary-ink"
                  >
                    <Flag cc={l.cc} />
                    {l.city}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <div className="hs-rise hs-rise-2">
          <MapPanel selectedId={focusId} onSelect={setFocusId} />
        </div>
      </div>

      <aside className="hidden min-w-0 lg:block" aria-label="Favoris">
        <div className="sticky top-[calc(var(--header-h)+24px)] flex flex-col gap-4">
          <FavoritesPanel max={8} />
          <Link
            href="/comparer"
            className="hs-themed group flex items-center justify-between gap-3 rounded-card border border-border bg-surface-raised p-4 font-semibold transition-colors hover:border-primary-ink"
          >
            <span>
              <span className="block font-display text-lg">Planifier un appel</span>
              <span className="block text-sm font-normal text-text-muted">Convertir une heure entre deux villes</span>
            </span>
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-2 lg:gap-8">
        <ClockRow />
        <DuoBand />
        <div className="lg:hidden">
          <FavoritesPanel max={6} />
        </div>
      </div>
    </div>
  );
}
