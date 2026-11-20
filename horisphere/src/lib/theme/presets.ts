/**
 * Thèmes prédéfinis (PRD §6.2, maquettes docs/maquettes/). Chaque thème existe en version sombre et claire ;
 * la version « native » reprend exactement les couleurs du PRD.
 *
 * Toutes les couleurs de l'application sont définies ici (ou dérivées dans tokens.ts) : les composants
 * ne reçoivent que des design tokens.
 */

export type PresetId =
  | "eclat-ambre"
  | "jade-solaire"
  | "terre-lagon"
  | "papier-coquelicot"
  | "nocturne-citron"
  | "atlas-nuit";
export type ResolvedMode = "dark" | "light";

export interface Palette {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  button: string;
  text: string;
}

/** Ambiance graphique d'un thème : dégradés, carte, lueurs (non modifiables champ par champ). */
export interface Ambiance {
  /** Couleurs de départ des cartes d'horloge, attribuées tour à tour aux villes */
  cardAccents: string[];
  /** Moitiés gauche et droite par défaut du module « Deux mondes » */
  duo: [string, string];
  /** Troisième lueur de l'atmosphère (coucher de soleil) */
  glow: string;
  /** Style de la carte : continents colorés, ou lumières nocturnes */
  mapStyle: "colorful" | "nightlights";
  /** Océan et dégradé des terres d'ouest en est (Amériques → Europe/Afrique → Asie → Océanie) */
  mapOcean: string;
  mapLand: string[];
}

export interface Preset {
  id: PresetId;
  name: string;
  tagline: string;
  native: ResolvedMode;
  palettes: Record<ResolvedMode, Palette>;
  ambiance: Record<ResolvedMode, Ambiance>;
}

export const PRESETS: Preset[] = [
  {
    id: "eclat-ambre",
    name: "Éclat d'ambre",
    tagline: "Bordeaux profond, corail et safran, lueurs de coucher de soleil — le thème signature.",
    native: "dark",
    palettes: {
      dark: { background: "#341B2C", surface: "#FFF4E5", primary: "#FF7A52", secondary: "#E7BC4B", button: "#FF7A52", text: "#FFF4E5" },
      light: { background: "#FFF4E5", surface: "#FFFFFF", primary: "#C8461F", secondary: "#9A6B00", button: "#341B2C", text: "#341B2C" },
    },
    ambiance: {
      dark: {
        cardAccents: ["#F48A6A", "#3DBFAE", "#F27DA0", "#2FA7A0", "#F2B04B", "#B98AE8"],
        duo: ["#1F8C83", "#F08A3C"],
        glow: "#D23C7A",
        mapStyle: "colorful",
        mapOcean: "#123A3A",
        mapLand: ["#2FB59B", "#9BCB4C", "#F2C14E", "#F28C38", "#E8577A", "#F2A13A"],
      },
      light: {
        cardAccents: ["#F6A285", "#6FD0C2", "#F59BB8", "#5CC3BC", "#F4C56D", "#C9A4EE"],
        duo: ["#3BA99F", "#F3A15F"],
        glow: "#E86A9A",
        mapStyle: "colorful",
        mapOcean: "#CDE6E1",
        mapLand: ["#3FAF97", "#93BF4A", "#E3B23C", "#E8833A", "#DC5C7C", "#E6993C"],
      },
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
    ambiance: {
      dark: {
        cardAccents: ["#F8B943", "#47D1B3", "#E9876B", "#8FD06A", "#5CB8D6", "#F2D16B"],
        duo: ["#1F7A6B", "#E99A2F"],
        glow: "#2E9E7A",
        mapStyle: "colorful",
        mapOcean: "#0D2B28",
        mapLand: ["#47D1B3", "#8FD06A", "#F8D35E", "#F8B943", "#E9876B", "#F2C14E"],
      },
      light: {
        cardAccents: ["#F6C96B", "#7EDCC6", "#F0A68F", "#A9DB8B", "#86CBE2", "#F4DC8C"],
        duo: ["#3E9C8B", "#E9A74A"],
        glow: "#7FC9A8",
        mapStyle: "colorful",
        mapOcean: "#D7ECE4",
        mapLand: ["#2E9E86", "#7DB34F", "#D7AE3A", "#D9902B", "#D27058", "#CFA33C"],
      },
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
    ambiance: {
      dark: {
        cardAccents: ["#E97A52", "#50B9AC", "#E7A35B", "#7CC6D9", "#D9826F", "#A9C46A"],
        duo: ["#2F8F86", "#D9733F"],
        glow: "#B9573A",
        mapStyle: "colorful",
        mapOcean: "#1D3A3A",
        mapLand: ["#50B9AC", "#A9C46A", "#E7C25B", "#E7A35B", "#E97A52", "#D9A35B"],
      },
      light: {
        cardAccents: ["#F0A07F", "#86D0C6", "#EFC08A", "#A3D7E5", "#E5A596", "#C3D78F"],
        duo: ["#4FA79E", "#E59466"],
        glow: "#E4A07F",
        mapStyle: "colorful",
        mapOcean: "#D4E9E6",
        mapLand: ["#3B9C90", "#8CA94C", "#CDA43E", "#CF8A42", "#C9623F", "#BF8C42"],
      },
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
    ambiance: {
      light: {
        cardAccents: ["#F29A92", "#9CC9C2", "#F4C7A1", "#B7D3A8", "#E7B3C8", "#A9C3E3"],
        duo: ["#5E8F88", "#E27A6F"],
        glow: "#F1A29B",
        mapStyle: "colorful",
        mapOcean: "#E3EEEB",
        mapLand: ["#4F8A82", "#87A866", "#D4AE5C", "#D98A5A", "#D45F55", "#C99A5A"],
      },
      dark: {
        cardAccents: ["#F2786E", "#8FC1B9", "#F2B48A", "#A9CC94", "#E6A0BE", "#94B6E0"],
        duo: ["#4E847D", "#E0655B"],
        glow: "#A8423C",
        mapStyle: "colorful",
        mapOcean: "#14302C",
        mapLand: ["#8FC1B9", "#A9CC94", "#E7CB7A", "#F2B48A", "#F2786E", "#E2A86E"],
      },
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
    ambiance: {
      dark: {
        cardAccents: ["#D6F168", "#71C7B2", "#F2C46B", "#9AD3E6", "#E9A58A", "#B9E08A"],
        duo: ["#3F8F7E", "#B8CF45"],
        glow: "#5E7A2A",
        mapStyle: "colorful",
        mapOcean: "#151918",
        mapLand: ["#71C7B2", "#B9E08A", "#D6F168", "#F2C46B", "#E9A58A", "#C9D86A"],
      },
      light: {
        cardAccents: ["#E3F59B", "#9DD9CA", "#F5D79A", "#BEE2EE", "#F0C1AE", "#D2EBAF"],
        duo: ["#5FA897", "#C3D865"],
        glow: "#C9DE7E",
        mapStyle: "colorful",
        mapOcean: "#E2E7E0",
        mapLand: ["#3D9480", "#7FA63F", "#A7B82E", "#C9A23D", "#C9785E", "#8FAA45"],
      },
    },
  },
  {
    id: "atlas-nuit",
    name: "Atlas nuit",
    tagline: "Bleu nuit, cyan et violet, la Terre vue de l'espace avec ses lumières.",
    native: "dark",
    palettes: {
      dark: { background: "#0B1530", surface: "#E8F1FF", primary: "#39D0E8", secondary: "#A08BFF", button: "#39D0E8", text: "#EAF2FF" },
      light: { background: "#EEF3FB", surface: "#FFFFFF", primary: "#0B6E80", secondary: "#5B3FD1", button: "#0B1530", text: "#0B1530" },
    },
    ambiance: {
      dark: {
        cardAccents: ["#5FD6EA", "#A08BFF", "#4FA3F7", "#7BE0C4", "#C49BFF", "#6FB7FF"],
        duo: ["#1E6FA8", "#7A5BE0"],
        glow: "#6C4BD8",
        mapStyle: "nightlights",
        mapOcean: "#060D20",
        mapLand: ["#16305E", "#1A3A6B", "#1C3F72", "#1F4479", "#22487F", "#1A3A6B"],
      },
      light: {
        cardAccents: ["#8FE3F1", "#C3B6FF", "#94C6FA", "#A9EBD9", "#DAC4FF", "#A6D1FF"],
        duo: ["#3F8EC4", "#8F76E8"],
        glow: "#9FB4F2",
        mapStyle: "colorful",
        mapOcean: "#D9E4F5",
        mapLand: ["#2C8FA8", "#3E7BC4", "#5A63C9", "#7A55C9", "#5C6FD1", "#3E86C4"],
      },
    },
  },
];

export const DEFAULT_PRESET: PresetId = "eclat-ambre";

export function getPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

/** Accents proposés pour personnaliser une carte d'horloge individuelle. */
export const CLOCK_ACCENTS = ["#F48A6A", "#3DBFAE", "#F27DA0", "#2FA7A0", "#F2B04B", "#B98AE8", "#5FD6EA", "#9BCB4C", "#E8577A"];
