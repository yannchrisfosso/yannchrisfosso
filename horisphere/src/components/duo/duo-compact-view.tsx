"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import { useDuo } from "@/lib/state/duo";
import { useSettings } from "@/lib/state/settings";
import { useNow } from "@/lib/time/ticker";
import { DuoStrip } from "./duo-strip";

/** Vue compacte « Deux mondes » : cible des raccourcis d'écran d'accueil. */
export function DuoCompactView() {
  const duo = useDuo();
  const now = useNow();
  const settings = useSettings();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col justify-center gap-4">
      <h1 className="font-display text-3xl font-semibold">Mes deux mondes</h1>
      <DuoStrip pref={{ ...duo, layoutMode: "confort" }} now={now} cycle={settings.hourCycle} headingLevel={2} />
      <DuoStrip pref={{ ...duo, layoutMode: "mini" }} now={now} cycle={settings.hourCycle} headingLevel={2} />
      <Link href="/deux-mondes" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-primary-ink hover:underline">
        <Settings2 className="size-4" aria-hidden /> Personnaliser
      </Link>
    </div>
  );
}
