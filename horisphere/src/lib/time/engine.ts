/**
 * Moteur horaire Horisphère.
 *
 * Principe : tout part d'un instant UTC commun (millisecondes epoch) et de l'identifiant IANA d'un lieu.
 * Les décalages ne sont jamais codés en dur : ils sont lus à chaque calcul dans les règles tzdb
 * embarquées par le moteur JavaScript (Intl.DateTimeFormat), ce qui gère l'heure d'été, les décalages
 * de 30/45 minutes et les changements de date.
 *
 * Ce module est pur (aucune dépendance au DOM ni à React) pour être testé seul et réutilisé plus tard
 * par des applications compagnons natives.
 */

export type Instant = number; // millisecondes depuis l'epoch Unix (UTC)

export interface WallTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
}

export interface ZonedParts extends WallTime {
  weekday: number; // 0 = dimanche … 6 = samedi
  offsetMinutes: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
      era: "short",
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Vrai si le moteur JavaScript courant connaît cette zone IANA. */
export function isSupportedTimeZone(timeZone: string): boolean {
  try {
    partsFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Fuseau horaire de l'appareil (sans géolocalisation). */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Date et heure murales d'un instant dans une zone IANA, avec le décalage UTC effectif. */
export function getZonedParts(instant: Instant, timeZone: string): ZonedParts {
  const raw: Record<string, string> = {};
  for (const p of partsFormatter(timeZone).formatToParts(new Date(instant))) raw[p.type] = p.value;
  let year = Number(raw.year);
  if (raw.era === "BC" || raw.era === "B") year = 1 - year;
  const wall: WallTime = {
    year,
    month: Number(raw.month),
    day: Number(raw.day),
    hour: Number(raw.hour) % 24, // certains moteurs anciens renvoient « 24 » à minuit
    minute: Number(raw.minute),
    second: Number(raw.second),
  };
  const asUtc = wallToUtcMs(wall);
  const floored = instant - (((instant % 1000) + 1000) % 1000);
  return {
    ...wall,
    weekday: WEEKDAYS[raw.weekday] ?? new Date(asUtc).getUTCDay(),
    offsetMinutes: Math.round((asUtc - floored) / MINUTE),
  };
}

/** Décalage UTC (en minutes) d'une zone à un instant donné. Ex. Kolkata → 330. */
export function getOffsetMinutes(instant: Instant, timeZone: string): number {
  return getZonedParts(instant, timeZone).offsetMinutes;
}

export function wallToUtcMs(w: WallTime): number {
  const d = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  // Date.UTC interprète 0-99 comme 1900-1999
  if (w.year >= 0 && w.year < 100) {
    const dt = new Date(d);
    dt.setUTCFullYear(w.year);
    return dt.getTime();
  }
  return d;
}

/** « UTC+5:45 », « UTC−3:30 », « UTC » */
export function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC";
  const sign = offsetMinutes > 0 ? "+" : "−";
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

/** Écart court entre deux décalages : « +6 h », « −4 h 30 », « même heure » */
export function formatDelta(deltaMinutes: number, opts: { zeroLabel?: string } = {}): string {
  if (deltaMinutes === 0) return opts.zeroLabel ?? "même heure";
  const sign = deltaMinutes > 0 ? "+" : "−";
  const abs = Math.abs(deltaMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m} min`;
  return `${sign}${h} h${m ? " " + String(m).padStart(2, "0") : ""}`;
}

/** Différence (en minutes) entre l'heure locale de B et celle de A au même instant. */
export function zoneDifferenceMinutes(instant: Instant, zoneA: string, zoneB: string): number {
  return getOffsetMinutes(instant, zoneB) - getOffsetMinutes(instant, zoneA);
}

/** Écart en jours calendaires entre deux dates murales (−1, 0, +1…). */
export function calendarDayDiff(a: WallTime, b: WallTime): number {
  const da = Date.UTC(a.year, a.month - 1, a.day);
  const db = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((db - da) / DAY);
}

export type WallResolution =
  | { status: "ok"; instant: Instant }
  | {
      /** Heure répétée (retour à l'heure d'hiver) : deux instants possibles. */
      status: "ambiguous";
      earlier: Instant;
      later: Instant;
      instant: Instant; // choix par défaut : la première occurrence
    }
  | {
      /** Heure sautée (passage à l'heure d'été) : n'existe pas localement. */
      status: "gap";
      /** Instant obtenu en appliquant le décalage d'avant la transition (convention RFC 5545 / Temporal « compatible »). */
      instant: Instant;
      gapMinutes: number;
      /** Heure murale réellement affichée à cet instant. */
      shiftedTo: WallTime;
    };

function sameWall(a: WallTime, b: WallTime): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.second === b.second
  );
}

/**
 * Convertit une heure murale d'une zone en instant(s), en signalant explicitement
 * les heures ambiguës (répétées) et inexistantes (sautées) lors des changements d'heure.
 */
export function resolveWallTime(wall: WallTime, timeZone: string): WallResolution {
  const naive = wallToUtcMs(wall);
  const offsets = new Set<number>();
  for (const probe of [naive - DAY, naive - 6 * HOUR, naive, naive + 6 * HOUR, naive + DAY]) {
    offsets.add(getOffsetMinutes(probe, timeZone));
  }
  const candidates = [...offsets]
    .map((o) => naive - o * MINUTE)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .filter((t) => sameWall(getZonedParts(t, timeZone), wall))
    .sort((a, b) => a - b);

  if (candidates.length === 1) return { status: "ok", instant: candidates[0] };
  if (candidates.length >= 2) {
    return {
      status: "ambiguous",
      earlier: candidates[0],
      later: candidates[candidates.length - 1],
      instant: candidates[0],
    };
  }
  // Heure inexistante : on applique le décalage en vigueur juste avant la transition.
  const before = getOffsetMinutes(naive - DAY, timeZone);
  const after = getOffsetMinutes(naive + DAY, timeZone);
  const instant = naive - before * MINUTE;
  const p = getZonedParts(instant, timeZone);
  return {
    status: "gap",
    instant,
    gapMinutes: Math.abs(after - before),
    shiftedTo: { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second },
  };
}

export interface OffsetTransition {
  instant: Instant;
  fromOffset: number;
  toOffset: number;
}

/**
 * Prochain changement de décalage (heure d'été/hiver) dans l'horizon donné (365 jours par défaut).
 * Recherche par pas de 6 h puis dichotomie à la minute.
 */
export function nextOffsetTransition(from: Instant, timeZone: string, horizonDays = 366): OffsetTransition | null {
  const step = 6 * HOUR;
  let t = from;
  const o = getOffsetMinutes(t, timeZone);
  const end = from + horizonDays * DAY;
  while (t < end) {
    const t2 = Math.min(t + step, end);
    const o2 = getOffsetMinutes(t2, timeZone);
    if (o2 !== o) {
      // Dichotomie sur des minutes entières : lo a l'ancien décalage, hi le nouveau.
      let lo = Math.floor(t / MINUTE);
      let hi = Math.ceil(t2 / MINUTE);
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (getOffsetMinutes(mid * MINUTE, timeZone) === o) lo = mid;
        else hi = mid;
      }
      return { instant: hi * MINUTE, fromOffset: o, toOffset: o2 };
    }
    t = t2;
  }
  return null;
}

/** Ajoute n jours à une date murale (sans fuseau). */
export function addDays(w: Pick<WallTime, "year" | "month" | "day">, n: number) {
  const d = new Date(Date.UTC(w.year, w.month - 1, w.day) + n * DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Instant du début de journée locale (00:00, ou première minute existante si minuit est sauté). */
export function startOfLocalDay(date: Pick<WallTime, "year" | "month" | "day">, timeZone: string): Instant {
  const r = resolveWallTime({ ...date, hour: 0, minute: 0, second: 0 }, timeZone);
  return r.instant;
}

export function toIsoDate(w: Pick<WallTime, "year" | "month" | "day">): string {
  return `${String(w.year).padStart(4, "0")}-${String(w.month).padStart(2, "0")}-${String(w.day).padStart(2, "0")}`;
}

export function parseIsoDate(s: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = +m[1];
  const month = +m[2];
  const day = +m[3];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function parseHm(s: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const hour = +m[1];
  const minute = +m[2];
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export const TIME = { MINUTE, HOUR, DAY } as const;
