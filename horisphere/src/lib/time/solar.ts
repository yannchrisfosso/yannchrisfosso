/**
 * Calculs solaires (algorithme simplifié de la NOAA, précision de l'ordre de la minute).
 * Servent à l'état jour/nuit d'une ville à partir de ses coordonnées réelles et de l'instant,
 * y compris dans les régions polaires (jour ou nuit continus) — jamais une règle fixe 6 h–18 h.
 */
import type { Instant } from "./engine";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export interface SunPosition {
  /** Déclinaison solaire en degrés */
  declination: number;
  /** Équation du temps en minutes */
  equationOfTime: number;
}

export function sunPosition(instant: Instant): SunPosition {
  const jd = instant / 86_400_000 + 2440587.5;
  const t = (jd - 2451545) / 36525; // siècles juliens depuis J2000
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c =
    Math.sin(m * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m * RAD) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m * RAD) * 0.000289;
  const trueLong = l0 + c;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const declination = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) * DEG;
  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eqTime =
    4 *
    DEG *
    (y * Math.sin(2 * l0 * RAD) -
      2 * e * Math.sin(m * RAD) +
      4 * e * y * Math.sin(m * RAD) * Math.cos(2 * l0 * RAD) -
      0.5 * y * y * Math.sin(4 * l0 * RAD) -
      1.25 * e * e * Math.sin(2 * m * RAD));
  return { declination, equationOfTime: eqTime };
}

/** Point sub-solaire (où le soleil est au zénith). */
export function subsolarPoint(instant: Instant): { lat: number; lon: number } {
  const { declination, equationOfTime } = sunPosition(instant);
  const d = new Date(instant);
  const utcMinutes = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  let lon = -15 * ((utcMinutes + equationOfTime) / 60 - 12);
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat: declination, lon };
}

/** Hauteur du soleil (degrés) au-dessus de l'horizon, pour un lieu et un instant. */
export function solarAltitude(instant: Instant, lat: number, lon: number): number {
  const sub = subsolarPoint(instant);
  const h = (lon - sub.lon) * RAD; // angle horaire
  const sinAlt =
    Math.sin(lat * RAD) * Math.sin(sub.lat * RAD) + Math.cos(lat * RAD) * Math.cos(sub.lat * RAD) * Math.cos(h);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * DEG;
}

export type DayPeriod = "day" | "golden" | "twilight" | "night";

/** Seuils : lever/coucher à −0,833° (réfraction + rayon solaire), crépuscule civil à −6°. */
export const SUNRISE_ALTITUDE = -0.833;

export function dayPeriod(altitude: number): DayPeriod {
  if (altitude >= 6) return "day";
  if (altitude >= SUNRISE_ALTITUDE) return "golden";
  if (altitude >= -6) return "twilight";
  return "night";
}

export const DAY_PERIOD_LABEL: Record<DayPeriod, string> = {
  day: "Jour",
  golden: "Soleil bas",
  twilight: "Crépuscule",
  night: "Nuit",
};

export interface SunTimes {
  sunrise: Instant | null;
  sunset: Instant | null;
  /** 'polar-day' : soleil levé toute la journée ; 'polar-night' : jamais levé */
  polar: "polar-day" | "polar-night" | null;
}

/**
 * Lever et coucher du soleil sur l'intervalle [dayStart, dayEnd[ (une journée locale).
 * Balayage par pas de 10 min puis dichotomie à la seconde.
 */
export function sunTimes(dayStart: Instant, dayEnd: Instant, lat: number, lon: number): SunTimes {
  const step = 10 * 60_000;
  let sunrise: Instant | null = null;
  let sunset: Instant | null = null;
  let prevT = dayStart;
  let prevA = solarAltitude(prevT, lat, lon) - SUNRISE_ALTITUDE;
  let anyUp = prevA >= 0;
  for (let t = dayStart + step; t <= dayEnd; t += step) {
    const a = solarAltitude(t, lat, lon) - SUNRISE_ALTITUDE;
    if (a >= 0) anyUp = true;
    if ((prevA < 0 && a >= 0) || (prevA >= 0 && a < 0)) {
      let lo = prevT;
      let hi = t;
      const rising = prevA < 0;
      while (hi - lo > 1000) {
        const mid = (lo + hi) / 2;
        const am = solarAltitude(mid, lat, lon) - SUNRISE_ALTITUDE;
        if ((am >= 0) === rising) hi = mid;
        else lo = mid;
      }
      if (rising && sunrise === null) sunrise = Math.round(hi);
      if (!rising && sunset === null) sunset = Math.round(hi);
    }
    prevT = t;
    prevA = a;
  }
  let polar: SunTimes["polar"] = null;
  if (sunrise === null && sunset === null) polar = anyUp ? "polar-day" : "polar-night";
  return { sunrise, sunset, polar };
}

/**
 * Opacité de la nuit (0 = plein jour, 1 = nuit noire) selon la hauteur du soleil,
 * avec un dégradé continu sur le crépuscule (de −0,833° à −12°).
 */
export function nightShade(altitude: number): number {
  const start = SUNRISE_ALTITUDE + 1.5;
  const end = -12;
  if (altitude >= start) return 0;
  if (altitude <= end) return 1;
  const x = (start - altitude) / (start - end);
  return x * x * (3 - 2 * x);
}

/** Hauteur du soleil à partir d'un point sub-solaire déjà calculé (pour les boucles par pixel). */
export function altitudeFromSubsolar(lat: number, lon: number, sub: { lat: number; lon: number }): number {
  const sinAlt =
    Math.sin(lat * RAD) * Math.sin(sub.lat * RAD) + Math.cos(lat * RAD) * Math.cos(sub.lat * RAD) * Math.cos((lon - sub.lon) * RAD);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * DEG;
}
