import { describe, expect, it } from "vitest";
import { dayPeriod, nightShade, solarAltitude, subsolarPoint, sunTimes } from "@/lib/time/solar";
import { getZonedParts, resolveWallTime, startOfLocalDay, addDays } from "@/lib/time/engine";
import { getLocation } from "@/lib/catalog";
import { groupByCountry, normalize, search } from "@/lib/search";

const at = (iso: string) => Date.parse(iso);

describe("jour / nuit (FR-06)", () => {
  const douala = getLocation("douala-cm")!;
  it("midi solaire à Douala : jour ; minuit : nuit", () => {
    expect(dayPeriod(solarAltitude(at("2026-11-20T11:30:00Z"), douala.lat, douala.lon))).toBe("day");
    expect(dayPeriod(solarAltitude(at("2026-11-20T23:30:00Z"), douala.lat, douala.lon))).toBe("night");
  });
  it("point sub-solaire : déclinaison proche de +23,4° au solstice de juin", () => {
    const s = subsolarPoint(at("2026-06-21T12:00:00Z"));
    expect(s.lat).toBeGreaterThan(23.3);
    expect(s.lat).toBeLessThan(23.5);
    expect(Math.abs(s.lon)).toBeLessThan(2);
  });
  it("lever et coucher à Québec le 20 novembre (≈ 06:55 et 16:15 heure locale)", () => {
    const q = getLocation("quebec-ca")!;
    const date = { year: 2026, month: 11, day: 20 };
    const start = startOfLocalDay(date, q.tz);
    const end = startOfLocalDay(addDays(date, 1), q.tz);
    const st = sunTimes(start, end, q.lat, q.lon);
    const rise = getZonedParts(st.sunrise!, q.tz);
    const set = getZonedParts(st.sunset!, q.tz);
    expect(rise.hour * 60 + rise.minute).toBeGreaterThanOrEqual(6 * 60 + 45);
    expect(rise.hour * 60 + rise.minute).toBeLessThanOrEqual(7 * 60 + 5);
    expect(set.hour * 60 + set.minute).toBeGreaterThanOrEqual(16 * 60 + 5);
    expect(set.hour * 60 + set.minute).toBeLessThanOrEqual(16 * 60 + 25);
  });
  it("régions polaires : nuit polaire au Svalbard en décembre, jour polaire en juin", () => {
    const s = getLocation("longyearbyen-sj")!;
    const day = (m: number, d: number) => {
      const date = { year: 2026, month: m, day: d };
      return sunTimes(startOfLocalDay(date, s.tz), startOfLocalDay(addDays(date, 1), s.tz), s.lat, s.lon);
    };
    expect(day(12, 21).polar).toBe("polar-night");
    expect(day(6, 21).polar).toBe("polar-day");
  });
  it("ombrage de la carte : continu de 0 (jour) à 1 (nuit)", () => {
    expect(nightShade(20)).toBe(0);
    expect(nightShade(-20)).toBe(1);
    const mid = nightShade(-5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
  it("le calcul jour/nuit suit les coordonnées, pas une règle 6 h–18 h", () => {
    // À Reykjavik le 21 décembre à 10:00 locales, il fait encore nuit/crépuscule
    const r = getLocation("reykjavik-is")!;
    const res = resolveWallTime({ year: 2026, month: 12, day: 21, hour: 10, minute: 0, second: 0 }, r.tz);
    expect(dayPeriod(solarAltitude(res.instant, r.lat, r.lon))).not.toBe("day");
  });
});

describe("recherche (FR-01)", () => {
  it("normalise accents et casse", () => {
    expect(normalize("  Yaoundé ")).toBe("yaounde");
    expect(normalize("Côte d’Ivoire")).toBe("cote d ivoire");
  });
  it.each([
    ["Yaounde", "yaounde-cm"],
    ["yaoundé", "yaounde-cm"],
    ["Douala", "douala-cm"],
    ["quebec", "quebec-ca"],
    ["Québec", "quebec-ca"],
    ["montreal", "montreal-ca"],
    ["Montréal", "montreal-ca"],
    ["beijing", "pekin-cn"],
    ["Pekin", "pekin-cn"],
    ["bombay", "mumbai-in"],
    ["new york", "new-york-us"],
    ["kiev", "kyiv-ua"],
    ["America/Toronto", "toronto-ca"],
  ])("« %s » trouve %s en premier", (q, id) => {
    expect(search(q)[0]?.location.id).toBe(id);
  });
  it("« Cameroun » propose Douala (ville de référence) puis les autres villes du pays", () => {
    const hits = search("Cameroun");
    expect(hits[0].location.id).toBe("douala-cm");
    expect(hits[0].viaCountry).toBe(true);
    expect(hits.map((h) => h.location.id)).toContain("yaounde-cm");
    const groups = groupByCountry(hits);
    expect(groups[0].country).toBe("Cameroun");
  });
  it("« Etats-Unis » et « usa » renvoient des villes américaines", () => {
    expect(search("Etats-Unis")[0].location.cc).toBe("US");
    expect(search("usa")[0].location.cc).toBe("US");
  });
  it("« Canada » renvoie plusieurs villes canadiennes à choisir", () => {
    const ca = search("canada").filter((h) => h.location.cc === "CA");
    expect(ca.length).toBeGreaterThan(5);
  });
  it("requête vide ou sans résultat", () => {
    expect(search("")).toEqual([]);
    expect(search("zzzzqqq")).toEqual([]);
  });
  it("répond en moins de 300 ms sur le catalogue local", () => {
    const t0 = performance.now();
    for (const q of ["a", "pa", "par", "sain", "new", "cameroun", "x"]) search(q);
    expect(performance.now() - t0).toBeLessThan(300);
  });
});
