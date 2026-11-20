"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Star } from "lucide-react";
import { countryName, type Location } from "@/lib/catalog";
import { formatDelta, formatUtcOffset } from "@/lib/time/engine";
import { capitalize, formatShortDate, relativeDayLabel } from "@/lib/time/format";
import type { AppSettings } from "@/lib/state/settings";
import type { CardStyle, ClockOverride, ClockStyle } from "@/lib/theme/tokens";
import { cx, Flag } from "@/components/ui/primitives";
import { AnalogDial, DayPeriodBadge, TimeDisplay } from "./parts";
import type { LocationTime } from "./use-location-time";

/** Accent par défaut d'une carte : alterne les couleurs du thème (jamais une couleur en dur). */
export const DEFAULT_ACCENTS = ["var(--color-primary)", "var(--color-secondary)"];

export function cardBackground(style: CardStyle): CSSProperties {
  if (style === "uni") return {};
  if (style === "motif") return {};
  return {
    backgroundImage:
      "radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--hs-accent) calc(var(--gradient-strength) * 34%), transparent), transparent 62%)",
  };
}

export function ClockCard({
  location,
  info,
  settings,
  clockStyle,
  cardStyle,
  override,
  accentIndex = 0,
  isFavorite,
  onToggleFavorite,
  label,
  footer,
  className,
}: {
  location: Location;
  info: LocationTime | null;
  settings: Pick<AppSettings, "hourCycle" | "showSeconds">;
  clockStyle: ClockStyle;
  cardStyle: CardStyle;
  override?: ClockOverride;
  accentIndex?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  /** Étiquette au-dessus du nom (ex. « Votre heure ») */
  label?: string;
  footer?: ReactNode;
  className?: string;
}) {
  const accent = override?.accent ?? DEFAULT_ACCENTS[accentIndex % DEFAULT_ACCENTS.length];
  const style = override?.style ?? cardStyle;
  const p = info?.parts ?? null;
  const country = countryName(location.cc);
  const titleId = `clock-${location.id}`;

  return (
    <article
      aria-labelledby={titleId}
      style={{ "--hs-accent": accent, ...cardBackground(style) } as CSSProperties}
      className={cx(
        "hs-themed group relative isolate flex min-w-0 flex-col overflow-hidden rounded-card border border-border-surface bg-surface p-5 text-on-surface shadow-card",
        "transition-transform duration-(--motion-duration) hover:-translate-y-0.5 focus-within:-translate-y-0.5",
        style === "motif" && "hs-card-motif",
        className,
      )}
    >
      <span aria-hidden className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-(--hs-accent)" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {label && <p className="mb-1 text-[0.7rem] font-bold tracking-[0.14em] text-on-surface-muted uppercase">{label}</p>}
          <h3 id={titleId} className="flex items-center gap-2 font-display text-[1.35rem] leading-tight font-semibold">
            <Flag cc={location.cc} />
            <Link
              href={`/ville/${location.id}`}
              className="truncate after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-card focus-visible:after:outline-3 focus-visible:after:outline-focus"
            >
              {location.city}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-on-surface-muted">
            {country}
            {location.region ? ` · ${location.region}` : ""}
          </p>
        </div>
        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={!!isFavorite}
            aria-label={isFavorite ? `Retirer ${location.city} des favoris` : `Ajouter ${location.city} aux favoris`}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            className="relative z-10 -mt-1 -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-control text-on-surface-muted transition-colors hover:text-on-surface"
          >
            <Star className={cx("size-5", isFavorite && "fill-current text-primary-ink-surface")} aria-hidden />
          </button>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <TimeDisplay
            parts={p}
            cycle={settings.hourCycle}
            seconds={settings.showSeconds}
            className="block text-[2.6rem] leading-none font-semibold tracking-tight sm:text-[2.85rem]"
            secondsClassName="text-[0.55em] font-medium"
          />
          <p className="mt-2 text-sm font-medium text-on-surface-muted" suppressHydrationWarning>
            {p ? (
              <>
                {capitalize(formatShortDate(p))}
                <span aria-hidden> · </span>
                {formatUtcOffset(p.offsetMinutes)}
              </>
            ) : (
              " "
            )}
          </p>
        </div>
        {clockStyle === "cadran" && <AnalogDial parts={p} seconds={settings.showSeconds} size={72} className="text-on-surface" />}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border-surface pt-3 text-sm">
        {info ? <DayPeriodBadge period={info.period} hour={info.parts.hour} /> : <span>&nbsp;</span>}
        {info && info.deltaToDevice !== null && (
          <span className="font-semibold text-on-surface-muted">
            {info.deltaToDevice === 0 ? "votre heure" : `${formatDelta(info.deltaToDevice)} / vous`}
            {info.dayDiffToDevice ? ` · ${relativeDayLabel(info.dayDiffToDevice)}` : ""}
          </span>
        )}
      </div>
      {footer && <div className="relative z-10 mt-3">{footer}</div>}
    </article>
  );
}
