"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowLeftRight } from "lucide-react";
import { getLocation, type Location } from "@/lib/catalog";
import { calendarDayDiff, formatDelta, getZonedParts } from "@/lib/time/engine";
import { capitalize, formatShortDate, relativeDayLabel, type HourCycle } from "@/lib/time/format";
import { dayPeriod, solarAltitude } from "@/lib/time/solar";
import { readableTextOn } from "@/lib/theme/color";
import type { DuoPreference } from "@/lib/state/duo";
import { cx, Flag } from "@/components/ui/primitives";
import { DayPeriodBadge, TimeDisplay } from "@/components/clock/parts";

function halfStyle(custom: string | undefined, fallback: "a" | "b"): CSSProperties {
  if (custom) {
    return { backgroundColor: custom, color: readableTextOn(custom) };
  }
  return fallback === "a"
    ? { backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }
    : { backgroundColor: "var(--color-secondary)", color: "var(--color-on-secondary)" };
}

function Half({
  loc,
  now,
  pref,
  cycle,
  side,
  dayDiff,
  interactive,
}: {
  loc: Location;
  now: number;
  pref: DuoPreference;
  cycle: HourCycle;
  side: "a" | "b";
  dayDiff: number;
  interactive: boolean;
}) {
  const p = now ? getZonedParts(now, loc.tz) : null;
  const period = now ? dayPeriod(solarAltitude(now, loc.lat, loc.lon)) : null;
  const custom = pref.themeOverrides?.[side];
  const confort = pref.layoutMode === "confort";
  return (
    <div
      className={cx(
        "hs-themed flex min-w-0 flex-1 flex-col justify-center",
        side === "a" ? "items-start text-left" : "items-end text-right",
        confort ? "gap-1 px-4 py-3" : "px-3 py-2",
      )}
      style={halfStyle(custom, side)}
      data-side={side}
    >
      <div className={cx("flex max-w-full min-w-0 items-center gap-1.5 font-bold", confort ? "text-[0.95rem]" : "text-[0.8rem]", side === "b" && "flex-row-reverse")}>
        <Flag cc={loc.cc} />
        {interactive ? (
          <Link href={`/ville/${loc.id}`} className="truncate hover:underline">
            {loc.city}
          </Link>
        ) : (
          <span className="truncate">{loc.city}</span>
        )}
      </div>
      <div className={cx("flex items-baseline gap-2", side === "b" && "flex-row-reverse")}>
        <TimeDisplay
          parts={p}
          cycle={cycle}
          seconds={false}
          className={cx("leading-none font-bold tracking-tight", confort ? "text-[2rem]" : "text-[1.45rem]")}
        />
        {period && p && <DayPeriodBadge period={period} hour={p.hour} compact={!confort} className="text-[0.78rem] opacity-90" />}
      </div>
      {pref.showDate && p && (
        <p className={cx("text-[0.75rem] font-semibold opacity-85", !confort && "sr-only")}>
          {capitalize(formatShortDate(p))}
          {side === "b" && dayDiff !== 0 && ` · ${relativeDayLabel(dayDiff)}`}
        </p>
      )}
      {!confort && pref.showDate && side === "b" && dayDiff !== 0 && (
        <p className="text-[0.7rem] font-bold opacity-90" aria-hidden>
          {dayDiff > 0 ? "demain" : "hier"}
        </p>
      )}
    </div>
  );
}

/** Module compact « Deux mondes » : deux villes et leurs heures côte à côte. */
export function DuoStrip({
  pref,
  now,
  cycle,
  interactive = true,
  className,
  headingLevel = 2,
}: {
  pref: DuoPreference;
  now: number;
  cycle: HourCycle;
  interactive?: boolean;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const a = getLocation(pref.locationIdA);
  const b = getLocation(pref.locationIdB);
  if (!a || !b) return null;
  const pa = now ? getZonedParts(now, a.tz) : null;
  const pb = now ? getZonedParts(now, b.tz) : null;
  const delta = pa && pb ? pb.offsetMinutes - pa.offsetMinutes : null;
  const dayDiff = pa && pb ? calendarDayDiff(pa, pb) : 0;
  const confort = pref.layoutMode === "confort";
  const H = headingLevel === 2 ? "h2" : "h3";

  const deltaContent = (
    <>
      <ArrowLeftRight className="size-3.5" aria-hidden />
      <span className="tabular">{delta === null ? "…" : formatDelta(delta, { zeroLabel: "=" })}</span>
    </>
  );

  return (
    <section
      aria-label={`Deux mondes : ${a.city} et ${b.city}`}
      className={cx(
        "hs-themed relative flex w-full items-stretch overflow-hidden rounded-card border border-border shadow-card",
        confort ? "min-h-[104px]" : "min-h-[60px]",
        className,
      )}
    >
      <H className="sr-only">Deux mondes</H>
      <Half loc={a} now={now} pref={pref} cycle={cycle} side="a" dayDiff={0} interactive={interactive} />
      {pref.showDelta && (
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          {interactive ? (
            <Link
              href={`/comparer?a=${a.id}&b=${b.id}`}
              aria-label={`Écart ${delta === null ? "" : formatDelta(delta)} — ouvrir le comparateur`}
              className="flex items-center gap-1 rounded-full border border-border-surface bg-surface px-2.5 py-1 text-[0.75rem] font-bold whitespace-nowrap text-on-surface shadow-card transition-transform hover:scale-105"
            >
              {deltaContent}
            </Link>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-border-surface bg-surface px-2.5 py-1 text-[0.75rem] font-bold whitespace-nowrap text-on-surface shadow-card">
              {deltaContent}
            </span>
          )}
        </div>
      )}
      <Half loc={b} now={now} pref={pref} cycle={cycle} side="b" dayDiff={dayDiff} interactive={interactive} />
    </section>
  );
}
