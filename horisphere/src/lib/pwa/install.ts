"use client";

/**
 * Détection des capacités d'installation, sans promettre ce que le navigateur ne permet pas.
 * - Chromium (Chrome, Edge, Samsung Internet, Opera) : événement beforeinstallprompt → bouton « Installer ».
 * - Safari iOS/iPadOS : pas d'invite programmable → instructions « Partager → Sur l'écran d'accueil ».
 * - Safari macOS : « Fichier → Ajouter au Dock ».
 * - Firefox ordinateur : pas d'installation d'application web → favori / raccourci.
 */
import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type Platform = "ios" | "android" | "mac" | "windows" | "linux" | "other";
export type Browser = "safari" | "chrome" | "edge" | "firefox" | "samsung" | "opera" | "other";

export interface InstallState {
  ready: boolean;
  platform: Platform;
  browser: Browser;
  standalone: boolean;
  canPrompt: boolean;
  installed: boolean;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let state: InstallState = { ready: false, platform: "other", browser: "other", standalone: false, canPrompt: false, installed: false };
const listeners = new Set<() => void>();

export function detect(ua: string, maxTouchPoints = 0): { platform: Platform; browser: Browser } {
  const iPadOS = /Macintosh/.test(ua) && maxTouchPoints > 1;
  const platform: Platform = /iPhone|iPad|iPod/.test(ua) || iPadOS
    ? "ios"
    : /Android/.test(ua)
      ? "android"
      : /Macintosh/.test(ua)
        ? "mac"
        : /Windows/.test(ua)
          ? "windows"
          : /Linux/.test(ua)
            ? "linux"
            : "other";
  const browser: Browser = /SamsungBrowser/.test(ua)
    ? "samsung"
    : /Edg\//.test(ua)
      ? "edge"
      : /OPR\//.test(ua)
        ? "opera"
        : /Firefox|FxiOS/.test(ua)
          ? "firefox"
          : /CriOS|Chrome/.test(ua)
            ? platform === "ios"
              ? "safari" // sur iOS, tous les navigateurs utilisent WebKit ; le partage est la seule voie
              : "chrome"
            : /Safari/.test(ua)
              ? "safari"
              : "other";
  return { platform, browser };
}

function compute() {
  const { platform, browser } = detect(navigator.userAgent, navigator.maxTouchPoints);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  state = { ready: true, platform, browser, standalone, canPrompt: !!deferred, installed: installed || standalone };
  listeners.forEach((l) => l());
}

let wired = false;
/** À appeler une fois au démarrage (l'événement peut arriver très tôt). */
export function wireInstallEvents() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    compute();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    compute();
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", compute);
  compute();
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const e = deferred;
  deferred = null;
  await e.prompt();
  const choice = await e.userChoice;
  compute();
  return choice.outcome;
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (fn) => {
      wireInstallEvents();
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
    () => state,
  );
}
