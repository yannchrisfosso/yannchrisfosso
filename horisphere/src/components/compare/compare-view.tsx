"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Copy, Link2, Moon, Pencil, Sun, TriangleAlert } from "lucide-react";
import { countryName, getLocation, locationForZone, type Location } from "@/lib/catalog";
import {
  addDays,
  calendarDayDiff,
  formatDelta,
  formatUtcOffset,
  getZonedParts,
  parseHm,
  parseIsoDate,
  resolveWallTime,
  toIsoDate,
  type WallResolution,
} from "@/lib/time/engine";
import { capitalize, formatLongDate, formatShortDate, formatTime, relativeDayLabel } from "@/lib/time/format";
import { dayPeriod, solarAltitude } from "@/lib/time/solar";
import { useDeviceZone, useNow } from "@/lib/time/ticker";
import { useSettings } from "@/lib/state/settings";
import { copyText, shareOrCopy } from "@/lib/share";
import { SearchBox } from "@/components/search/search-box";
import { DayPeriodBadge, TimeDisplay } from "@/components/clock/parts";
import { Button, Card, cx, Flag, IconButton, Segmented } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

function CityPicker({
  loc,
  side,
  onChange,
  now,
  other,
}: {
  loc: Location;
  side: "A" | "B";
  onChange: (l: Location) => void;
  now: number;
  other: Location;
}) {
  const [editing, setEditing] = useState(false);
  const settings = useSettings();
  const p = now ? getZonedParts(now, loc.tz) : null;
  const period = now ? dayPeriod(solarAltitude(now, loc.lat, loc.lon)) : null;
  return (
    <div className="hs-themed min-w-0 rounded-card border border-border-surface bg-surface p-4 text-on-surface shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-bold tracking-[0.14em] text-on-surface-muted uppercase">Ville {side}</p>
          <p className="mt-0.5 flex items-center gap-2 font-display text-2xl leading-tight font-semibold">
            <Flag cc={loc.cc} />
            <span className="truncate">{loc.city}</span>
          </p>
          <p className="truncate text-sm text-on-surface-muted">
            {countryName(loc.cc)} · {loc.tz}
          </p>
        </div>
        <IconButton tone="surface" label={`Changer la ville ${side}`} onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
      </div>
      {editing && (
        <div className="mt-3 text-text">
          <SearchBox
            size="md"
            autoFocus
            label={`Choisir la ville ${side}`}
            placeholder="Rechercher une ville"
            excludeIds={[other.id]}
            onSelect={(l) => {
              onChange(l);
              setEditing(false);
            }}
          />
        </div>
      )}
      <div className="mt-3 flex items-end justify-between gap-2">
        <TimeDisplay parts={p} cycle={settings.hourCycle} seconds={settings.showSeconds} className="text-4xl leading-none font-semibold" secondsClassName="text-[0.55em]" />
        <div className="text-right text-sm text-on-surface-muted">
          <p>{p ? capitalize(formatShortDate(p)) : ""}</p>
          <p>{p ? formatUtcOffset(p.offsetMinutes) : ""}</p>
        </div>
      </div>
      {period && p && <DayPeriodBadge period={period} hour={p.hour} className="mt-2 text-sm" />}
    </div>
  );
}

function describeDiff(a: Location, b: Location, minutes: number): string {
  if (minutes === 0) return `${a.city} et ${b.city} ont la même heure`;
  const abs = formatDelta(Math.abs(minutes)).replace("+", "");
  return minutes > 0 ? `${b.city} a ${abs} d'avance sur ${a.city}` : `${b.city} a ${abs} de retard sur ${a.city}`;
}

export function CompareView() {
  const params = useSearchParams();
  const now = useNow();
  const deviceZone = useDeviceZone();
  const settings = useSettings();
  const cycle = settings.hourCycle;

  // Sans ville A dans l'adresse : la ville de l'appareil (si connue), sinon Québec
  const [aChoice, setAId] = useState<string | null>(() => (getLocation(params.get("a")) ? params.get("a")! : null));
  const [bId, setBId] = useState(() => (getLocation(params.get("b")) ? params.get("b")! : "douala-cm"));
  const [refSide, setRefSide] = useState<"a" | "b">(params.get("ref") === "b" ? "b" : "a");
  const [dateStr, setDateStr] = useState(() => (parseIsoDate(params.get("d") ?? "") ? params.get("d")! : ""));
  const [timeStr, setTimeStr] = useState(() => (parseHm(params.get("t") ?? "") ? params.get("t")! : "09:00"));
  const [pick, setPick] = useState<"earlier" | "later">("earlier");

  const deviceLoc = deviceZone ? locationForZone(deviceZone) : undefined;
  const aId = aChoice ?? (deviceLoc && deviceLoc.id !== bId ? deviceLoc.id : bId === "quebec-ca" ? "douala-cm" : "quebec-ca");

  const a = getLocation(aId)!;
  const b = getLocation(bId)!;
  const refLoc = refSide === "a" ? a : b;
  const otherLoc = refSide === "a" ? b : a;

  // Date par défaut : aujourd'hui dans la ville de référence
  const todayRef = now ? toIsoDate(getZonedParts(now, refLoc.tz)) : "";
  const effectiveDate = dateStr || todayRef;

  // URL partageable, mise à jour sans navigation
  useEffect(() => {
    if (!effectiveDate) return;
    const q = new URLSearchParams({ a: aId, b: bId, d: effectiveDate, t: timeStr });
    if (refSide === "b") q.set("ref", "b");
    window.history.replaceState(null, "", `/comparer?${q.toString()}`);
  }, [aId, bId, effectiveDate, timeStr, refSide]);

  const date = parseIsoDate(effectiveDate);
  const hm = parseHm(timeStr);
  const resolution: WallResolution | null = useMemo(
    () => (date && hm ? resolveWallTime({ ...date, ...hm, second: 0 }, refLoc.tz) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveDate, timeStr, refLoc.tz],
  );
  const instant =
    resolution?.status === "ambiguous" ? (pick === "earlier" ? resolution.earlier : resolution.later) : resolution?.instant ?? null;
  const refParts = instant !== null ? getZonedParts(instant, refLoc.tz) : null;
  const otherParts = instant !== null ? getZonedParts(instant, otherLoc.tz) : null;
  const dayDiff = refParts && otherParts ? calendarDayDiff(refParts, otherParts) : 0;
  const nowDiff = now ? getZonedParts(now, b.tz).offsetMinutes - getZonedParts(now, a.tz).offsetMinutes : null;
  const thenDiff = instant !== null ? getZonedParts(instant, b.tz).offsetMinutes - getZonedParts(instant, a.tz).offsetMinutes : null;

  const resultText =
    refParts && otherParts
      ? `${capitalize(formatLongDate(refParts))} à ${formatTime(refParts, cycle)} à ${refLoc.city} = ${formatTime(otherParts, cycle)} à ${otherLoc.city} (${formatLongDate(otherParts)}).`
      : "";

  const shiftDate = (n: number) => {
    if (!date) return;
    setDateStr(toIsoDate(addDays(date, n)));
  };

  // Frise 24 h : chaque heure de la journée de référence et son équivalent
  const timeline = useMemo(() => {
    if (!date) return [];
    return Array.from({ length: 24 }, (_, h) => {
      const r = resolveWallTime({ ...date, hour: h, minute: hm?.minute ?? 0, second: 0 }, refLoc.tz);
      const t = r.status === "ambiguous" ? r.earlier : r.instant;
      const op = getZonedParts(t, otherLoc.tz);
      const refPeriod = dayPeriod(solarAltitude(t, refLoc.lat, refLoc.lon));
      const otherPeriod = dayPeriod(solarAltitude(t, otherLoc.lat, otherLoc.lon));
      const work = (x: number) => x >= 9 && x < 18;
      return {
        h,
        status: r.status,
        other: op,
        dd: calendarDayDiff({ ...date, hour: 0, minute: 0, second: 0 }, op),
        refNight: refPeriod === "night" || refPeriod === "twilight",
        otherNight: otherPeriod === "night" || otherPeriod === "twilight",
        both: work(h) && work(op.hour),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDate, hm?.minute, refLoc, otherLoc]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="hs-rise">
        <p className="text-xs font-bold tracking-[0.18em] text-secondary-ink uppercase">Comparateur horaire</p>
        <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Comparer deux villes</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          L&apos;écart est calculé pour la date choisie, à partir d&apos;un instant commun : heure d&apos;été, décalages de 30 ou 45 minutes
          et changements de date compris.
        </p>
      </header>

      <section aria-label="Villes comparées" className="hs-rise hs-rise-2 grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <CityPicker loc={a} side="A" onChange={(l) => setAId(l.id)} now={now} other={b} />
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => {
              setAId(bId);
              setBId(aId);
              setRefSide((s) => (s === "a" ? "b" : "a"));
            }}
            aria-label="Inverser les deux villes"
            className="rounded-full"
          >
            <ArrowLeftRight className="size-4 rotate-90 md:rotate-0" aria-hidden />
            <span className="md:sr-only">Inverser</span>
          </Button>
        </div>
        <CityPicker loc={b} side="B" onChange={(l) => setBId(l.id)} now={now} other={a} />
      </section>

      <p className="hs-rise hs-rise-3 text-center font-display text-xl font-semibold sm:text-2xl" aria-live="polite">
        {nowDiff === null ? " " : `En ce moment : ${describeDiff(a, b, nowDiff)}.`}
      </p>

      <Card className="hs-rise hs-rise-3">
        <h2 className="font-display text-2xl font-semibold">Convertir une heure</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-text-muted">Heure saisie dans la ville de…</p>
              <Segmented
                label="Ville de référence"
                value={refSide}
                onChange={setRefSide}
                options={[
                  { value: "a", label: a.city },
                  { value: "b", label: b.city },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="cmp-date" className="mb-1 block text-sm font-semibold text-text-muted">
                  Date à {refLoc.city}
                </label>
                <div className="flex items-center gap-1">
                  <IconButton label="Jour précédent" onClick={() => shiftDate(-1)}>
                    <ChevronLeft className="size-5" aria-hidden />
                  </IconButton>
                  <input
                    id="cmp-date"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="hs-themed h-11 rounded-control border border-border bg-surface-sunken px-3 font-semibold text-text [color-scheme:inherit]"
                  />
                  <IconButton label="Jour suivant" onClick={() => shiftDate(1)}>
                    <ChevronRight className="size-5" aria-hidden />
                  </IconButton>
                </div>
              </div>
              <div>
                <label htmlFor="cmp-time" className="mb-1 block text-sm font-semibold text-text-muted">
                  Heure à {refLoc.city}
                </label>
                <input
                  id="cmp-time"
                  type="time"
                  value={timeStr}
                  step={60}
                  onChange={(e) => e.target.value && setTimeStr(e.target.value.slice(0, 5))}
                  className="hs-themed h-11 rounded-control border border-border bg-surface-sunken px-3 font-semibold text-text tabular"
                />
              </div>
              <Button size="md" variant="ghost" onClick={() => setDateStr("")}>
                Aujourd&apos;hui
              </Button>
            </div>

            {resolution?.status === "gap" && (
              <div role="alert" className="flex gap-3 rounded-control border border-primary-ink bg-surface-sunken p-3 text-sm">
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-primary-ink" aria-hidden />
                <p>
                  <strong>{timeStr} n&apos;existe pas à {refLoc.city} ce jour-là</strong> : les horloges avancent de{" "}
                  {formatDelta(resolution.gapMinutes).replace("+", "")} (passage à l&apos;heure d&apos;été). Horisphère utilise l&apos;heure
                  équivalente, {formatTime(resolution.shiftedTo, cycle)}.
                </p>
              </div>
            )}
            {resolution?.status === "ambiguous" && (
              <div role="alert" className="flex gap-3 rounded-control border border-secondary-ink bg-surface-sunken p-3 text-sm">
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-secondary-ink" aria-hidden />
                <div>
                  <p>
                    <strong>{timeStr} existe deux fois à {refLoc.city} ce jour-là</strong> (retour à l&apos;heure d&apos;hiver). Choisissez :
                  </p>
                  <div className="mt-2">
                    <Segmented
                      size="sm"
                      label="Occurrence de l'heure répétée"
                      value={pick}
                      onChange={setPick}
                      options={[
                        { value: "earlier", label: `1re (${formatUtcOffset(getZonedParts(resolution.earlier, refLoc.tz).offsetMinutes)})` },
                        { value: "later", label: `2de (${formatUtcOffset(getZonedParts(resolution.later, refLoc.tz).offsetMinutes)})` },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hs-themed rounded-card border border-border-surface bg-surface p-5 text-on-surface" aria-live="polite">
            {refParts && otherParts ? (
              <>
                <p className="text-sm font-semibold text-on-surface-muted">
                  {capitalize(formatLongDate(refParts))}, {formatTime(refParts, cycle)} à {refLoc.city}
                </p>
                <p className="mt-3 flex items-center gap-2 text-sm font-bold tracking-[0.12em] text-on-surface-muted uppercase">
                  <Flag cc={otherLoc.cc} /> {otherLoc.city}
                </p>
                <p className="tabular text-6xl leading-none font-semibold tracking-tight">{formatTime(otherParts, cycle)}</p>
                <p className="mt-2 font-semibold">
                  {capitalize(formatLongDate(otherParts))}
                  {dayDiff !== 0 && (
                    <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary">{relativeDayLabel(dayDiff)}</span>
                  )}
                </p>
                <p className="mt-2 text-sm text-on-surface-muted">
                  {thenDiff !== null && describeDiff(a, b, thenDiff)} ce jour-là
                  {thenDiff !== null && nowDiff !== null && thenDiff !== nowDiff && " — l'écart n'est pas le même qu'aujourd'hui (changement d'heure)"}.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => toast((await copyText(resultText)) ? "Résultat copié" : "Copie impossible", "ok")}
                  >
                    <Copy className="size-4" aria-hidden /> Copier le résultat
                  </Button>
                  <Button
                    variant="surface"
                    size="sm"
                    onClick={async () => {
                      const r = await shareOrCopy({ title: "Horisphère — comparaison", text: resultText, url: window.location.href });
                      if (r === "copied") toast("Lien copié");
                    }}
                  >
                    <Link2 className="size-4" aria-hidden /> Partager le lien
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-on-surface-muted">Choisissez une date et une heure valides.</p>
            )}
          </div>
        </div>
      </Card>

      <section aria-labelledby="frise-titre" className="hs-rise">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="frise-titre" className="font-display text-2xl font-semibold">
              Frise de 24 heures
            </h2>
            <p className="text-sm text-text-muted">
              Journée du {date ? formatLongDate(date) : ""} à {refLoc.city}. Touchez une heure pour la convertir.
            </p>
          </div>
          <p className="flex flex-wrap items-center gap-3 text-xs font-semibold text-text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="size-3 rounded-sm bg-secondary" aria-hidden /> Heures ouvrables communes (9 h–18 h)
            </span>
            <span className="inline-flex items-center gap-1">
              <Moon className="size-3.5" aria-hidden /> Nuit
            </span>
            <span className="inline-flex items-center gap-1">
              <Sun className="size-3.5" aria-hidden /> Jour
            </span>
          </p>
        </div>
        <div className="hs-snap -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <ol className="grid min-w-[880px] grid-cols-24 gap-1" aria-label="Heures de la journée">
            {timeline.map((c) => {
              const selected = hm?.hour === c.h;
              return (
                <li key={c.h}>
                  <button
                    type="button"
                    onClick={() => setTimeStr(`${String(c.h).padStart(2, "0")}:${String(hm?.minute ?? 0).padStart(2, "0")}`)}
                    aria-pressed={selected}
                    aria-label={`${String(c.h).padStart(2, "0")} h à ${refLoc.city} : ${formatTime(c.other, cycle)} à ${otherLoc.city}${c.dd ? ` (${relativeDayLabel(c.dd)})` : ""}${c.status === "gap" ? ", heure inexistante" : c.status === "ambiguous" ? ", heure répétée" : ""}${c.both ? ", heures ouvrables communes" : ""}`}
                    className={cx(
                      "hs-themed flex w-full flex-col items-center gap-1 rounded-control border px-0.5 py-2 text-center transition-colors",
                      selected ? "border-primary bg-primary text-on-primary" : c.both ? "border-transparent bg-secondary text-on-secondary" : "border-border bg-surface-raised hover:border-primary-ink",
                    )}
                  >
                    <span className="tabular text-sm font-bold">{String(c.h).padStart(2, "0")}</span>
                    {c.refNight ? <Moon className="size-3 opacity-70" aria-hidden /> : <Sun className="size-3 opacity-70" aria-hidden />}
                    <span className="h-px w-4 bg-current opacity-30" aria-hidden />
                    <span className="tabular text-sm font-semibold">{String(c.other.hour).padStart(2, "0")}</span>
                    {c.otherNight ? <Moon className="size-3 opacity-70" aria-hidden /> : <Sun className="size-3 opacity-70" aria-hidden />}
                    <span className="h-3 text-[0.6rem] leading-3 font-bold">
                      {c.status === "gap" ? "saut" : c.status === "ambiguous" ? "×2" : c.dd ? (c.dd > 0 ? "+1 j" : "−1 j") : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Ligne du haut : {refLoc.city}. Ligne du bas : {otherLoc.city}
          {hm?.minute ? ` (minutes : ${String(hm.minute).padStart(2, "0")})` : ""}.
        </p>
      </section>
    </div>
  );
}
