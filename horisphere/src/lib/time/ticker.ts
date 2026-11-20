/**
 * Horloge partagée : un seul minuteur pour toute l'application, aligné sur la seconde,
 * suspendu quand l'onglet est masqué et recalé immédiatement au retour (visibilitychange,
 * focus, pageshow). Aucun appel réseau : la référence est l'horloge de l'appareil.
 */
import { useSyncExternalStore } from "react";
import { deviceTimeZone } from "./engine";

type Listener = () => void;

let now = 0;
let deviceZone = "UTC";
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function tick() {
  now = Date.now();
  deviceZone = deviceTimeZone();
  listeners.forEach((l) => l());
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!listeners.size || document.visibilityState === "hidden") return;
  const delay = 1000 - (Date.now() % 1000) + 5;
  timer = setTimeout(() => {
    tick();
    schedule();
  }, delay);
}

function onWake() {
  tick();
  schedule();
}

let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);
  window.addEventListener("pageshow", onWake);
}

function subscribe(fn: Listener) {
  wire();
  listeners.add(fn);
  if (listeners.size === 1) onWake();
  return () => {
    listeners.delete(fn);
    if (!listeners.size && timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

/** Instant courant arrondi à la seconde ; 0 pendant le rendu serveur (afficher un état neutre). */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => (now ? now - (now % 1000) : 0),
    () => 0,
  );
}

/** Instant courant arrondi à la minute (moins de rendus pour les vues qui n'affichent pas les secondes). */
export function useNowMinute(): number {
  return useSyncExternalStore(
    subscribe,
    () => (now ? now - (now % 60_000) : 0),
    () => 0,
  );
}

/** Fuseau de l'appareil, relu à chaque tic (détecte un changement de fuseau système). */
export function useDeviceZone(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => (now ? deviceZone : null),
    () => null,
  );
}
