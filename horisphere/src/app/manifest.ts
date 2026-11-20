import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Horisphère — Le temps du monde",
    short_name: "Horisphère",
    description: "Heure exacte des villes du monde, carte jour/nuit, comparateur et module « Deux mondes ».",
    lang: "fr",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#341B2C",
    theme_color: "#341B2C",
    categories: ["utilities", "travel", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Mes deux mondes", short_name: "Deux mondes", url: "/deux-mondes/vue", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Comparer deux villes", short_name: "Comparer", url: "/comparer", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mes favoris", short_name: "Favoris", url: "/favoris", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
