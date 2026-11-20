/**
 * Thèmes prédéfinis (PRD §6.2). Chaque thème existe en version sombre et claire ;
 * la version « native » reprend exactement les couleurs du PRD.
 */

export type PresetId = "eclat-ambre" | "jade-solaire" | "terre-lagon" | "papier-coquelicot" | "nocturne-citron";
export type ResolvedMode = "dark" | "light";

export interface Palette {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  button: string;
  text: string;
}

export interface Preset {
  id: PresetId;
  name: string;
  tagline: string;
  native: ResolvedMode;
  palettes: Record<ResolvedMode, Palette>;
}

export const PRESETS: Preset[] = [
  {
    id: "eclat-ambre",
    name: "Éclat d'ambre",
    tagline: "Bordeaux profond, corail et safran — le thème signature.",
    native: "dark",
    palettes: {
      dark: { background: "#341B2C", surface: "#FFF4E5", primary: "#FF7A52", secondary: "#E7BC4B", button: "#FF7A52", text: "#FFF4E5" },
      light: { background: "#FFF4E5", surface: "#FFFFFF", primary: "#C8461F", secondary: "#9A6B00", button: "#341B2C", text: "#341B2C" },
    },
  },
  {
    id: "jade-solaire",
    name: "Jade solaire",
    tagline: "Vert forêt, jaune chaud et menthe.",
    native: "dark",
    palettes: {
      dark: { background: "#163F3B", surface: "#F5F3E8", primary: "#F8B943", secondary: "#47D1B3", button: "#F8B943", text: "#F5F3E8" },
      light: { background: "#F5F3E8", surface: "#FFFFFF", primary: "#9C5E00", secondary: "#13786A", button: "#163F3B", text: "#163F3B" },
    },
  },
  {
    id: "terre-lagon",
    name: "Terre & lagon",
    tagline: "Brun profond, terracotta et bleu lagon.",
    native: "dark",
    palettes: {
      dark: { background: "#392D2A", surface: "#FCF3E7", primary: "#E97A52", secondary: "#50B9AC", button: "#E97A52", text: "#FCF3E7" },
      light: { background: "#FCF3E7", surface: "#FFFFFF", primary: "#B4482A", secondary: "#1F756C", button: "#392D2A", text: "#392D2A" },
    },
  },
  {
    id: "papier-coquelicot",
    name: "Papier & coquelicot",
    tagline: "Blanc cassé, rouge coquelicot et vert encre.",
    native: "light",
    palettes: {
      light: { background: "#FAF6EF", surface: "#FFFFFF", primary: "#D94F45", secondary: "#355C57", button: "#D94F45", text: "#24302E" },
      dark: { background: "#1C2422", surface: "#FAF6EF", primary: "#F2786E", secondary: "#8FC1B9", button: "#F2786E", text: "#FAF6EF" },
    },
  },
  {
    id: "nocturne-citron",
    name: "Nocturne citron",
    tagline: "Graphite, citron doux et jade clair.",
    native: "dark",
    palettes: {
      dark: { background: "#202322", surface: "#F5F4E9", primary: "#D6F168", secondary: "#71C7B2", button: "#D6F168", text: "#F5F4E9" },
      light: { background: "#F5F4E9", surface: "#FFFFFF", primary: "#566B0E", secondary: "#1F7A66", button: "#202322", text: "#202322" },
    },
  },
];

export const DEFAULT_PRESET: PresetId = "eclat-ambre";

export function getPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

/** Accents proposés pour personnaliser une carte d'horloge individuelle. */
export const CLOCK_ACCENTS = ["#FF7A52", "#E7BC4B", "#47D1B3", "#50B9AC", "#D94F45", "#D6F168", "#8C7CF0", "#5BA4E6", "#F28AB2"];
