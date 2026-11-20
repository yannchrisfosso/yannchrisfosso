import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/manrope/wght.css";
import "./globals.css";
import { AppProviders } from "@/components/shell/app-providers";
import { BottomNav, Header } from "@/components/shell/header";
import { Toaster } from "@/components/ui/toast";
import { DEFAULT_THEME, resolveTheme, themeBootScript } from "@/lib/theme/tokens";
import { SETTINGS_KEY, THEME_KEY } from "@/lib/state/keys";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Horisphère — Le temps du monde, à votre manière", template: "%s · Horisphère" },
  description:
    "Heure et date exactes de chaque ville du monde, carte interactive jour/nuit, comparateur de fuseaux, favoris et module « Deux mondes ». Sans compte, sans GPS.",
  applicationName: "Horisphère",
  appleWebApp: { capable: true, title: "Horisphère", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Horisphère — Le temps du monde, à votre manière",
    description: "L'heure exacte de chaque ville, une carte jour/nuit et vos deux mondes côte à côte.",
    type: "website",
    locale: "fr_FR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Couleur de barre du navigateur : fond du thème par défaut (mis à jour ensuite par le thème actif)
  themeColor: resolveTheme(DEFAULT_THEME, true).vars["--color-bg"],
};

/** Variables par défaut des deux modes (thème signature), avant toute préférence enregistrée. */
function defaultThemeCss() {
  const toCss = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
  const dark = resolveTheme(DEFAULT_THEME, true).vars;
  const light = resolveTheme(DEFAULT_THEME, false).vars;
  // html:root : plus spécifique que les valeurs @theme de globals.css, quel que soit l'ordre des feuilles
  return `html:root{${toCss(dark)}}@media (prefers-color-scheme: light){html:root{${toCss(light)}}}`;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: defaultThemeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript(THEME_KEY, SETTINGS_KEY) }} />
      </head>
      <body>
        <div className="hs-atmosphere" aria-hidden />
        <AppProviders>
          <Header />
          <main id="contenu" className="mx-auto w-full max-w-[1440px] px-4 pt-5 pb-[calc(var(--bottom-nav-h)+40px)] md:px-6 md:pt-8 lg:px-8">
            {children}
          </main>
          <BottomNav />
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
