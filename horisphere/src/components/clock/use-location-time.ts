"use client";

import { useMemo } from "react";
import type { Location } from "@/lib/catalog";
import { calendarDayDiff, getZonedParts, type ZonedParts } from "@/lib/time/engine";
import { dayPeriod, solarAltitude, type DayPeriod } from "@/lib/time/solar";

export interface LocationTime {
  parts: ZonedParts;
  period: DayPeriod;
  /** Écart (minutes) par rapport à l'heure de l'appareil */
  deltaToDevice: number | null;
  /** Écart en jours calendaires par rapport à la date de l'appareil */
  dayDiffToDevice: number | null;
}

export function computeLocationTime(location: Location, now: number, deviceZone: string | null): LocationTime {
  const parts = getZonedParts(now, location.tz);
  const period = dayPeriod(solarAltitude(now, location.lat, location.lon));
  let deltaToDevice: number | null = null;
  let dayDiffToDevice: number | null = null;
  if (deviceZone) {
    const dev = getZonedParts(now, deviceZone);
    deltaToDevice = parts.offsetMinutes - dev.offsetMinutes;
    dayDiffToDevice = calendarDayDiff(dev, parts);
  }
  return { parts, period, deltaToDevice, dayDiffToDevice };
}

/** Heure d'un lieu ; null tant que l'horloge n'a pas démarré côté client (évite les écarts d'hydratation). */
export function useLocationTime(location: Location | undefined, now: number, deviceZone: string | null): LocationTime | null {
  return useMemo(
    () => (location && now ? computeLocationTime(location, now, deviceZone) : null),
    [location, now, deviceZone],
  );
}
