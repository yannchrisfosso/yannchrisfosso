"use client";

import { Check, Info } from "lucide-react";
import { useEffect } from "react";
import { createMemoryStore, useMemoryStore } from "@/lib/state/persisted";

interface ToastItem {
  id: number;
  text: string;
  tone: "ok" | "info";
}

const toastStore = createMemoryStore<ToastItem[]>([]);
let seq = 0;

/** Affiche un message bref, annoncé aux lecteurs d'écran. */
export function toast(text: string, tone: ToastItem["tone"] = "ok") {
  const id = ++seq;
  toastStore.set((l) => [...l.slice(-2), { id, text, tone }]);
  setTimeout(() => toastStore.set((l) => l.filter((t) => t.id !== id)), 3200);
}

export function Toaster() {
  const items = useMemoryStore(toastStore);
  useEffect(() => () => toastStore.set([]), []);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+16px)] z-[70] flex flex-col items-center gap-2 px-4"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="hs-rise pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm font-semibold text-on-surface shadow-card"
        >
          {t.tone === "ok" ? <Check className="size-4 text-primary-ink-surface" aria-hidden /> : <Info className="size-4" aria-hidden />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
