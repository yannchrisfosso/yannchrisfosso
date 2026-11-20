"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { Clock, Database, Download, ShieldCheck, Trash2 } from "lucide-react";
import { CATALOG_META } from "@/lib/catalog";
import { ALL_KEYS } from "@/lib/state/keys";
import { favoritesStore } from "@/lib/state/favorites";
import { duoStore } from "@/lib/state/duo";
import { settingsStore, updateSettings, useSettings } from "@/lib/state/settings";
import { savedThemeStore, themeActions } from "@/lib/state/theme";
import { usePersisted } from "@/lib/state/persisted";
import { useDeviceZone } from "@/lib/time/ticker";
import { copyText } from "@/lib/share";
import { Button, Card, Segmented, Switch } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

function ClockCheck() {
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-muted">
        Horisphère utilise l&apos;horloge de votre appareil. Ce test facultatif la compare à l&apos;heure du serveur qui héberge
        l&apos;application (précision d&apos;environ une seconde ; ce n&apos;est pas une horloge atomique).
      </p>
      <div>
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const t0 = Date.now();
              const res = await fetch(`/?verification-horloge=${t0}`, { method: "HEAD", cache: "no-store" });
              const t1 = Date.now();
              const header = res.headers.get("date");
              if (!header) throw new Error();
              const server = Date.parse(header) + 500; // l'en-tête est tronqué à la seconde
              const local = (t0 + t1) / 2;
              const drift = Math.round((local - server) / 1000);
              const rtt = t1 - t0;
              setResult(
                Math.abs(drift) <= 2
                  ? `Votre horloge semble à l'heure (écart inférieur à 2 s, aller-retour réseau ${rtt} ms).`
                  : `Votre horloge semble ${drift > 0 ? "en avance" : "en retard"} d'environ ${Math.abs(drift)} s. Réglez l'heure automatique dans les paramètres de votre appareil.`,
              );
            } catch {
              setResult("Vérification impossible (pas de connexion ?). Les heures restent calculées avec l'horloge de votre appareil.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Clock className="size-4" aria-hidden /> Vérifier l&apos;horloge de l&apos;appareil
        </Button>
      </div>
      {result && (
        <p role="status" className="font-semibold">
          {result}
        </p>
      )}
    </div>
  );
}

function DataManagement() {
  const dialog = useRef<HTMLDialogElement>(null);
  const exportAll = () => {
    const data: Record<string, unknown> = {};
    for (const k of ALL_KEYS) {
      try {
        const v = localStorage.getItem(k);
        if (v) data[k] = JSON.parse(v);
      } catch {
        /* ignoré */
      }
    }
    return JSON.stringify({ app: "horisphere", exportedAt: new Date().toISOString(), data }, null, 2);
  };
  // Re-rendu à chaque modification des données ; lecture du stockage uniquement côté client
  usePersisted(favoritesStore);
  usePersisted(duoStore);
  usePersisted(settingsStore);
  usePersisted(savedThemeStore);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const sizes = isClient ? ALL_KEYS.map((k) => ({ k, n: (localStorage.getItem(k) ?? "").length })) : [];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">
        Tout est enregistré uniquement dans ce navigateur (localStorage) : favoris, « Deux mondes », thème et réglages. Rien
        n&apos;est envoyé sur Internet.
      </p>
      <ul className="text-sm">
        {sizes.map(({ k, n }) => (
          <li key={k} className="flex justify-between border-b border-border py-1.5 last:border-0">
            <code>{k}</code>
            <span className="text-text-muted tabular">{n ? `${n} octets` : "vide"}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            const blob = new Blob([exportAll()], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "horisphere-donnees.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }}
        >
          <Download className="size-4" aria-hidden /> Télécharger mes données
        </Button>
        <Button size="sm" variant="ghost" onClick={async () => toast((await copyText(exportAll())) ? "Données copiées" : "Copie impossible")}>
          Copier
        </Button>
        <Button size="sm" variant="ghost" onClick={() => dialog.current?.showModal()}>
          <Trash2 className="size-4" aria-hidden /> Tout effacer
        </Button>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="effacer-titre"
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-card border border-border bg-surface-raised p-5 text-text backdrop:bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)]"
      >
        <h3 id="effacer-titre" className="font-display text-xl font-semibold">
          Effacer toutes les données ?
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Favoris, « Deux mondes », thème personnalisé et réglages seront supprimés de ce navigateur. Cette action est définitive.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => dialog.current?.close()} autoFocus>
            Annuler
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              favoritesStore.reset();
              duoStore.reset();
              settingsStore.reset();
              themeActions.discard();
              savedThemeStore.reset();
              document.documentElement.removeAttribute("style");
              dialog.current?.close();
              toast("Données effacées");
            }}
          >
            Effacer
          </Button>
        </div>
      </dialog>
    </div>
  );
}

export function SettingsHelp() {
  const settings = useSettings();
  const zone = useDeviceZone();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="hs-rise">
        <p className="text-xs font-bold tracking-[0.18em] text-secondary-ink uppercase">Réglages et aide</p>
        <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Réglages</h1>
      </header>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">Affichage de l&apos;heure</h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="mb-1.5 text-sm font-semibold">Format</p>
            <Segmented
              label="Format horaire"
              value={settings.hourCycle}
              onChange={(v) => updateSettings({ hourCycle: v })}
              options={[
                { value: "h23", label: "24 h (14:05)" },
                { value: "h12", label: "12 h (2:05 PM)" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">Animations</p>
            <Segmented
              label="Animations"
              value={settings.motion}
              onChange={(v) => updateSettings({ motion: v })}
              options={[
                { value: "system", label: "Selon le système" },
                { value: "reduced", label: "Réduites" },
                { value: "full", label: "Complètes" },
              ]}
            />
          </div>
        </div>
        <Switch checked={settings.showSeconds} onChange={(v) => updateSettings({ showSeconds: v })} label="Afficher les secondes" description="Actualisées chaque seconde tant que la page est visible, sans appel réseau." />
        <Switch
          checked={settings.mapCollapsedOnMobile}
          onChange={(v) => updateSettings({ mapCollapsedOnMobile: v })}
          label="Carte réduite sur téléphone"
          description="Privilégie la recherche et les horloges ; la carte ne se charge qu'à la demande."
        />
        <div>
          <p className="mb-1.5 text-sm font-semibold">Projection de la carte</p>
          <Segmented
            label="Projection de la carte"
            value={settings.mapProjection}
            onChange={(v) => updateSettings({ mapProjection: v })}
            options={[
              { value: "globe", label: "Globe" },
              { value: "mercator", label: "Plan" },
            ]}
          />
        </div>
        <p className="text-sm text-text-muted">
          Langue : français. Fuseau de votre appareil : <strong className="text-text">{zone ?? "…"}</strong> (détecté par le navigateur, sans
          GPS). Couleurs et apparence : <Link href="/mon-univers" className="font-semibold text-primary-ink underline">Mon univers</Link>.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Clock className="size-5" aria-hidden /> Exactitude
        </h2>
        <ClockCheck />
        <p className="text-sm text-text-muted">
          Les heures sont calculées à partir d&apos;un instant commun et de l&apos;identifiant IANA de chaque lieu (ex. America/Toronto),
          avec les règles de fuseaux de votre navigateur : heure d&apos;été, décalages de 30 et 45 minutes et changements de date
          compris. Catalogue : {CATALOG_META.count} lieux, base tzdb {CATALOG_META.tzdb}. Si un pays modifie ses règles, la mise à
          jour arrive avec celle de votre navigateur.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Database className="size-5" aria-hidden /> Données locales
        </h2>
        <DataManagement />
      </Card>

      <Card className="flex flex-col gap-3" id="confidentialite">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <ShieldCheck className="size-5" aria-hidden /> Confidentialité
        </h2>
        <ul className="ml-5 list-disc space-y-1 text-[0.95rem]">
          <li>Aucun compte, aucune publicité, aucun outil de mesure d&apos;audience, aucun cookie.</li>
          <li>Aucune géolocalisation : seul le fuseau horaire déclaré par votre navigateur est lu.</li>
          <li>Vos favoris, votre thème et vos réglages restent dans ce navigateur ; vous pouvez les exporter ou les effacer ci-dessus.</li>
          <li>La carte, les drapeaux et les polices sont servis par Horisphère elle-même : aucun service tiers n&apos;est contacté.</li>
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Questions fréquentes</h2>
        <details className="group">
          <summary className="cursor-pointer font-semibold">Pourquoi dois-je choisir une ville pour certains pays ?</summary>
          <p className="mt-1 text-sm text-text-muted">
            Le Canada, les États-Unis, la Russie, le Brésil, l&apos;Australie ou l&apos;Indonésie comptent plusieurs fuseaux. Horisphère
            associe toujours l&apos;heure à une ville ou une zone IANA, jamais au seul pays.
          </p>
        </details>
        <details>
          <summary className="cursor-pointer font-semibold">Que se passe-t-il lors d&apos;un changement d&apos;heure ?</summary>
          <p className="mt-1 text-sm text-text-muted">
            Les horloges se recalent automatiquement. Dans le comparateur, une heure qui n&apos;existe pas (passage à l&apos;heure
            d&apos;été) ou qui existe deux fois (retour à l&apos;heure d&apos;hiver) est signalée explicitement.
          </p>
        </details>
        <details>
          <summary className="cursor-pointer font-semibold">Puis-je avoir un widget sur mon écran d&apos;accueil ?</summary>
          <p className="mt-1 text-sm text-text-muted">
            Pas avec la version web : vous pouvez installer Horisphère et créer des raccourcis, mais les vrais widgets demandent une
            future application native. <Link href="/installer#widgets" className="font-semibold text-text underline">Détails</Link>.
          </p>
        </details>
        <details>
          <summary className="cursor-pointer font-semibold">Comment installer Horisphère ?</summary>
          <p className="mt-1 text-sm text-text-muted">
            Voir le <Link href="/installer" className="font-semibold text-text underline">guide d&apos;installation</Link>, adapté à votre navigateur.
          </p>
        </details>
      </Card>

      <Card className="flex flex-col gap-2 text-sm" id="licences">
        <h2 className="font-display text-xl font-semibold">Sources et licences</h2>
        <ul className="ml-5 list-disc space-y-1 text-text-muted">
          <li>Fuseaux et villes principales : base IANA tzdb {CATALOG_META.tzdb} (domaine public).</li>
          <li>Noms de pays : Unicode CLDR (licence Unicode).</li>
          <li>Fond de carte : Natural Earth 1:50m via world-atlas (domaine public / ISC).</li>
          <li>Moteur cartographique : MapLibre GL JS (BSD-3-Clause).</li>
          <li>Drapeaux : flag-icons (MIT). Icônes : Lucide (ISC).</li>
          <li>Polices : Fraunces et Manrope (SIL Open Font License 1.1).</li>
        </ul>
        <p className="text-text-muted">« Horisphère » est un nom de travail provisoire.</p>
      </Card>
    </div>
  );
}
