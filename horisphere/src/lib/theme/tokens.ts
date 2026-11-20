/**
 * Moteur de thèmes : transforme une préférence (thème + surcharges utilisateur) en design tokens CSS.
 * Toutes les couleurs des composants passent par ces variables (aucune couleur en dur dans les composants).
 */
import { bestContrast, contrastRatio, ensureContrast, isDark, isHex, mix, normalizeHex, withAlpha } from "./color";
import { DEFAULT_PRESET, getPreset, type Ambiance, type Palette, type PresetId, type ResolvedMode } from "./presets";

export type ThemeMode = "dark" | "light" | "auto";
export type CardStyle = "uni" | "degrade" | "motif";
export type ClockStyle = "editorial" | "cadran";

export interface ClockOverride {
  accent?: string;
  style?: CardStyle;
}

export interface ThemePreference {
  schemaVersion: 1;
  presetId: PresetId;
  mode: ThemeMode;
  /** Couleurs personnalisées, propres à chaque mode (clair/sombre) */
  overrides: Partial<Record<ResolvedMode, Partial<Palette>>>;
  /** Correction automatique des textes peu lisibles */
  autoContrast: boolean;
  /** Arrondi des cartes en px (0–32) */
  radius: number;
  /** Intensité des dégradés (0–100) */
  gradient: number;
  clockStyle: ClockStyle;
  cardStyle: CardStyle;
  /** Personnalisation individuelle des cartes d'horloge, par identifiant de lieu */
  clockOverrides: Record<string, ClockOverride>;
}

export const DEFAULT_THEME: ThemePreference = {
  schemaVersion: 1,
  presetId: DEFAULT_PRESET,
  // Le thème signature est sombre par défaut (maquettes) ; « automatique » reste disponible.
  mode: "dark",
  overrides: {},
  autoContrast: true,
  radius: 22,
  gradient: 55,
  clockStyle: "cadran",
  cardStyle: "degrade",
  clockOverrides: {},
};

export type ContrastTarget = "text" | "surfaceText" | "primary" | "secondary" | "button";

export interface ContrastIssue {
  target: ContrastTarget;
  label: string;
  ratio: number;
  min: number;
  /** Couleur proposée pour atteindre le seuil */
  suggestion: string;
  /** Champ de palette concerné, pour appliquer la suggestion */
  field: keyof Palette;
  autoFixed: boolean;
}

export interface ResolvedTheme {
  mode: ResolvedMode;
  palette: Palette;
  vars: Record<string, string>;
  issues: ContrastIssue[];
  /** Couleurs utiles à la carte (MapLibre ne lit pas les variables CSS) */
  map: {
    ocean: string;
    land: string;
    /** Dégradé des terres d'ouest en est (continents colorés) */
    landStops: string[];
    style: Ambiance["mapStyle"];
    border: string;
    graticule: string;
    night: string;
    nightAlpha: number;
    marker: string;
    markerFav: string;
    lights: string;
  };
  /** Couleurs de départ des cartes d'horloge (attribuées tour à tour) */
  cardAccents: string[];
  /** Moitiés par défaut du module « Deux mondes » */
  duo: [string, string];
}

export interface CardColors {
  from: string;
  mid: string;
  to: string;
  /** Texte posé sur le dégradé : contraste ≥ 4,5:1 sur chacun des arrêts */
  ink: string;
  inkMuted: string;
  /** Pastilles (badge jour/nuit, cadran) */
  chip: string;
  chipInk: string;
  dial: string;
  dialInk: string;
}

/**
 * Dégradé d'une carte (horloge, moitié de « Deux mondes ») et encre lisible garantie (WCAG AA)
 * sur toute la hauteur du dégradé.
 */
export function cardColors(accent: string, theme: Pick<ResolvedTheme, "palette">): CardColors {
  const bg = theme.palette.background;
  const a = normalizeHex(accent);
  const from = mix(a, "#FFFFFF", 0.18);
  const mid = a;
  const to = mix(a, bg, 0.18);
  const stops = [from, mid, to];
  const minContrast = (c: string) => Math.min(...stops.map((s) => contrastRatio(c, s)));
  // Encre sombre (teinte du fond, assombrie si besoin) ou encre claire : on garde la plus lisible
  let dark = darken(bg, stops);
  const light = "#FFFFFF";
  const ink = minContrast(dark) >= minContrast(light) ? dark : light;
  if (minContrast(ink) < 4.5) {
    // Couleur intermédiaire : on éclaircit les arrêts jusqu'à rendre l'encre sombre lisible
    let f = 0.1;
    let st = stops;
    while (f <= 0.9) {
      st = [mix(from, "#FFFFFF", f), mix(mid, "#FFFFFF", f), mix(to, "#FFFFFF", f)];
      dark = darken(bg, st);
      if (Math.min(...st.map((s) => contrastRatio(dark, s))) >= 4.5) break;
      f += 0.1;
    }
    return finishCard(st[0], st[1], st[2], dark);
  }
  return finishCard(from, mid, to, ink);
}

function darken(bg: string, stops: string[]): string {
  let c = isDark(bg) ? bg : "#1A1416";
  for (let i = 0; i < 12 && Math.min(...stops.map((s) => contrastRatio(c, s))) < 4.5; i++) c = mix(c, "#000000", 0.25);
  return c;
}

function finishCard(from: string, mid: string, to: string, ink: string): CardColors {
  const stops = [from, mid, to];
  let inkMuted = mix(ink, mid, 0.25);
  if (Math.min(...stops.map((s) => contrastRatio(inkMuted, s))) < 4.5) inkMuted = ink;
  const inkIsDark = isDark(ink);
  const dial = inkIsDark ? mix(ink, "#000000", 0.2) : mix(mid, "#000000", 0.55);
  return {
    from,
    mid,
    to,
    ink,
    inkMuted,
    // Pastille : éclaircit sous une encre sombre, assombrit sous une encre claire (le contraste ne baisse jamais)
    chip: inkIsDark ? withAlpha("#FFFFFF", 0.4) : withAlpha("#000000", 0.28),
    chipInk: ink,
    dial,
    dialInk: "#F2C46B",
  };
}

export function resolveMode(mode: ThemeMode, systemDark: boolean): ResolvedMode {
  if (mode === "auto") return systemDark ? "dark" : "light";
  return mode;
}

export function effectivePalette(pref: ThemePreference, mode: ResolvedMode): Palette {
  const base = getPreset(pref.presetId).palettes[mode];
  const o = pref.overrides[mode] ?? {};
  const pick = (k: keyof Palette) => (isHex(o[k]) ? normalizeHex(o[k]!) : base[k]);
  return {
    background: pick("background"),
    surface: pick("surface"),
    primary: pick("primary"),
    secondary: pick("secondary"),
    button: pick("button"),
    text: pick("text"),
  };
}

export function resolveTheme(pref: ThemePreference, systemDark: boolean): ResolvedTheme {
  const mode = resolveMode(pref.mode, systemDark);
  const p = effectivePalette(pref, mode);
  const issues: ContrastIssue[] = [];
  const fix = pref.autoContrast;

  const check = (
    target: ContrastTarget,
    label: string,
    field: keyof Palette,
    fg: string,
    bg: string,
    min: number,
  ): string => {
    const ratio = contrastRatio(fg, bg);
    if (ratio >= min) return fg;
    const suggestion = ensureContrast(fg, bg, min);
    issues.push({ target, label, ratio, min, suggestion, field, autoFixed: fix });
    return fix ? suggestion : fg;
  };

  const bg = p.background;
  const darkBg = isDark(bg);
  const text = check("text", "Texte sur le fond", "text", p.text, bg, 4.5);
  const textMuted = ensureContrast(mix(text, bg, 0.32), bg, 4.5);

  // Texte sur les cartes : la couleur la plus lisible parmi le texte, le fond et le noir/blanc
  const onSurface = bestContrast(p.surface, [text, bg, darkBg ? bg : text, "#1A1416", "#FFFFFF"]);
  const surfaceTextIssue = contrastRatio(onSurface, p.surface) < 4.5;
  if (surfaceTextIssue) {
    issues.push({
      target: "surfaceText",
      label: "Texte sur les cartes",
      ratio: contrastRatio(onSurface, p.surface),
      min: 4.5,
      suggestion: ensureContrast(p.surface, onSurface, 4.5),
      field: "surface",
      autoFixed: false,
    });
  }
  const onSurfaceMuted = ensureContrast(mix(onSurface, p.surface, 0.35), p.surface, 4.5);

  const primary = check("primary", "Couleur principale sur le fond", "primary", p.primary, bg, 3);
  const secondary = check("secondary", "Couleur secondaire sur le fond", "secondary", p.secondary, bg, 3);
  const button = check("button", "Boutons sur le fond", "button", p.button, bg, 3);

  const onPrimary = bestContrast(primary, [bg, text, "#FFFFFF", "#141012"]);
  const onSecondary = bestContrast(secondary, [bg, text, "#FFFFFF", "#141012"]);
  const onButton = bestContrast(button, [bg, text, p.surface, "#FFFFFF", "#141012"]);

  const amb = getPreset(pref.presetId).ambiance[mode];
  const surfaceRaised = mix(mix(bg, text, darkBg ? 0.05 : 0.035), primary, darkBg ? 0.05 : 0.02);
  const surfaceSunken = mix(bg, darkBg ? "#000000" : text, darkBg ? 0.22 : 0.05);
  const border = mix(bg, text, darkBg ? 0.2 : 0.16);
  // Liseré doré des panneaux et lueur des halos (maquettes)
  const borderGlow = darkBg ? mix(secondary, bg, 0.45) : mix(secondary, bg, 0.35);
  // Bouton principal en pilule dégradée or → corail ; repli sur des paires lisibles si besoin (AA)
  const ctaPairs: [string, string][] = [
    [secondary, primary],
    [mix(primary, "#FFFFFF", 0.2), primary],
    [button, mix(button, primary, 0.25)],
    [button, button],
  ];
  let ctaFrom = button;
  let ctaTo = button;
  let onCta = onButton;
  for (const [f, t] of ctaPairs) {
    const inks = [ensureDarkInk(bg, [f, t]), "#FFFFFF"];
    const ink = inks.reduce((best, c) =>
      Math.min(contrastRatio(c, f), contrastRatio(c, t)) > Math.min(contrastRatio(best, f), contrastRatio(best, t)) ? c : best,
    );
    if (Math.min(contrastRatio(ink, f), contrastRatio(ink, t)) >= 4.5) {
      ctaFrom = f;
      ctaTo = t;
      onCta = ink;
      break;
    }
  }
  const searchBg = darkBg ? p.surface : mix(p.surface, bg, 0.2);
  const borderSurface = mix(p.surface, onSurface, 0.14);
  const focus = bestContrast(bg, [secondary, primary, text]);
  // Couleurs d'accent lisibles comme texte (≥ 4,5:1) sur le fond et sur les cartes
  const primaryInk = ensureContrast(primary, bg, 4.5);
  const secondaryInk = ensureContrast(secondary, bg, 4.5);
  const primaryInkSurface = ensureContrast(primary, p.surface, 4.5);
  const secondaryInkSurface = ensureContrast(secondary, p.surface, 4.5);

  const g = Math.max(0, Math.min(100, pref.gradient)) / 100;
  const radius = Math.max(0, Math.min(32, Math.round(pref.radius)));

  const vars: Record<string, string> = {
    "--color-bg": bg,
    "--color-surface": p.surface,
    "--color-surface-raised": surfaceRaised,
    "--color-surface-sunken": surfaceSunken,
    "--color-primary": primary,
    "--color-on-primary": onPrimary,
    "--color-secondary": secondary,
    "--color-on-secondary": onSecondary,
    "--color-button": button,
    "--color-on-button": onButton,
    "--color-text": text,
    "--color-text-muted": textMuted,
    "--color-on-surface": onSurface,
    "--color-on-surface-muted": onSurfaceMuted,
    "--color-border": border,
    "--color-border-surface": borderSurface,
    "--color-focus": focus,
    "--color-primary-ink": primaryInk,
    "--color-secondary-ink": secondaryInk,
    "--color-primary-ink-surface": primaryInkSurface,
    "--color-secondary-ink-surface": secondaryInkSurface,
    "--color-border-glow": borderGlow,
    "--color-halo": withAlpha(primary, darkBg ? 0.22 : 0.14),
    "--color-cta-from": ctaFrom,
    "--color-cta-to": ctaTo,
    "--color-on-cta": onCta,
    "--color-search": searchBg,
    "--color-on-search": bestContrast(searchBg, [bg, text, "#1A1416"]),
    "--color-on-search-muted": ensureContrast(mix(bestContrast(searchBg, [bg, text, "#1A1416"]), searchBg, 0.35), searchBg, 4.5),
    "--color-glow-1": withAlpha(primary, 0.1 + 0.3 * g),
    "--color-glow-2": withAlpha(secondary, 0.08 + 0.25 * g),
    "--color-glow-3": withAlpha(amb.glow, 0.12 + 0.35 * g),
    "--gradient-strength": g.toFixed(2),
    "--radius-card": `${radius}px`,
    "--radius-control": `${Math.max(4, Math.round(radius * 0.55))}px`,
    "--shadow-card": darkBg
      ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 40px -22px rgba(0,0,0,0.65)"
      : `0 1px 2px ${withAlpha(text, 0.06)}, 0 18px 40px -26px ${withAlpha(text, 0.35)}`,
    "color-scheme": darkBg ? "dark" : "light",
  };

  const map: ResolvedTheme["map"] = {
    ocean: amb.mapOcean,
    land: amb.mapLand[2],
    landStops: amb.mapLand,
    style: amb.mapStyle,
    border: darkBg ? mix(amb.mapOcean, "#000000", 0.35) : mix(amb.mapOcean, "#FFFFFF", 0.6),
    graticule: darkBg ? mix(amb.mapOcean, secondary, 0.18) : mix(amb.mapOcean, text, 0.12),
    night: darkBg ? mix(bg, "#000000", 0.55) : mix(text, primary, 0.15),
    nightAlpha: amb.mapStyle === "nightlights" ? 0.35 : darkBg ? 0.5 : 0.3,
    marker: primary,
    markerFav: secondary,
    lights: mix(secondary, "#FFFFFF", 0.35),
  };

  return { mode, palette: p, vars, issues, map, cardAccents: amb.cardAccents, duo: amb.duo };
}

function ensureDarkInk(bg: string, stops: string[]): string {
  return darken(bg, stops);
}

/** Vérifie et complète une préférence lue depuis le stockage (données potentiellement corrompues). */
export function sanitizeTheme(raw: unknown): ThemePreference {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ThemePreference>;
  const presetId = getPreset(String(r.presetId ?? DEFAULT_PRESET)).id;
  const mode: ThemeMode = r.mode === "auto" || r.mode === "light" ? r.mode : "dark";
  const cleanPalette = (o: unknown): Partial<Palette> => {
    const out: Partial<Palette> = {};
    if (o && typeof o === "object") {
      for (const k of ["background", "surface", "primary", "secondary", "button", "text"] as const) {
        const v = (o as Record<string, unknown>)[k];
        if (isHex(v)) out[k] = normalizeHex(v);
      }
    }
    return out;
  };
  const overrides: ThemePreference["overrides"] = {};
  if (r.overrides && typeof r.overrides === "object") {
    for (const m of ["dark", "light"] as const) {
      const c = cleanPalette((r.overrides as Record<string, unknown>)[m]);
      if (Object.keys(c).length) overrides[m] = c;
    }
  }
  const clockOverrides: Record<string, ClockOverride> = {};
  if (r.clockOverrides && typeof r.clockOverrides === "object") {
    for (const [id, v] of Object.entries(r.clockOverrides as Record<string, ClockOverride>)) {
      if (!v || typeof v !== "object") continue;
      const o: ClockOverride = {};
      if (isHex(v.accent)) o.accent = normalizeHex(v.accent);
      if (v.style === "uni" || v.style === "degrade" || v.style === "motif") o.style = v.style;
      if (Object.keys(o).length) clockOverrides[id] = o;
    }
  }
  const num = (v: unknown, d: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : d;
  return {
    schemaVersion: 1,
    presetId,
    mode,
    overrides,
    autoContrast: r.autoContrast !== false,
    radius: num(r.radius, DEFAULT_THEME.radius, 0, 32),
    gradient: num(r.gradient, DEFAULT_THEME.gradient, 0, 100),
    clockStyle: r.clockStyle === "editorial" ? "editorial" : "cadran",
    cardStyle: r.cardStyle === "uni" || r.cardStyle === "motif" ? r.cardStyle : "degrade",
    clockOverrides,
  };
}

/** Script exécuté avant le premier affichage : applique le thème enregistré sans flash. */
export function themeBootScript(storageKey: string, settingsKey: string): string {
  // Le calcul complet est trop lourd pour un script en ligne : on stocke les variables résolues
  // pour chaque mode au moment de l'enregistrement (voir lib/state/theme.ts) et on applique la bonne.
  return `(function(){try{var d=document.documentElement;var raw=localStorage.getItem(${JSON.stringify(
    storageKey,
  )});if(raw){var t=JSON.parse(raw);var c=t&&t.css;if(c){var m=t.data&&t.data.mode;var dark=m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var v=dark?c.dark:c.light;for(var k in v){d.style.setProperty(k,v[k]);}d.dataset.mode=dark?'dark':'light';}}var s=localStorage.getItem(${JSON.stringify(
    settingsKey,
  )});if(s){var st=JSON.parse(s);var mo=st&&st.data&&st.data.motion;if(mo==='reduced'||mo==='full')d.dataset.motion=mo;}}catch(e){}})();`;
}
