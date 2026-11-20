"use client";

import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { cx } from "@/components/ui/primitives";
import { timeText, type HourCycle } from "@/lib/time/format";
import { DAY_PERIOD_LABEL, type DayPeriod } from "@/lib/time/solar";
import type { WallTime } from "@/lib/time/engine";

/** Indicateur jour/nuit : toujours une icône ET un mot (jamais la couleur seule). */
export function DayPeriodBadge({
  period,
  hour,
  className,
  compact,
  iconOnly,
}: {
  period: DayPeriod;
  hour: number;
  className?: string;
  compact?: boolean;
  /** Icône seule (le mot reste lu par les lecteurs d'écran) */
  iconOnly?: boolean;
}) {
  const Icon = period === "day" ? Sun : period === "night" ? Moon : hour < 12 ? Sunrise : Sunset;
  const label = period === "golden" ? (hour < 12 ? "Lever du soleil" : "Coucher du soleil") : DAY_PERIOD_LABEL[period];
  return (
    <span className={cx("inline-flex items-center gap-1.5 font-semibold", className)}>
      <Icon className={compact ? "size-3.5" : "size-4"} aria-hidden />
      <span className={iconOnly ? "sr-only" : compact ? "sr-only sm:not-sr-only" : undefined}>{label}</span>
    </span>
  );
}

/** Affichage d'une heure : chiffres tabulaires, secondes plus discrètes. */
export function TimeDisplay({
  parts,
  cycle,
  seconds,
  className,
  secondsClassName,
}: {
  parts: Pick<WallTime, "hour" | "minute" | "second"> | null;
  cycle: HourCycle;
  seconds: boolean;
  className?: string;
  secondsClassName?: string;
}) {
  if (!parts) {
    return (
      <span className={cx("tabular", className)} aria-hidden>
        --:--
      </span>
    );
  }
  const t = timeText(parts, cycle);
  return (
    <span className={cx("tabular whitespace-nowrap", className)}>
      {t.main}
      {seconds && <span className={cx("opacity-60", secondsClassName)}>:{t.seconds}</span>}
      {t.suffix && <span className="ml-1 text-[0.4em] font-bold tracking-wide">{t.suffix}</span>}
    </span>
  );
}

/** Cadran analogique (SVG). Les aiguilles sont calculées, sans animation permanente. */
export function AnalogDial({
  parts,
  seconds,
  className,
  size = 76,
  dark,
}: {
  parts: Pick<WallTime, "hour" | "minute" | "second"> | null;
  seconds: boolean;
  className?: string;
  size?: number;
  /** Cadran sombre à aiguilles dorées (cartes colorées) */
  dark?: boolean;
}) {
  if (dark) return <DarkDial parts={parts} seconds={seconds} className={className} size={size} />;
  const h = parts ? ((parts.hour % 12) + parts.minute / 60) * 30 : 0;
  const m = parts ? (parts.minute + parts.second / 60) * 6 : 0;
  const s = parts ? parts.second * 6 : 0;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cx("shrink-0", className)} aria-hidden>
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1={i % 3 === 0 ? 7 : 9}
          x2="50"
          y2="13"
          stroke="currentColor"
          strokeOpacity={i % 3 === 0 ? 0.75 : 0.35}
          strokeWidth={i % 3 === 0 ? 3 : 2}
          strokeLinecap="round"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      {parts && (
        <>
          <line x1="50" y1="54" x2="50" y2="28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" transform={`rotate(${h} 50 50)`} />
          <line x1="50" y1="56" x2="50" y2="17" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" transform={`rotate(${m} 50 50)`} />
          {seconds && (
            <line
              x1="50"
              y1="60"
              x2="50"
              y2="14"
              stroke="var(--hs-accent, var(--color-primary))"
              strokeWidth="1.6"
              strokeLinecap="round"
              transform={`rotate(${s} 50 50)`}
            />
          )}
          <circle cx="50" cy="50" r="3.6" fill="var(--hs-accent, var(--color-primary))" />
        </>
      )}
    </svg>
  );
}

function DarkDial({
  parts,
  seconds,
  className,
  size,
}: {
  parts: Pick<WallTime, "hour" | "minute" | "second"> | null;
  seconds: boolean;
  className?: string;
  size: number;
}) {
  const h = parts ? ((parts.hour % 12) + parts.minute / 60) * 30 : 0;
  const m = parts ? (parts.minute + parts.second / 60) * 6 : 0;
  const s = parts ? parts.second * 6 : 0;
  const gold = "var(--hs-card-dial-ink)";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cx("shrink-0", className)} aria-hidden>
      <circle cx="50" cy="50" r="48" fill="var(--hs-card-dial)" stroke={gold} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="42" fill="none" stroke={gold} strokeOpacity="0.3" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1={i % 3 === 0 ? 10 : 12}
          x2="50"
          y2="16"
          stroke={gold}
          strokeOpacity={i % 3 === 0 ? 1 : 0.55}
          strokeWidth={i % 3 === 0 ? 3 : 1.6}
          strokeLinecap="round"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      {parts && (
        <>
          <line x1="50" y1="55" x2="50" y2="30" stroke={gold} strokeWidth="5" strokeLinecap="round" transform={`rotate(${h} 50 50)`} />
          <line x1="50" y1="57" x2="50" y2="18" stroke={gold} strokeWidth="3.2" strokeLinecap="round" transform={`rotate(${m} 50 50)`} />
          {seconds && (
            <line x1="50" y1="60" x2="50" y2="16" stroke="var(--hs-card-from)" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${s} 50 50)`} />
          )}
          <circle cx="50" cy="50" r="3.8" fill={gold} />
        </>
      )}
    </svg>
  );
}
