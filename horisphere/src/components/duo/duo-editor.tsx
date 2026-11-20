"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Download, ExternalLink, Info, RotateCcw, Save } from "lucide-react";
import { getLocation } from "@/lib/catalog";
import { assignDuo, DEFAULT_DUO, duoStore, swapDuo, useDuo, type DuoPreference } from "@/lib/state/duo";
import { useSettings } from "@/lib/state/settings";
import { useResolvedTheme } from "@/lib/state/theme";
import { useNow } from "@/lib/time/ticker";
import { normalizeHex } from "@/lib/theme/color";
import { SearchBox } from "@/components/search/search-box";
import { Button, ButtonLink, Card, cx, Flag, Segmented, Switch } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { DuoStrip } from "./duo-strip";

function SlotPicker({ slot, draft, onPick }: { slot: "a" | "b"; draft: DuoPreference; onPick: (id: string) => void }) {
  const id = slot === "a" ? draft.locationIdA : draft.locationIdB;
  const loc = getLocation(id)!;
  return (
    <div className="min-w-0">
      <p className="mb-1 text-sm font-semibold text-text-muted">{slot === "a" ? "Ville de gauche" : "Ville de droite"}</p>
      <p className="mb-2 flex items-center gap-2 font-display text-2xl font-semibold">
        <Flag cc={loc.cc} round className="text-base" />
        <span className="truncate">{loc.city}</span>
      </p>
      <SearchBox
        size="md"
        label={slot === "a" ? "Changer la ville de gauche" : "Changer la ville de droite"}
        placeholder="Changer de ville…"
        onSelect={(l) => onPick(l.id)}
      />
    </div>
  );
}

function HalfColor({
  side,
  draft,
  setDraft,
}: {
  side: "a" | "b";
  draft: DuoPreference;
  setDraft: (fn: (d: DuoPreference) => DuoPreference) => void;
}) {
  const value = draft.themeOverrides?.[side];
  const palette = useResolvedTheme().palette;
  const label = side === "a" ? "Moitié gauche" : "Moitié droite";
  const set = (v: string | undefined) =>
    setDraft((d) => {
      const o = { ...(d.themeOverrides ?? {}) };
      if (v) o[side] = v;
      else delete o[side];
      return { ...d, themeOverrides: Object.keys(o).length ? o : undefined };
    });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="min-w-28 font-semibold">{label}</span>
      <Segmented
        size="sm"
        label={`Couleur de la ${label.toLowerCase()}`}
        value={value ? "custom" : "theme"}
        onChange={(m) => set(m === "theme" ? undefined : side === "a" ? palette.primary : palette.secondary)}
        options={[
          { value: "theme", label: "Thème" },
          { value: "custom", label: "Personnalisée" },
        ]}
      />
      {value && (
        <input
          type="color"
          aria-label={`Couleur personnalisée de la ${label.toLowerCase()}`}
          value={value.toLowerCase()}
          onChange={(e) => set(normalizeHex(e.target.value))}
          className="size-10 cursor-pointer rounded-control border border-border bg-transparent p-1"
        />
      )}
    </div>
  );
}

export function DuoEditor() {
  const saved = useDuo();
  const now = useNow();
  const settings = useSettings();
  // Tant que l'utilisateur n'a rien modifié, le brouillon est la version enregistrée (hydratation, autre onglet)
  const [local, setLocal] = useState<DuoPreference | null>(null);
  const draft = local ?? saved;
  const touched = local !== null;
  const [pending, setPending] = useState<string | null>(null);

  // /deux-mondes?ajouter=<id> : proposer de placer une ville
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("ajouter");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique de l'URL après montage
    if (id && getLocation(id)) setPending(id);
  }, []);

  const setDraft = (fn: (d: DuoPreference) => DuoPreference) => setLocal((d) => fn(d ?? saved));
  const dirty = JSON.stringify({ ...draft, configured: true }) !== JSON.stringify({ ...saved, configured: true }) || !saved.configured;
  const pendingLoc = getLocation(pending);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="hs-rise">
        <p className="text-xs font-bold tracking-[0.18em] text-secondary-ink uppercase">Module compact</p>
        <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Deux mondes</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Vos deux villes essentielles côte à côte, avec l&apos;écart horaire et la date de chacune. Le module apparaît sur
          l&apos;accueil et dans une vue compacte à épingler.
        </p>
      </header>

      {pendingLoc && (
        <div role="status" className="hs-themed flex flex-wrap items-center gap-3 rounded-card border border-primary-ink bg-surface-raised p-4">
          <p className="min-w-0 flex-1 font-semibold">Placer {pendingLoc.city} dans vos deux mondes :</p>
          <Button
            size="sm"
            onClick={() => {
              setDraft((d) => assignDuo(d, "a", pendingLoc.id));
              setPending(null);
            }}
          >
            À gauche
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setDraft((d) => assignDuo(d, "b", pendingLoc.id));
              setPending(null);
            }}
          >
            À droite
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
            Ignorer
          </Button>
        </div>
      )}

      <section aria-label="Aperçu" className="hs-rise hs-rise-2 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-text-muted">Aperçu</p>
          <DuoStrip pref={draft} now={now} cycle={settings.hourCycle} interactive={false} headingLevel={2} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-text-muted">Sur un téléphone (360 px)</p>
          <div className="w-full max-w-[360px] rounded-card border border-dashed border-border p-2">
            <DuoStrip pref={draft} now={now} cycle={settings.hourCycle} interactive={false} headingLevel={2} />
          </div>
        </div>
      </section>

      <Card className="flex flex-col gap-5">
        <h2 className="font-display text-xl font-semibold">Villes</h2>
        <div className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <SlotPicker slot="a" draft={draft} onPick={(id) => setDraft((d) => assignDuo(d, "a", id))} />
          <Button variant="secondary" onClick={() => setDraft(swapDuo)} className="justify-self-center rounded-full" aria-label="Inverser l'ordre des deux villes">
            <ArrowLeftRight className="size-4" aria-hidden /> <span className="md:sr-only">Inverser</span>
          </Button>
          <SlotPicker slot="b" draft={draft} onPick={(id) => setDraft((d) => assignDuo(d, "b", id))} />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">Apparence</h2>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Format</p>
          <Segmented
            label="Format du module"
            value={draft.layoutMode}
            onChange={(m) => setDraft((d) => ({ ...d, layoutMode: m }))}
            options={[
              { value: "mini", label: "Mini · une rangée" },
              { value: "confort", label: "Confort · plus détaillé" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3">
          <HalfColor side="a" draft={draft} setDraft={setDraft} />
          <HalfColor side="b" draft={draft} setDraft={setDraft} />
          <p className="text-xs text-text-muted">La couleur du texte s&apos;adapte automatiquement pour rester lisible.</p>
        </div>
        <div className="grid gap-x-8 sm:grid-cols-2">
          <Switch checked={draft.showDate} onChange={(v) => setDraft((d) => ({ ...d, showDate: v }))} label="Afficher la date" description="Utile quand les deux villes ne sont pas le même jour." />
          <Switch checked={draft.showDelta} onChange={(v) => setDraft((d) => ({ ...d, showDelta: v }))} label="Afficher le décalage" description="Écart horaire actuel au centre du module." />
        </div>
      </Card>

      <div className="hs-themed sticky bottom-[calc(var(--bottom-nav-h)+12px)] z-30 flex flex-wrap items-center gap-2 rounded-card border border-border bg-[color-mix(in_srgb,var(--color-surface-raised)_94%,transparent)] p-2 backdrop-blur-md">
        <p className="mr-auto px-2 text-sm font-semibold" aria-live="polite">
          {dirty ? (saved.configured ? "Modifications non enregistrées" : "Exemple — enregistrez pour en faire votre module") : "Enregistré"}
        </p>
        <Button
          size="sm"
          variant="ghost"
          disabled={!touched}
          onClick={() => setLocal(null)}
        >
          Annuler
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDraft(() => ({ ...DEFAULT_DUO }))}>
          <RotateCcw className="size-4" aria-hidden /> Par défaut
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!dirty}
          onClick={() => {
            duoStore.set({ ...draft, configured: true });
            setLocal(null);
            toast("Deux mondes enregistré");
          }}
        >
          <Save className="size-4" aria-hidden /> Enregistrer
        </Button>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Garder à portée de main</h2>
        <p className="text-text-muted">
          Installez Horisphère ou ajoutez un raccourci sur votre écran d&apos;accueil : il s&apos;ouvre directement sur la vue compacte
          de vos deux mondes.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/installer" variant="primary">
            <Download className="size-4" aria-hidden /> Installer Horisphère
          </ButtonLink>
          <ButtonLink href="/deux-mondes/vue" variant="secondary">
            <ExternalLink className="size-4" aria-hidden /> Ouvrir la vue compacte
          </ButtonLink>
        </div>
        <p className={cx("flex gap-2 rounded-control bg-surface-sunken p-3 text-sm text-text-muted")}>
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Les vrais widgets d&apos;écran d&apos;accueil (iOS, Android) et la bulle flottante nécessitent une future application native :
            ils ne sont pas disponibles dans cette version web. <Link href="/installer#widgets" className="font-semibold text-text underline">En savoir plus</Link>
          </span>
        </p>
      </Card>
    </div>
  );
}
