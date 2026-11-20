import { beforeEach, describe, expect, it } from "vitest";
import { contrastRatio, ensureContrast, hexToRgb, mix } from "@/lib/theme/color";
import { PRESETS } from "@/lib/theme/presets";
import { DEFAULT_THEME, resolveTheme, sanitizeTheme, type ThemePreference } from "@/lib/theme/tokens";
import { createPersistedStore } from "@/lib/state/persisted";
import {
  addFavoriteTo,
  moveFavoriteIn,
  removeFavoriteFrom,
  reorderFavorites,
  sanitizeFavorites,
} from "@/lib/state/favorites";
import { assignDuo, DEFAULT_DUO, sanitizeDuo, swapDuo } from "@/lib/state/duo";
import { draftStore, savedThemeStore, themeActions, THEME_KEY } from "@/lib/state/theme";

describe("couleurs et contraste", () => {
  it("contraste WCAG connu", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });
  it("ensureContrast atteint toujours le seuil demandé", () => {
    const pairs = [
      ["#FFFF00", "#FFFFFF"],
      ["#341B2C", "#341B2C"],
      ["#FF7A52", "#FFF4E5"],
      ["#D6F168", "#F5F4E9"],
      ["#808080", "#7F7F7F"],
    ];
    for (const [fg, bg] of pairs) expect(contrastRatio(ensureContrast(fg, bg, 4.5), bg)).toBeGreaterThanOrEqual(4.5);
  });
  it("mix et conversions", () => {
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(hexToRgb("#abc")).toEqual({ r: 170, g: 187, b: 204 });
  });
});

describe("thèmes", () => {
  it.each(PRESETS.flatMap((p) => (["dark", "light"] as const).map((m) => [p.id, m] as const)))(
    "%s (%s) : textes lisibles (≥ 4,5:1) et accents ≥ 3:1",
    (presetId, mode) => {
      const t = resolveTheme({ ...DEFAULT_THEME, presetId, mode }, false);
      const v = t.vars;
      expect(contrastRatio(v["--color-text"], v["--color-bg"])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(v["--color-text-muted"], v["--color-bg"])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(v["--color-on-surface"], v["--color-surface"])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(v["--color-on-surface-muted"], v["--color-surface"])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(v["--color-on-primary"], v["--color-primary"])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(v["--color-on-button"], v["--color-button"])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(v["--color-primary-ink"], v["--color-bg"])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(v["--color-primary"], v["--color-bg"])).toBeGreaterThanOrEqual(3);
    },
  );
  it("le thème signature reprend exactement les couleurs du PRD", () => {
    const t = resolveTheme({ ...DEFAULT_THEME, mode: "dark" }, true);
    expect(t.vars["--color-bg"]).toBe("#341B2C");
    expect(t.vars["--color-primary"]).toBe("#FF7A52");
    expect(t.vars["--color-secondary"]).toBe("#E7BC4B");
    expect(t.vars["--color-surface"]).toBe("#FFF4E5");
  });
  it("mode auto : suit le système", () => {
    expect(resolveTheme(DEFAULT_THEME, true).mode).toBe("dark");
    expect(resolveTheme(DEFAULT_THEME, false).mode).toBe("light");
  });
  it("couleurs illisibles : avertissement + correction automatique", () => {
    const pref: ThemePreference = { ...DEFAULT_THEME, mode: "dark", overrides: { dark: { text: "#3A2030" } } };
    const t = resolveTheme(pref, true);
    const issue = t.issues.find((i) => i.target === "text");
    expect(issue).toBeDefined();
    expect(issue!.ratio).toBeLessThan(4.5);
    expect(contrastRatio(issue!.suggestion, "#341B2C")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.vars["--color-text"], t.vars["--color-bg"])).toBeGreaterThanOrEqual(4.5);
  });
  it("sans correction automatique : la couleur choisie est conservée mais signalée", () => {
    const pref: ThemePreference = { ...DEFAULT_THEME, mode: "dark", autoContrast: false, overrides: { dark: { text: "#3A2030" } } };
    const t = resolveTheme(pref, true);
    expect(t.vars["--color-text"]).toBe("#3A2030");
    expect(t.issues.some((i) => i.target === "text" && !i.autoFixed)).toBe(true);
  });
  it("sanitizeTheme répare des données corrompues", () => {
    const t = sanitizeTheme({ presetId: "inconnu", mode: 42, radius: 999, overrides: { dark: { primary: "rouge" } }, clockOverrides: { "x": { accent: "#ff0000", style: "bizarre" } } });
    expect(t.presetId).toBe("eclat-ambre");
    expect(t.mode).toBe("auto");
    expect(t.radius).toBe(32);
    expect(t.overrides).toEqual({});
    expect(t.clockOverrides).toEqual({ x: { accent: "#FF0000" } });
  });
});

describe("brouillon, enregistrement et persistance du thème", () => {
  beforeEach(() => {
    themeActions.discard();
    savedThemeStore.reset();
  });
  it("l'aperçu ne persiste pas tant qu'on n'enregistre pas", () => {
    themeActions.edit({ presetId: "jade-solaire" });
    expect(draftStore.get().draft?.presetId).toBe("jade-solaire");
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    themeActions.save();
    const stored = JSON.parse(localStorage.getItem(THEME_KEY)!);
    expect(stored.v).toBe(1);
    expect(stored.data.presetId).toBe("jade-solaire");
    expect(stored.css.dark["--color-bg"]).toBe("#163F3B");
    expect(draftStore.get().draft).toBeNull();
  });
  it("annuler revient étape par étape, abandonner revient à l'enregistré", () => {
    themeActions.edit({ presetId: "jade-solaire" });
    themeActions.edit({ radius: 4 });
    themeActions.undo();
    expect(draftStore.get().draft?.radius).toBe(DEFAULT_THEME.radius);
    expect(draftStore.get().draft?.presetId).toBe("jade-solaire");
    themeActions.undo();
    expect(draftStore.get().draft).toBeNull();
    themeActions.edit({ presetId: "nocturne-citron" });
    themeActions.discard();
    expect(draftStore.get().draft).toBeNull();
    expect(savedThemeStore.get().presetId).toBe("eclat-ambre");
  });
});

describe("stockage versionné", () => {
  it("ignore une valeur illisible ou d'une version future", () => {
    localStorage.setItem("t.a", "{pas du json");
    const a = createPersistedStore({ key: "t.a", version: 1, initial: 5, sanitize: (r) => (typeof r === "number" ? r : 5) });
    expect(a.get()).toBe(5);
    localStorage.setItem("t.b", JSON.stringify({ v: 9, data: 7 }));
    const b = createPersistedStore({ key: "t.b", version: 1, initial: 5, sanitize: (r) => (typeof r === "number" ? r : 5) });
    expect(b.get()).toBe(5);
  });
  it("migre une version antérieure via sanitize", () => {
    localStorage.setItem("t.c", JSON.stringify({ v: 0, data: { n: 3 } }));
    const c = createPersistedStore({
      key: "t.c",
      version: 1,
      initial: 0,
      sanitize: (r, v) => (v === 0 ? (r as { n: number }).n * 10 : (r as number)),
    });
    expect(c.get()).toBe(30);
  });
});

describe("favoris (critère n° 6)", () => {
  it("ajout sans doublon, suppression, réorganisation", () => {
    let l = addFavoriteTo([], "douala-cm");
    l = addFavoriteTo(l, "quebec-ca");
    l = addFavoriteTo(l, "douala-cm");
    expect(l.map((f) => f.locationId)).toEqual(["douala-cm", "quebec-ca"]);
    l = moveFavoriteIn(l, "quebec-ca", -1);
    expect(l.map((f) => f.locationId)).toEqual(["quebec-ca", "douala-cm"]);
    expect(l.map((f) => f.position)).toEqual([0, 1]);
    l = addFavoriteTo(l, "tokyo-jp");
    l = reorderFavorites(l, ["tokyo-jp", "douala-cm", "quebec-ca"]);
    expect(l.map((f) => f.locationId)).toEqual(["tokyo-jp", "douala-cm", "quebec-ca"]);
    l = removeFavoriteFrom(l, "douala-cm");
    expect(l.map((f) => f.locationId)).toEqual(["tokyo-jp", "quebec-ca"]);
    expect(moveFavoriteIn(l, "tokyo-jp", -1)).toBe(l);
  });
  it("refuse les lieux inconnus et les doublons stockés", () => {
    expect(addFavoriteTo([], "atlantide-xx")).toEqual([]);
    const s = sanitizeFavorites([{ locationId: "douala-cm" }, { locationId: "douala-cm" }, { locationId: "nope" }, 3]);
    expect(s.map((f) => f.locationId)).toEqual(["douala-cm"]);
  });
});

describe("Deux mondes (critère n° 9)", () => {
  it("par défaut : Québec et Douala, format Mini", () => {
    expect(DEFAULT_DUO.locationIdA).toBe("quebec-ca");
    expect(DEFAULT_DUO.locationIdB).toBe("douala-cm");
    expect(DEFAULT_DUO.layoutMode).toBe("mini");
  });
  it("inverser échange les villes et leurs couleurs", () => {
    const d = swapDuo({ ...DEFAULT_DUO, themeOverrides: { a: "#111111" } });
    expect(d.locationIdA).toBe("douala-cm");
    expect(d.themeOverrides).toEqual({ a: undefined, b: "#111111" });
  });
  it("affecter une ville déjà dans l'autre moitié inverse le duo", () => {
    const d = assignDuo(DEFAULT_DUO, "a", "douala-cm");
    expect([d.locationIdA, d.locationIdB]).toEqual(["douala-cm", "quebec-ca"]);
    const e = assignDuo(DEFAULT_DUO, "b", "tokyo-jp");
    expect(e.locationIdB).toBe("tokyo-jp");
    expect(e.configured).toBe(true);
  });
  it("répare une préférence corrompue", () => {
    const d = sanitizeDuo({ locationIdA: "zzz", layoutMode: "géant", themeOverrides: { a: "pas une couleur" } });
    expect(d.locationIdA).toBe("quebec-ca");
    expect(d.layoutMode).toBe("mini");
    expect(d.themeOverrides).toBeUndefined();
  });
});
