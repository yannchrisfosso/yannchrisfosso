"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, ArrowLeftRight, Columns2, MapPin, Share2, Star, Sunrise, Sunset } from "lucide-react";
import { countryName, countryOffsetCount, getLocation, locationForZone, locationsOfCountry, type Location } from "@/lib/catalog";
import {
  addDays,
  formatDelta,
  formatUtcOffset,
  getZonedParts,
  nextOffsetTransition,
  startOfLocalDay,
} from "@/lib/time/engine";
import { capitalize, formatLongDate, formatTime, relativeDayLabel } from "@/lib/time/format";
import { sunTimes } from "@/lib/time/solar";
import { useDeviceZone, useNow, useNowMinute } from "@/lib/time/ticker";
import { favorites, useFavorites } from "@/lib/state/favorites";
import { assignDuo, duoStore, useDuo } from "@/lib/state/duo";
import { useSettings } from "@/lib/state/settings";
import { useActiveTheme } from "@/lib/state/theme";
import { computeLocationTime } from "@/components/clock/use-location-time";
import { AnalogDial, DayPeriodBadge, TimeDisplay } from "@/components/clock/parts";
import { Button, ButtonLink, Card, cx, Flag } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { shareOrCopy } from "@/lib/share";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm font-semibold text-text-muted">{label}</dt>
      <dd className="font-semibold sm:text-right">{children}</dd>
    </div>
  );
}

function SunInfo({ loc, minute }: { loc: Location; minute: number }) {
  const data = useMemo(() => {
    if (!minute) return null;
    const p = getZonedParts(minute, loc.tz);
    const date = { year: p.year, month: p.month, day: p.day };
    return sunTimes(startOfLocalDay(date, loc.tz), startOfLocalDay(addDays(date, 1), loc.tz), loc.lat, loc.lon);
  }, [loc, minute]);
  const { hourCycle } = useSettings();
  if (!data) return <>…</>;
  if (data.polar === "polar-day") return <>Jour polaire : le soleil ne se couche pas aujourd&apos;hui</>;
  if (data.polar === "polar-night") return <>Nuit polaire : le soleil ne se lève pas aujourd&apos;hui</>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 sm:justify-end">
      {data.sunrise && (
        <span className="inline-flex items-center gap-1.5">
          <Sunrise className="size-4" aria-hidden /> Lever {formatTime(getZonedParts(data.sunrise, loc.tz), hourCycle)}
        </span>
      )}
      {data.sunset && (
        <span className="inline-flex items-center gap-1.5">
          <Sunset className="size-4" aria-hidden /> Coucher {formatTime(getZonedParts(data.sunset, loc.tz), hourCycle)}
        </span>
      )}
    </span>
  );
}

function NextTransition({ loc, minute }: { loc: Location; minute: number }) {
  const tr = useMemo(() => (minute ? nextOffsetTransition(minute, loc.tz) : null), [loc, minute]);
  const { hourCycle } = useSettings();
  if (!minute) return <>…</>;
  if (!tr) return <>Aucun changement d&apos;heure prévu dans les 12 prochains mois</>;
  // Heure murale au moment du changement, selon l'ancien et le nouveau décalage (ex. 02:00 → 03:00)
  const wallAt = (offset: number) => {
    const d = new Date(tr.instant + offset * 60_000);
    return { hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: 0 };
  };
  const after = getZonedParts(tr.instant, loc.tz);
  const shift = tr.toOffset - tr.fromOffset;
  return (
    <>
      {capitalize(formatLongDate(after))} : {formatTime(wallAt(tr.fromOffset), hourCycle)} → {formatTime(wallAt(tr.toOffset), hourCycle)}
      <span className="block text-xs font-medium text-text-muted">
        {shift > 0 ? "On avance" : "On recule"} de {formatDelta(Math.abs(shift)).replace("+", "")} · passage à {formatUtcOffset(tr.toOffset)}
      </span>
    </>
  );
}

export function CityDetail({ id }: { id: string }) {
  const loc = getLocation(id)!;
  const now = useNow();
  const minute = useNowMinute();
  const deviceZone = useDeviceZone();
  const settings = useSettings();
  const theme = useActiveTheme();
  const favs = useFavorites();
  const duo = useDuo();
  const isFav = favs.some((f) => f.locationId === loc.id);
  const info = now ? computeLocationTime(loc, now, deviceZone) : null;
  const p = info?.parts ?? null;
  const local = deviceZone ? locationForZone(deviceZone) : undefined;
  const country = countryName(loc.cc);
  const siblings = locationsOfCountry(loc.cc).filter((l) => l.id !== loc.id);
  const multi = minute ? countryOffsetCount(loc.cc, minute) > 1 : false;
  const compareWith = local && local.id !== loc.id ? local.id : loc.id === "quebec-ca" ? "douala-cm" : "quebec-ca";
  const inDuo = duo.locationIdA === loc.id ? "a" : duo.locationIdB === loc.id ? "b" : null;
  const accent = theme.clockOverrides[loc.id]?.accent ?? "var(--color-primary)";

  const setDuo = (slot: "a" | "b") => {
    duoStore.set((d) => assignDuo(d, slot, loc.id));
    const d = duoStore.get();
    toast(`Deux mondes : ${getLocation(d.locationIdA)?.city} et ${getLocation(d.locationIdB)?.city}`);
  };

  return (
    <article className="mx-auto max-w-5xl">
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Explorer
      </Link>

      <header className="hs-rise">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text-muted">
          <Flag cc={loc.cc} className="text-xl" title={`Drapeau : ${country}`} />
          <span>{country}</span>
          {loc.region && <span aria-hidden>·</span>}
          {loc.region && <span>{loc.region}</span>}
        </p>
        <h1 className="mt-1 font-display text-5xl leading-none font-semibold sm:text-6xl">{loc.city}</h1>
        {multi && (
          <p className="mt-3 inline-flex rounded-full border border-border bg-surface-raised px-3 py-1 text-sm font-semibold">
            {country} compte plusieurs fuseaux : cette heure est celle de {loc.city}.
          </p>
        )}
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section
          aria-label={`Heure locale à ${loc.city}`}
          style={{ "--hs-accent": accent } as React.CSSProperties}
          className="hs-themed hs-rise hs-rise-2 relative flex flex-col justify-between overflow-hidden rounded-card border border-border-surface bg-surface p-6 text-on-surface shadow-card sm:p-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-[calc(var(--gradient-strength)*0.6)] blur-2xl"
            style={{ background: "var(--hs-accent)" }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.16em] text-on-surface-muted uppercase">Heure locale</p>
              <TimeDisplay
                parts={p}
                cycle={settings.hourCycle}
                seconds
                className="mt-2 block text-[3.6rem] leading-none font-semibold tracking-tight sm:text-[5rem]"
                secondsClassName="text-[0.5em] font-medium"
              />
              <p className="mt-3 text-lg font-semibold">{p ? capitalize(formatLongDate(p)) : " "}</p>
              {info && <DayPeriodBadge period={info.period} hour={info.parts.hour} className="mt-2 text-base" />}
            </div>
            <AnalogDial parts={p} seconds size={110} className="hidden text-on-surface sm:block" />
          </div>
          <div className="relative mt-6 flex flex-wrap gap-2">
            <Button
              variant="primary"
              aria-pressed={isFav}
              onClick={() => {
                favorites.toggle(loc.id);
                toast(isFav ? `${loc.city} retirée des favoris` : `${loc.city} ajoutée aux favoris`);
              }}
            >
              <Star className={cx("size-4", isFav && "fill-current")} aria-hidden />
              {isFav ? "Dans vos favoris" : "Ajouter aux favoris"}
            </Button>
            <ButtonLink href={`/comparer?a=${compareWith}&b=${loc.id}`} variant="surface">
              <ArrowLeftRight className="size-4" aria-hidden /> Comparer
            </ButtonLink>
            <Button
              variant="surface"
              onClick={async () => {
                const r = await shareOrCopy({
                  title: `Heure à ${loc.city}`,
                  text: p ? `Il est ${formatTime(p, settings.hourCycle)} à ${loc.city} (${country}).` : `Heure à ${loc.city}`,
                  url: `${window.location.origin}/ville/${loc.id}`,
                });
                if (r === "copied") toast("Lien copié");
              }}
            >
              <Share2 className="size-4" aria-hidden /> Partager
            </Button>
          </div>
        </section>

        <Card className="hs-rise hs-rise-3">
          <h2 className="font-display text-xl font-semibold">Fuseau et repères</h2>
          <dl className="mt-2">
            <InfoRow label="Fuseau horaire IANA">
              <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[0.92em]">{loc.tz}</code>
            </InfoRow>
            <InfoRow label="Décalage UTC actuel">{p ? formatUtcOffset(p.offsetMinutes) : "…"}</InfoRow>
            <InfoRow label="Par rapport à vous">
              {info && info.deltaToDevice !== null && deviceZone ? (
                <>
                  {info.deltaToDevice === 0 ? "Même heure que vous" : `${formatDelta(info.deltaToDevice)} par rapport à votre appareil`}
                  {info.dayDiffToDevice ? ` (${relativeDayLabel(info.dayDiffToDevice)})` : ""}
                  <span className="block text-xs font-medium text-text-muted">Votre fuseau : {deviceZone}</span>
                </>
              ) : (
                "…"
              )}
            </InfoRow>
            <InfoRow label="Soleil aujourd'hui">
              <SunInfo loc={loc} minute={minute} />
            </InfoRow>
            <InfoRow label="Prochain changement d'heure">
              <NextTransition loc={loc} minute={minute} />
            </InfoRow>
            <InfoRow label="Coordonnées">
              {Math.abs(loc.lat).toFixed(2)}° {loc.lat >= 0 ? "N" : "S"}, {Math.abs(loc.lon).toFixed(2)}° {loc.lon >= 0 ? "E" : "O"}
            </InfoRow>
          </dl>
        </Card>
      </div>

      <section aria-labelledby="duo-ville" className="hs-themed mt-5 rounded-card border border-border bg-surface-raised p-5">
        <h2 id="duo-ville" className="flex items-center gap-2 font-display text-xl font-semibold">
          <Columns2 className="size-5 text-secondary-ink" aria-hidden /> Ajouter à « Deux mondes »
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {inDuo
            ? `${loc.city} fait déjà partie de vos deux mondes.`
            : `Actuellement : ${getLocation(duo.locationIdA)?.city} et ${getLocation(duo.locationIdB)?.city}${duo.configured ? "" : " (exemple)"}.`}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setDuo("a")} disabled={inDuo === "a"}>
            Remplacer {getLocation(duo.locationIdA)?.city} (gauche)
          </Button>
          <Button size="sm" onClick={() => setDuo("b")} disabled={inDuo === "b"}>
            Remplacer {getLocation(duo.locationIdB)?.city} (droite)
          </Button>
          <ButtonLink size="sm" variant="ghost" href="/deux-mondes">
            Personnaliser le module
          </ButtonLink>
          <ButtonLink size="sm" variant="ghost" href={`/?lieu=${loc.id}`}>
            <MapPin className="size-4" aria-hidden /> Voir sur la carte
          </ButtonLink>
        </div>
      </section>

      {siblings.length > 0 && (
        <section aria-labelledby="autres-villes" className="mt-8">
          <h2 id="autres-villes" className="font-display text-2xl font-semibold">
            Autres lieux · {country}
          </h2>
          {multi && <p className="mt-1 text-sm text-text-muted">Les heures diffèrent selon la région : choisissez la ville qui vous concerne.</p>}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.slice(0, 24).map((s) => {
              const sp = minute ? getZonedParts(now || minute, s.tz) : null;
              return (
                <li key={s.id}>
                  <Link
                    href={`/ville/${s.id}`}
                    className="hs-themed flex items-center justify-between gap-3 rounded-control border border-border bg-surface-raised px-4 py-3 transition-colors hover:border-primary-ink"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{s.city}</span>
                      <span className="block truncate text-xs text-text-muted">{s.region ?? s.tz}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tabular block font-semibold">{sp ? formatTime(sp, settings.hourCycle) : "--:--"}</span>
                      <span className="block text-xs text-text-muted">{sp ? formatUtcOffset(sp.offsetMinutes) : ""}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-text-muted">
        Heure calculée sur votre appareil à partir des règles de fuseaux IANA intégrées à votre navigateur ; aucune donnée
        n&apos;est envoyée. Coordonnées approximatives (centre-ville), utilisées pour le calcul du jour et de la nuit.
      </p>
    </article>
  );
}
