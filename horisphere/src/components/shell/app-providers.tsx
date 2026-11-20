"use client";

import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, type ReactNode } from "react";
import { Palette } from "lucide-react";
import { themeActions, useDraftState, useResolvedTheme, useSavedTheme, themesEqual } from "@/lib/state/theme";
import { useSettings } from "@/lib/state/settings";
import { Button, ButtonLink } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { wireInstallEvents } from "@/lib/pwa/install";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Applique les design tokens du thème actif (brouillon compris) sur <html>. */
function ThemeApplier() {
  const resolved = useResolvedTheme();
  useIsoLayoutEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(resolved.vars)) root.style.setProperty(k, v);
    root.dataset.mode = resolved.mode;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = resolved.vars["--color-bg"];
  }, [resolved]);
  return null;
}

function MotionApplier() {
  const { motion } = useSettings();
  useIsoLayoutEffect(() => {
    const root = document.documentElement;
    if (motion === "system") delete root.dataset.motion;
    else root.dataset.motion = motion;
  }, [motion]);
  return null;
}

function ServiceWorkerRegistrar() {
  useEffect(() => {
    wireInstallEvents();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

/** Bandeau visible sur toutes les pages tant qu'un aperçu de thème n'est pas enregistré. */
function DraftBar() {
  const { draft } = useDraftState();
  const saved = useSavedTheme();
  const pathname = usePathname();
  if (!draft || themesEqual(draft, saved)) return null;
  const onEditor = pathname === "/mon-univers";
  return (
    <div
      role="region"
      aria-label="Aperçu de thème non enregistré"
      className="hs-rise fixed inset-x-3 bottom-[calc(var(--bottom-nav-h)+12px)] z-[60] mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-card border border-border-surface bg-surface p-2.5 pl-4 text-on-surface shadow-card sm:flex-nowrap"
    >
      <Palette className="size-5 shrink-0 text-primary-ink-surface" aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-semibold">Aperçu non enregistré</p>
      {!onEditor && (
        <ButtonLink href="/mon-univers" variant="ghost" size="sm" className="text-on-surface hover:bg-transparent hover:underline">
          Modifier
        </ButtonLink>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-on-surface hover:bg-transparent hover:underline"
        onClick={() => {
          themeActions.discard();
          toast("Modifications abandonnées", "info");
        }}
      >
        Abandonner
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          themeActions.save();
          toast("Thème enregistré");
        }}
      >
        Enregistrer
      </Button>
    </div>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const { motion } = useSettings();
  const reduced = useMemo(() => (motion === "reduced" ? "always" : motion === "full" ? "never" : "user"), [motion]);
  return (
    <MotionConfig reducedMotion={reduced}>
      <ThemeApplier />
      <MotionApplier />
      <ServiceWorkerRegistrar />
      {children}
      <DraftBar />
    </MotionConfig>
  );
}
