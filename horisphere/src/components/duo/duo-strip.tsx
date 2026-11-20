"use client";

import Link from "next/link";
import { useId, type CSSProperties } from "react";
import { ArrowLeftRight } from "lucide-react";
import { getLocation, type Location } from "@/lib/catalog";
import { calendarDayDiff, formatDelta, getZonedParts } from "@/lib/time/engine";
import { capitalize, formatShortDate, relativeDayLabel, type HourCycle } from "@/lib/time/format";
import { dayPeriod, solarAltitude } from "@/lib/time/solar";
import { cardColors, type CardColors } from "@/lib/theme/tokens";
import { useResolvedTheme } from "@/lib/state/theme";
import type { DuoPreference } from "@/lib/state/duo";
import { cx, Flag } from "@/components/ui/primitives";
import { DayPeriodBadge, TimeDisplay } from "@/components/clock/parts";

function Half({
  loc,
  now,
  pref,
  cycle,
  side,
  dayDiff,
  interactive,
  colors,
}: {
  loc: Location;
  now: number;
  pref: DuoPreference;
  cycle: HourCycle;
  side: "a" | "b";
  dayDiff: number;
  interactive: boolean;
  colors: CardColors;
}) {
  const p = now ? getZonedParts(now, loc.tz) : null;
  const period = now ? dayPeriod(solarAltitude(now, loc.lat, loc.lon)) : null;
  const confort = pref.layoutMode === "confort";
  const end = side === "b";
  return (
    <div
      className={cx(
        "relative z-[1] flex min-w-0 flex-1 flex-col justify-center",
        end ? "items-end pr-4 pl-10 text-right" : "items-start pr-10 pl-4 text-left",
        confort ? "gap-1 py-3" : "py-2",
      )}
      style={{ color: colors.ink }}
      data-side={side}
    >
      <div className={cx("flex max-w-full min-w-0 items-center gap-1.5 font-bold", confort ? "text-[0.95rem]" : "text-[0.8rem]", end && "flex-row-reverse")}>
        <Flag cc={loc.cc} round className="text-[0.85rem]" />
        {interactive ? (
          <Link href={`/ville/${loc.id}`} className="truncate hover:underline">
            {loc.city}
          </Link>
        ) : (
          <span className="truncate">{loc.city}</span>
        )}
      </div>
      <div className={cx("flex items-center gap-2", end && "flex-row-reverse")}>
        <TimeDisplay
          parts={p}
          cycle={cycle}
          seconds={false}
          className={cx("font-display leading-none font-semibold tracking-tight", confort ? "text-[2.1rem]" : "text-[1.5rem]")}
        />
        {period && p && <DayPeriodBadge period={period} hour={p.hour} iconOnly={!confort} className="text-[0.78rem]" />}
      </div>
      {pref.showDate && p && (
        <p className={cx("text-[0.75rem] font-semibold", !confort && "sr-only")} style={{ color: colors.inkMuted }}>
          {capitalize(formatShortDate(p))}
          {end && dayDiff !== 0 && ` · ${relativeDayLabel(dayDiff)}`}
        </p>
      )}
      {!confort && pref.showDate && end && dayDiff !== 0 && (
        <p className="text-[0.7rem] font-bold" aria-hidden>
          {dayDiff > 0 ? "demain" : "hier"}
        </p>
      )}
    </div>
  );
}

/** Module compact « Deux mondes » : deux villes côte à côte, séparées par une diagonale courbe. */
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
  const theme = useResolvedTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const a = getLocation(pref.locationIdA);
  const b = getLocation(pref.locationIdB);
  if (!a || !b) return null;
  const ca = cardColors(pref.themeOverrides?.a ?? theme.duo[0], theme);
  const cb = cardColors(pref.themeOverrides?.b ?? theme.duo[1], theme);
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
  const pill =
    "flex items-center gap-1 rounded-full border border-border-glow bg-surface px-2.5 py-1 text-[0.75rem] font-bold whitespace-nowrap text-on-surface shadow-card";

  return (
    <section
      aria-label={`Deux mondes : ${a.city} et ${b.city}`}
      className={cx(
        "hs-themed relative flex w-full items-stretch overflow-hidden rounded-card border border-[color-mix(in_srgb,var(--color-border-glow)_80%,transparent)] shadow-[0_18px_40px_-24px_var(--color-halo)]",
        confort ? "min-h-[104px]" : "min-h-[62px]",
        className,
      )}
    >
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden focusable="false">
        <defs>
          <linearGradient id={`${uid}a`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: ca.from } as CSSProperties} />
            <stop offset="0.55" style={{ stopColor: ca.mid } as CSSProperties} />
            <stop offset="1" style={{ stopColor: ca.to } as CSSProperties} />
          </linearGradient>
          <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: cb.from } as CSSProperties} />
            <stop offset="0.5" style={{ stopColor: cb.mid } as CSSProperties} />
            <stop offset="1" style={{ stopColor: cb.to } as CSSProperties} />
          </linearGradient>
        </defs>
        <path d="M0 0 H57 C 47 34, 58 66, 45 100 H0 Z" fill={`url(#${uid}a)`} />
        <path d="M57 0 H100 V100 H45 C 58 66, 47 34, 57 0 Z" fill={`url(#${uid}b)`} />
        <path d="M57 0 C 47 34, 58 66, 45 100" fill="none" stroke="var(--color-border-glow)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </svg>
      <H className="sr-only">Deux mondes</H>
      <Half loc={a} now={now} pref={pref} cycle={cycle} side="a" dayDiff={0} interactive={interactive} colors={ca} />
      {pref.showDelta && (
        <div className="absolute top-1/2 left-[51%] z-10 -translate-x-1/2 -translate-y-1/2">
          {interactive ? (
            <Link
              href={`/comparer?a=${a.id}&b=${b.id}`}
              aria-label={`Écart ${delta === null ? "" : formatDelta(delta)} — ouvrir le comparateur`}
              className={cx(pill, "transition-transform hover:scale-105")}
            >
              {deltaContent}
            </Link>
          ) : (
            <span className={pill}>{deltaContent}</span>
          )}
        </div>
      )}
      <Half loc={b} now={now} pref={pref} cycle={cycle} side="b" dayDiff={dayDiff} interactive={interactive} colors={cb} />
    </section>
  );
}
