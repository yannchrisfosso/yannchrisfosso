import { describe, expect, it } from "vitest";
import {
  calendarDayDiff,
  formatDelta,
  formatUtcOffset,
  getOffsetMinutes,
  getZonedParts,
  nextOffsetTransition,
  resolveWallTime,
  zoneDifferenceMinutes,
} from "@/lib/time/engine";
import { formatLongDate, formatTime } from "@/lib/time/format";
import { getLocation, locationsOfCountry, countryOffsetCount } from "@/lib/catalog";

const at = (iso: string) => Date.parse(iso);
const QUEBEC = getLocation("quebec-ca")!;
const DOUALA = getLocation("douala-cm")!;

describe("Québec et Douala (critère de recette n° 1)", () => {
  it("utilisent les bonnes zones IANA", () => {
    expect(QUEBEC.tz).toBe("America/Toronto");
    expect(DOUALA.tz).toBe("Africa/Douala");
  });

  it("hiver : Douala a 6 h d'avance sur Québec", () => {
    const t = at("2026-01-15T12:00:00Z");
    expect(getOffsetMinutes(t, QUEBEC.tz)).toBe(-300);
    expect(getOffsetMinutes(t, DOUALA.tz)).toBe(60);
    expect(zoneDifferenceMinutes(t, QUEBEC.tz, DOUALA.tz)).toBe(360);
    expect(formatDelta(360)).toBe("+6 h");
  });

  it("été : Douala a 5 h d'avance sur Québec", () => {
    const t = at("2026-07-15T12:00:00Z");
    expect(getOffsetMinutes(t, QUEBEC.tz)).toBe(-240);
    expect(zoneDifferenceMinutes(t, QUEBEC.tz, DOUALA.tz)).toBe(300);
  });

  it("heure et date murales exactes", () => {
    const t = at("2026-11-20T23:30:15Z");
    const q = getZonedParts(t, QUEBEC.tz);
    const d = getZonedParts(t, DOUALA.tz);
    expect([q.year, q.month, q.day, q.hour, q.minute, q.second]).toEqual([2026, 11, 20, 18, 30, 15]);
    expect([d.year, d.month, d.day, d.hour, d.minute]).toEqual([2026, 11, 21, 0, 30]);
    expect(calendarDayDiff(q, d)).toBe(1);
    expect(formatLongDate(d)).toBe("samedi 21 novembre 2026");
  });
});

describe("pays à plusieurs fuseaux (critère n° 2)", () => {
  const winter = at("2026-01-15T12:00:00Z");
  it("le Canada n'a pas une heure unique", () => {
    const ca = locationsOfCountry("CA");
    const offsets = new Set(ca.map((l) => getOffsetMinutes(winter, l.tz)));
    expect(offsets.size).toBeGreaterThanOrEqual(6);
    expect(getOffsetMinutes(winter, getLocation("vancouver-ca")!.tz)).toBe(-480);
    expect(getOffsetMinutes(winter, getLocation("st-john-s-ca")!.tz)).toBe(-210);
    expect(countryOffsetCount("CA", winter)).toBeGreaterThanOrEqual(6);
  });
  it("États-Unis, Russie, Australie, Brésil, Indonésie, RD Congo sont multi-fuseaux", () => {
    for (const cc of ["US", "RU", "AU", "BR", "ID", "CD", "MX"]) {
      expect(countryOffsetCount(cc, winter), cc).toBeGreaterThan(1);
    }
  });
  it("Cameroun et France n'ont qu'un décalage (hors outre-mer)", () => {
    expect(countryOffsetCount("CM", winter)).toBe(1);
  });
  it("Saskatchewan ne change pas d'heure, contrairement à Toronto", () => {
    const regina = getLocation("regina-ca")!.tz;
    expect(getOffsetMinutes(winter, regina)).toBe(getOffsetMinutes(at("2026-07-15T12:00:00Z"), regina));
  });
});

describe("changements de date (critère n° 3)", () => {
  it("Kiritimati et Honolulu affichent la même heure mais pas le même jour", () => {
    const t = at("2026-11-20T22:00:00Z");
    const k = getZonedParts(t, "Pacific/Kiritimati");
    const h = getZonedParts(t, "Pacific/Honolulu");
    expect(k.hour).toBe(h.hour);
    expect(calendarDayDiff(h, k)).toBe(1);
  });
  it("près de minuit : chaque favori garde sa propre date", () => {
    const t = at("2026-12-31T23:59:30Z");
    expect(getZonedParts(t, "Europe/London").year).toBe(2026);
    expect(getZonedParts(t, "Europe/Paris").year).toBe(2027);
    expect(getZonedParts(t, "Pacific/Auckland").day).toBe(1);
    expect(getZonedParts(t, "America/Toronto").day).toBe(31);
  });
  it("Samoa a sauté le 30 décembre 2011 (changement de côté de la ligne de date)", () => {
    const r = resolveWallTime({ year: 2011, month: 12, day: 30, hour: 12, minute: 0, second: 0 }, "Pacific/Apia");
    expect(r.status).toBe("gap");
  });
});

describe("décalages non entiers (critère n° 4)", () => {
  const cases: [string, string, number][] = [
    ["Inde", "Asia/Kolkata", 330],
    ["Népal", "Asia/Kathmandu", 345],
    ["Iran", "Asia/Tehran", 210],
    ["Afghanistan", "Asia/Kabul", 270],
    ["Myanmar", "Asia/Yangon", 390],
    ["Terre-Neuve (hiver)", "America/St_Johns", -210],
    ["Adélaïde (été austral)", "Australia/Adelaide", 630],
    ["Darwin", "Australia/Darwin", 570],
    ["Eucla", "Australia/Eucla", 525],
    ["Chatham (été austral)", "Pacific/Chatham", 825],
    ["Marquises", "Pacific/Marquesas", -570],
    ["Lord Howe (été austral, DST de 30 min)", "Australia/Lord_Howe", 660],
  ];
  it.each(cases)("%s", (_n, tz, expected) => {
    expect(getOffsetMinutes(at("2026-01-15T12:00:00Z"), tz)).toBe(expected);
  });
  it("Lord Howe ne recule que de 30 minutes en hiver austral", () => {
    expect(getOffsetMinutes(at("2026-07-15T12:00:00Z"), "Australia/Lord_Howe")).toBe(630);
  });
  it("formatage des décalages", () => {
    expect(formatUtcOffset(345)).toBe("UTC+5:45");
    expect(formatUtcOffset(-210)).toBe("UTC−3:30");
    expect(formatUtcOffset(0)).toBe("UTC");
    expect(formatDelta(-270)).toBe("−4 h 30");
    expect(formatDelta(45)).toBe("+45 min");
    expect(formatDelta(0)).toBe("même heure");
  });
  it("Québec → Katmandou : écart de 10 h 45 en hiver", () => {
    expect(formatDelta(zoneDifferenceMinutes(at("2026-01-15T12:00:00Z"), "America/Toronto", "Asia/Kathmandu"))).toBe("+10 h 45");
  });
});

describe("transitions heure d'été / hiver (critère n° 5)", () => {
  it("Québec, 8 mars 2026 : 02:30 n'existe pas", () => {
    const r = resolveWallTime({ year: 2026, month: 3, day: 8, hour: 2, minute: 30, second: 0 }, "America/Toronto");
    expect(r.status).toBe("gap");
    if (r.status === "gap") {
      expect(r.gapMinutes).toBe(60);
      expect(r.shiftedTo.hour).toBe(3);
      expect(r.shiftedTo.minute).toBe(30);
    }
  });
  it("Québec, 1er novembre 2026 : 01:30 existe deux fois", () => {
    const r = resolveWallTime({ year: 2026, month: 11, day: 1, hour: 1, minute: 30, second: 0 }, "America/Toronto");
    expect(r.status).toBe("ambiguous");
    if (r.status === "ambiguous") {
      expect(r.later - r.earlier).toBe(3_600_000);
      expect(new Date(r.earlier).toISOString()).toBe("2026-11-01T05:30:00.000Z");
      expect(new Date(r.later).toISOString()).toBe("2026-11-01T06:30:00.000Z");
    }
  });
  it("Paris, 29 mars et 25 octobre 2026", () => {
    expect(resolveWallTime({ year: 2026, month: 3, day: 29, hour: 2, minute: 15, second: 0 }, "Europe/Paris").status).toBe("gap");
    expect(resolveWallTime({ year: 2026, month: 10, day: 25, hour: 2, minute: 15, second: 0 }, "Europe/Paris").status).toBe(
      "ambiguous",
    );
  });
  it("heure ordinaire : conversion unique et exacte", () => {
    const r = resolveWallTime({ year: 2026, month: 12, day: 3, hour: 9, minute: 0, second: 0 }, "America/Toronto");
    expect(r.status).toBe("ok");
    const d = getZonedParts(r.instant, "Africa/Douala");
    expect([d.hour, d.minute]).toEqual([15, 0]);
  });
  it("hémisphère sud : Santiago passe à l'heure d'été en septembre", () => {
    expect(getOffsetMinutes(at("2026-07-01T12:00:00Z"), "America/Santiago")).toBe(-240);
    expect(getOffsetMinutes(at("2026-12-01T12:00:00Z"), "America/Santiago")).toBe(-180);
  });
  it("prochain changement d'heure de Québec après le 1er octobre 2026", () => {
    const tr = nextOffsetTransition(at("2026-10-01T00:00:00Z"), "America/Toronto");
    expect(tr).not.toBeNull();
    expect(new Date(tr!.instant).toISOString()).toBe("2026-11-01T06:00:00.000Z");
    expect(tr!.fromOffset).toBe(-240);
    expect(tr!.toOffset).toBe(-300);
  });
  it("Douala ne change jamais d'heure", () => {
    expect(nextOffsetTransition(at("2026-01-01T00:00:00Z"), "Africa/Douala")).toBeNull();
  });
});

describe("formatage", () => {
  it("12 h et 24 h", () => {
    expect(formatTime({ hour: 0, minute: 5, second: 9 }, "h23", true)).toBe("00:05:09");
    expect(formatTime({ hour: 0, minute: 5, second: 9 }, "h12")).toBe("12:05 AM");
    expect(formatTime({ hour: 13, minute: 5, second: 9 }, "h12")).toBe("1:05 PM");
  });
  it("le fuseau du processus n'influence pas les calculs", () => {
    expect(process.env.TZ).toBe("Pacific/Pago_Pago");
    expect(getZonedParts(at("2026-06-01T00:00:00Z"), "Europe/Paris").hour).toBe(2);
  });
});
