/**
 * Formatage français des heures et dates, à partir des parties calculées par le moteur.
 * Les chiffres sont produits ici (et non par Intl) pour garantir la stabilité de largeur
 * et l'absence de différences entre navigateurs.
 */
import type { WallTime, ZonedParts } from "./engine";

export type HourCycle = "h23" | "h12";

const pad = (n: number) => String(n).padStart(2, "0");

export interface TimeText {
  main: string; // « 14:05 » ou « 2:05 »
  seconds: string; // « 09 »
  suffix: string; // « PM » en 12 h, sinon vide
}

export function timeText(p: Pick<WallTime, "hour" | "minute" | "second">, cycle: HourCycle): TimeText {
  if (cycle === "h12") {
    const h = p.hour % 12 === 0 ? 12 : p.hour % 12;
    return { main: `${h}:${pad(p.minute)}`, seconds: pad(p.second), suffix: p.hour < 12 ? "AM" : "PM" };
  }
  return { main: `${pad(p.hour)}:${pad(p.minute)}`, seconds: pad(p.second), suffix: "" };
}

export function formatTime(p: Pick<WallTime, "hour" | "minute" | "second">, cycle: HourCycle, seconds = false): string {
  const t = timeText(p, cycle);
  return `${t.main}${seconds ? ":" + t.seconds : ""}${t.suffix ? " " + t.suffix : ""}`;
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function weekdayOf(p: Pick<WallTime, "year" | "month" | "day">): number {
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

/** « vendredi 20 novembre 2026 » */
export function formatLongDate(p: Pick<ZonedParts, "year" | "month" | "day"> & { weekday?: number }): string {
  const wd = p.weekday ?? weekdayOf(p);
  const day = p.day === 1 ? "1er" : String(p.day);
  return `${JOURS[wd]} ${day} ${MOIS[p.month - 1]} ${p.year}`;
}

/** « ven. 20 nov. » */
export function formatShortDate(p: Pick<ZonedParts, "year" | "month" | "day"> & { weekday?: number }): string {
  const wd = p.weekday ?? weekdayOf(p);
  return `${JOURS_COURTS[wd]} ${p.day} ${MOIS_COURTS[p.month - 1]}`;
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** « aujourd'hui », « demain », « hier », ou « +2 j » */
export function relativeDayLabel(diff: number): string {
  if (diff === 0) return "même jour";
  if (diff === 1) return "le lendemain";
  if (diff === -1) return "la veille";
  return `${diff > 0 ? "+" : "−"}${Math.abs(diff)} j`;
}
