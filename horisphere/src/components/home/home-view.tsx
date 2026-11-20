"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Download, Link2, Plus, Settings2, Star } from "lucide-react";
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
import { Horizon, RomanDial } from "@/components/decor/decor";
import { ButtonLink, cx } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

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
  for (const id of ids) {
    const l = getLocation(id);
    if (l) items.push({ loc: l, suggestion: !hasFavs, label: deviceZone && l.tz === deviceZone ? "Votre heure" : undefined });
  }
  // La ville de l'appareil n'est ajoutée que si aucune horloge n'a déjà le même fuseau
  if (local && !items.some((i) => i.loc.tz === local.tz)) items.push({ loc: local, label: "Votre heure" });

  return (
    <section aria-labelledby="horloges-titre" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="horloges-titre" className="font-display text-[1.6rem] leading-tight font-medium">
            {hasFavs ? "Vos horloges" : "Horloges"}
          </h2>
          {!hasFavs && <p className="text-sm text-text-muted">Quelques villes pour commencer : touchez l&apos;étoile pour les garder.</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById("recherche-accueil");
              input?.scrollIntoView({ block: "center", behavior: "smooth" });
              input?.focus({ preventScroll: true });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-glow/70 px-3 text-sm font-semibold hover:border-primary-ink"
          >
            <Plus className="size-4" aria-hidden /> Ajouter une ville
          </button>
          <Link href="/favoris" className="text-sm font-semibold text-primary-ink hover:underline">
            Organiser
          </Link>
        </div>
      </div>
      {deviceZone && !local && (
        <p className="mb-3 text-sm text-text-muted">
          Fuseau de votre appareil : <strong className="text-text">{deviceZone}</strong>
        </p>
      )}
      <ul
        className="hs-snap -mx-4 flex scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4 sm:overflow-visible sm:px-0"
        aria-label="Horloges"
      >
        {items.map(({ loc, label, suggestion }, i) => {
          const isFav = favs.some((f) => f.locationId === loc.id);
          return (
            <li key={loc.id} className="w-[min(64vw,236px)] shrink-0 sm:w-auto">
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
      </ul>
    </section>
  );
}

function DuoPanel({ className }: { className?: string }) {
  const duo = useDuo();
  const now = useNow();
  const settings = useSettings();
  return (
    <section aria-labelledby="duo-titre" className={cx("hs-themed hs-panel rounded-card p-4 sm:p-5", className)}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <h2 id="duo-titre" className="font-display text-[1.35rem] font-medium">
          Deux mondes
        </h2>
        <Link href="/deux-mondes" className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-sm font-semibold text-text-muted hover:text-text">
          <Settings2 className="size-4" aria-hidden />
          {duo.configured ? "Personnaliser" : "Configurer"}
        </Link>
      </div>
      <p className="mb-3 text-sm text-text-muted">
        {duo.configured
          ? "Un aperçu compact de vos deux heures clés, toujours sous la main."
          : "Exemple : Québec et Douala. Choisissez vos deux villes essentielles."}
      </p>
      <DuoStrip pref={duo} now={now} cycle={settings.hourCycle} headingLevel={3} />
      <div className="mt-4 flex flex-col items-center gap-2">
        <ButtonLink href="/installer" variant="cta" size="md" className="w-full max-w-xs">
          <Download className="size-4" aria-hidden /> Installer l&apos;app
        </ButtonLink>
        <Link href="/installer#raccourcis" className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text">
          <Link2 className="size-4" aria-hidden /> Créer un raccourci
        </Link>
      </div>
    </section>
  );
}

const FEATURES = [
  { href: "/favoris", icon: Star, title: "Vos favoris, toujours là", text: "Accédez en un clic aux villes qui comptent pour vous, rangées en ensembles." },
  { href: "/comparer", icon: ArrowLeftRight, title: "Comparez en un instant", text: "Deux fuseaux côte à côte, une heure convertie, les écarts du jour choisi." },
  { href: "/installer", icon: Download, title: "Un accès rapide, partout", text: "Installez Horisphère ou créez un raccourci vers vos deux mondes." },
];

function FeatureBand() {
  return (
    <ul className="hidden gap-4 md:grid md:grid-cols-3" aria-label="Fonctionnalités">
      {FEATURES.map(({ href, icon: Icon, title, text }) => (
        <li key={href}>
          <Link href={href} className="group flex items-start gap-4 rounded-card p-3 transition-colors hover:bg-surface-raised">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-[18px] border border-border-glow/70 bg-surface-raised text-secondary-ink shadow-[0_10px_24px_-14px_var(--color-halo)]">
              <Icon className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-[1.25rem] leading-tight">{title}</span>
              <span className="mt-1 block text-sm text-text-muted">{text}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
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
    <div className="relative overflow-x-clip">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] lg:gap-7">
        <div className="flex min-w-0 flex-col gap-6 lg:gap-7">
          <div className="grid items-center gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section aria-labelledby="titre-accueil" className="hs-rise relative pt-1">
              <RomanDial className="absolute -top-10 -left-44 -z-10 size-56 opacity-30 sm:-left-56 sm:size-72" />
              <h1 id="titre-accueil" className="max-w-xl font-display text-[2.3rem] leading-[1.05] font-medium sm:text-5xl xl:text-[2.8rem] 2xl:text-[3.1rem]">
                Le temps du monde,
                <br />
                <em className="hs-swash font-medium text-primary-ink">à votre manière.</em>
              </h1>
              <p className="mt-4 max-w-md text-[1.02rem] text-text-muted sm:text-[1.08rem]">
                Voyez l&apos;heure de chaque ville, comparez des fuseaux horaires et gardez vos lieux essentiels toujours accessibles.
              </p>
              <SearchBox className="mt-5 max-w-lg" inputId="recherche-accueil" variant="pill" placeholder="Rechercher un pays ou une ville…" />
            </section>
            <div className="hs-rise hs-rise-2 min-w-0">
              <MapPanel selectedId={focusId} onSelect={setFocusId} />
            </div>
          </div>
          <ClockRow />
          <div className="lg:hidden">
            <FavoritesPanel max={6} variant="compact" />
          </div>
          <div className="lg:hidden">
            <DuoPanel />
          </div>
        </div>

        <aside className="hidden min-w-0 lg:block" aria-label="Favoris et Deux mondes">
          <div className="sticky top-[calc(var(--header-h)+20px)] flex flex-col gap-5">
            <FavoritesPanel max={6} />
            <DuoPanel />
          </div>
        </aside>
      </div>
      <div className="mt-10">
        <FeatureBand />
      </div>
      <Horizon className="mt-6 -mb-10 hidden h-36 w-full md:block" />
    </div>
  );
}
