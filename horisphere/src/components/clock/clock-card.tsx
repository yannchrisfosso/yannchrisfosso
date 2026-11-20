"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Star } from "lucide-react";
import { countryName, type Location } from "@/lib/catalog";
import { formatDelta, formatUtcOffset } from "@/lib/time/engine";
import { capitalize, formatShortDate, relativeDayLabel } from "@/lib/time/format";
import type { AppSettings } from "@/lib/state/settings";
import { useResolvedTheme } from "@/lib/state/theme";
import { cardColors, type CardColors, type CardStyle, type ClockOverride, type ClockStyle } from "@/lib/theme/tokens";
import { cx, Flag } from "@/components/ui/primitives";
import { CityIllustration } from "./city-illustration";
import { AnalogDial, DayPeriodBadge, TimeDisplay } from "./parts";
import type { LocationTime } from "./use-location-time";

/** Accent par défaut d'un favori dans les listes : alterne les couleurs du thème. */
export const DEFAULT_ACCENTS = ["var(--color-primary)", "var(--color-secondary)"];

/** Variables CSS d'une carte colorée (dégradé + encre garantie lisible). */
export function cardVars(c: CardColors, accent: string): CSSProperties {
  return {
    "--hs-accent": accent,
    "--hs-card-from": c.from,
    "--hs-card-mid": c.mid,
    "--hs-card-to": c.to,
    "--hs-card-ink": c.ink,
    "--hs-card-ink-muted": c.inkMuted,
    "--hs-card-chip": c.chip,
    "--hs-card-dial": c.dial,
    "--hs-card-dial-ink": c.dialInk,
  } as CSSProperties;
}

export function cardBackground(style: CardStyle): CSSProperties {
  if (style === "uni") return { background: "var(--hs-card-mid)" };
  return { background: "linear-gradient(165deg, var(--hs-card-from) 0%, var(--hs-card-mid) 52%, var(--hs-card-to) 100%)" };
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
  const theme = useResolvedTheme();
  const accent = override?.accent ?? theme.cardAccents[accentIndex % theme.cardAccents.length];
  const colors = cardColors(accent, theme);
  const style = override?.style ?? cardStyle;
  const p = info?.parts ?? null;
  const country = countryName(location.cc);
  const titleId = `clock-${location.id}`;
  const night = info ? info.period === "night" || info.period === "twilight" : false;

  return (
    <article
      aria-labelledby={titleId}
      style={{ ...cardVars(colors, accent), ...cardBackground(style), color: "var(--hs-card-ink)" }}
      className={cx(
        "hs-themed group relative isolate flex min-w-0 flex-col overflow-hidden rounded-card",
        "border border-[color-mix(in_srgb,var(--color-border-glow)_75%,transparent)] shadow-[0_20px_45px_-25px_var(--color-halo)]",
        "transition-transform duration-(--motion-duration) hover:-translate-y-0.5 focus-within:-translate-y-0.5",
        style === "motif" && "hs-card-motif",
        className,
      )}
    >
      <div className="relative z-[1] flex flex-col gap-3 p-4 pb-2 sm:p-5 sm:pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Flag cc={location.cc} round className="text-[1.15rem]" />
            <div className="min-w-0">
              {label && <p className="text-[0.65rem] font-bold tracking-[0.14em] uppercase opacity-90">{label}</p>}
              <h3 id={titleId} className="font-display text-[1.3rem] leading-tight font-semibold">
                <Link
                  href={`/ville/${location.id}`}
                  className="block truncate after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-card focus-visible:after:outline-3 focus-visible:after:outline-focus"
                >
                  {location.city}
                </Link>
              </h3>
              <p className="truncate text-[0.8rem] font-medium text-(--hs-card-ink-muted)">
                {country}
              </p>
            </div>
          </div>
          {info && (
            <span className="relative z-[1] shrink-0 rounded-full bg-(--hs-card-chip) px-2.5 py-1 text-xs">
              <DayPeriodBadge period={info.period} hour={info.parts.hour} />
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <TimeDisplay
              parts={p}
              cycle={settings.hourCycle}
              seconds={false}
              className="block font-display text-[2.35rem] leading-none font-semibold tracking-tight sm:text-[2.55rem]"
            />
            <p className="mt-1.5 text-[0.8rem] font-semibold whitespace-nowrap" suppressHydrationWarning>
              {p ? capitalize(formatShortDate(p)) + " " + p.year : " "}
            </p>
            <p className="text-[0.75rem] font-medium text-(--hs-card-ink-muted)">
              {p ? formatUtcOffset(p.offsetMinutes) : " "}
              {info && info.deltaToDevice !== null && (
                <>
                  {" · "}
                  {info.deltaToDevice === 0 ? "votre heure" : `${formatDelta(info.deltaToDevice)} / vous`}
                  {info.dayDiffToDevice ? ` · ${relativeDayLabel(info.dayDiffToDevice)}` : ""}
                </>
              )}
            </p>
          </div>
          {clockStyle === "cadran" && (
            <AnalogDial
              parts={p}
              seconds={settings.showSeconds}
              size={62}
              dark
              className="shrink-0 drop-shadow-[0_6px_10px_var(--color-halo)]"
            />
          )}
        </div>
      </div>

      <div className="relative mt-auto h-24 pt-2 sm:h-28">
        <CityIllustration location={location} night={night} className="absolute inset-0" />
        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={!!isFavorite}
            aria-label={isFavorite ? `Retirer ${location.city} des favoris` : `Ajouter ${location.city} aux favoris`}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            className="absolute right-3 bottom-3 z-10 inline-flex size-10 items-center justify-center rounded-full bg-(--hs-card-chip) backdrop-blur-sm transition-transform hover:scale-105"
          >
            <Star className={cx("size-5", isFavorite && "fill-current")} aria-hidden />
          </button>
        )}
      </div>
      {footer && <div className="relative z-10 p-4">{footer}</div>}
    </article>
  );
}
