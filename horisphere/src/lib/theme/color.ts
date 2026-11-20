/** Outils couleur : conversion, mélange, luminance relative et contraste WCAG 2.2. */

export type Rgb = { r: number; g: number; b: number };

export function isHex(s: unknown): s is string {
  return typeof s === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
}

export function hexToRgb(hex: string): Rgb {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function normalizeHex(hex: string): string {
  return rgbToHex(hexToRgb(hex));
}

/** Mélange linéaire : t = 0 → a, t = 1 → b */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** Luminance relative WCAG */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** Rapport de contraste WCAG (1 à 21) */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.18;
}

/** Parmi les candidats, celui qui contraste le plus avec le fond. */
export function bestContrast(bg: string, candidates: string[]): string {
  return candidates.reduce((best, c) => (contrastRatio(c, bg) > contrastRatio(best, bg) ? c : best), candidates[0]);
}

/**
 * Ajuste une couleur (en la rapprochant du blanc ou du noir, en gardant sa teinte)
 * jusqu'à atteindre le contraste minimal avec le fond. Renvoie la couleur d'origine si elle suffit.
 */
export function ensureContrast(fg: string, bg: string, min: number): string {
  if (contrastRatio(fg, bg) >= min) return normalizeHex(fg);
  const towardsWhite = luminance(bg) < 0.5;
  const target = towardsWhite ? "#FFFFFF" : "#000000";
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(mix(fg, target, mid), bg) >= min) hi = mid;
    else lo = mid;
  }
  const out = mix(fg, target, hi);
  if (contrastRatio(out, bg) >= min) return out;
  // Dernier recours : le blanc ou le noir pur
  return bestContrast(bg, ["#FFFFFF", "#000000"]);
}

export type ContrastLevel = "AAA" | "AA" | "AA-large" | "fail";
export function contrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}

/** Couleur de texte lisible (blanc ou presque noir) sur une couleur de fond choisie par l'utilisateur. */
export function readableTextOn(bg: string): string {
  return bestContrast(bg, ["#FFFFFF", "#141012"]);
}
