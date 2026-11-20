"use client";

import Link from "next/link";
import { CircleCheck, Copy, Download, Link2, MonitorSmartphone, Smartphone, SquarePlus, Share, WifiOff } from "lucide-react";
import { getLocation } from "@/lib/catalog";
import { promptInstall, useInstallState, type Browser, type Platform } from "@/lib/pwa/install";
import { useFavorites } from "@/lib/state/favorites";
import { copyText } from "@/lib/share";
import { Button, Card, Flag } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

interface Guide {
  id: string;
  title: string;
  match: (p: Platform, b: Browser) => boolean;
  steps: React.ReactNode[];
  note?: string;
}

const GUIDES: Guide[] = [
  {
    id: "ios",
    title: "iPhone et iPad (Safari, et autres navigateurs iOS)",
    match: (p) => p === "ios",
    steps: [
      <>Touchez le bouton <strong>Partager</strong> <Share className="inline size-4" aria-label="(icône Partager)" /> dans la barre du navigateur.</>,
      <>Choisissez <strong>Sur l&apos;écran d&apos;accueil</strong> <SquarePlus className="inline size-4" aria-hidden /> (faites défiler la liste si besoin).</>,
      <>Validez avec <strong>Ajouter</strong>. Horisphère s&apos;ouvre ensuite en plein écran, comme une application.</>,
    ],
    note: "Apple ne permet pas d'afficher une invite d'installation automatique : ces étapes manuelles sont la seule voie sur iOS.",
  },
  {
    id: "android-chrome",
    title: "Android (Chrome, Edge, Samsung Internet)",
    match: (p, b) => p === "android" && b !== "firefox",
    steps: [
      <>Si un bouton <strong>Installer Horisphère</strong> apparaît sur cette page, utilisez-le.</>,
      <>Sinon, ouvrez le menu <strong>⋮</strong> du navigateur puis <strong>Installer l&apos;application</strong> (ou <strong>Ajouter à l&apos;écran d&apos;accueil</strong>).</>,
      <>Appui long sur l&apos;icône installée : raccourcis directs vers Deux mondes, Comparer et Favoris.</>,
    ],
  },
  {
    id: "android-firefox",
    title: "Android (Firefox)",
    match: (p, b) => p === "android" && b === "firefox",
    steps: [<>Ouvrez le menu <strong>⋮</strong>, puis <strong>Installer</strong> ou <strong>Ajouter à l&apos;écran d&apos;accueil</strong>.</>],
  },
  {
    id: "desktop-chromium",
    title: "Ordinateur (Chrome, Edge, Opera)",
    match: (p, b) => ["windows", "mac", "linux", "other"].includes(p) && ["chrome", "edge", "opera"].includes(b),
    steps: [
      <>Utilisez le bouton <strong>Installer Horisphère</strong> ci-dessus, ou l&apos;icône d&apos;installation dans la barre d&apos;adresse.</>,
      <>Horisphère s&apos;ouvre alors dans sa propre fenêtre et peut être épinglée à la barre des tâches ou au Dock.</>,
    ],
  },
  {
    id: "mac-safari",
    title: "Mac (Safari 17 ou plus récent)",
    match: (p, b) => p === "mac" && b === "safari",
    steps: [<>Menu <strong>Fichier</strong> → <strong>Ajouter au Dock</strong>.</>],
  },
  {
    id: "desktop-firefox",
    title: "Ordinateur (Firefox)",
    match: (p, b) => p !== "android" && p !== "ios" && b === "firefox",
    steps: [
      <>Firefox pour ordinateur n&apos;installe pas les applications web. Ajoutez Horisphère à vos <strong>marque-pages</strong> (Ctrl/Cmd + D) ou épinglez l&apos;onglet.</>,
    ],
  },
];

function ShortcutLink({ href, label }: { href: string; label: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
      <Link href={href} className="font-semibold hover:underline">
        {label}
      </Link>
      <span className="flex items-center gap-2">
        <code className="text-xs text-text-muted">{href}</code>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Copier le lien"
          onClick={async () => toast((await copyText(window.location.origin + href)) ? "Lien copié" : "Copie impossible")}
        >
          <Copy className="size-4" aria-hidden />
        </Button>
      </span>
    </li>
  );
}

export function InstallGuide() {
  const s = useInstallState();
  const favs = useFavorites();
  const current = s.ready ? GUIDES.find((g) => g.match(s.platform, s.browser)) : undefined;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="hs-rise">
        <p className="text-xs font-bold tracking-[0.18em] text-secondary-ink uppercase">Application web</p>
        <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Installer Horisphère</h1>
        <p className="mt-2 max-w-2xl text-text-muted">
          Gardez Horisphère à portée de main : icône sur l&apos;écran d&apos;accueil, ouverture en plein écran, et consultation de vos
          favoris même hors connexion.
        </p>
      </header>

      <Card className="hs-rise hs-rise-2 flex flex-col gap-3">
        {!s.ready ? (
          <p className="text-text-muted">Détection de votre navigateur…</p>
        ) : s.installed ? (
          <p className="flex items-center gap-2 text-lg font-semibold">
            <CircleCheck className="size-6 text-secondary-ink" aria-hidden /> Horisphère est installée sur cet appareil.
          </p>
        ) : s.canPrompt ? (
          <>
            <p className="font-semibold">Votre navigateur permet d&apos;installer Horisphère en un geste.</p>
            <div>
              <Button
                variant="cta"
                size="lg"
                onClick={async () => {
                  const r = await promptInstall();
                  if (r === "accepted") toast("Installation lancée");
                }}
              >
                <Download className="size-5" aria-hidden /> Installer Horisphère
              </Button>
            </div>
          </>
        ) : current ? (
          <>
            <p className="flex items-center gap-2 font-semibold">
              <Smartphone className="size-5" aria-hidden /> Pour votre appareil : {current.title}
            </p>
            <ol className="ml-5 list-decimal space-y-1.5">
              {current.steps.map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ol>
            {current.note && <p className="text-sm text-text-muted">{current.note}</p>}
          </>
        ) : (
          <p>
            Votre navigateur ne propose pas d&apos;invite d&apos;installation détectable. Consultez les instructions ci-dessous ou ajoutez
            simplement Horisphère à vos favoris de navigation.
          </p>
        )}
      </Card>

      <section aria-labelledby="guides" className="flex flex-col gap-3">
        <h2 id="guides" className="font-display text-2xl font-semibold">
          Selon votre navigateur
        </h2>
        {GUIDES.map((g) => (
          <details key={g.id} className="hs-themed group rounded-card border border-border bg-surface-raised p-4" open={g.id === current?.id}>
            <summary className="cursor-pointer list-none font-semibold marker:hidden">
              <span className="inline-flex items-center gap-2">
                <MonitorSmartphone className="size-4 text-text-muted" aria-hidden />
                {g.title}
              </span>
            </summary>
            <ol className="mt-3 ml-5 list-decimal space-y-1.5">
              {g.steps.map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ol>
            {g.note && <p className="mt-2 text-sm text-text-muted">{g.note}</p>}
          </details>
        ))}
      </section>

      <Card id="raccourcis" className="flex scroll-mt-24 flex-col gap-2">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Link2 className="size-5" aria-hidden /> Créer un raccourci
        </h2>
        <p className="text-sm text-text-muted">
          Chaque page a sa propre adresse : ouvrez-la puis ajoutez-la à l&apos;écran d&apos;accueil (ou en marque-page) pour arriver
          directement dessus.
        </p>
        <ul>
          <ShortcutLink href="/deux-mondes/vue" label="Mes deux mondes (vue compacte)" />
          <ShortcutLink href="/favoris" label="Mes favoris" />
          <ShortcutLink href="/comparer" label="Comparateur" />
          {favs.slice(0, 6).map((f) => {
            const l = getLocation(f.locationId);
            return l ? (
              <ShortcutLink
                key={l.id}
                href={`/ville/${l.id}`}
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <Flag cc={l.cc} /> {l.city}
                  </span>
                }
              />
            ) : null;
          })}
        </ul>
      </Card>

      <section id="widgets" aria-labelledby="widgets-titre" className="hs-themed scroll-mt-24 rounded-card border border-border bg-surface-sunken p-5 sm:p-6">
        <p className="text-xs font-bold tracking-[0.18em] text-secondary-ink uppercase">Découvrir les widgets à venir</p>
        <h2 id="widgets-titre" className="mt-1 font-display text-2xl font-semibold">
          Widgets et bulle flottante : pas encore
        </h2>
        <div className="mt-3 grid gap-4 text-[0.95rem] md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Ce que la version web fait aujourd&apos;hui</h3>
            <ul className="mt-1 ml-5 list-disc space-y-1 text-text-muted">
              <li>Icône sur l&apos;écran d&apos;accueil et ouverture en plein écran.</li>
              <li>Raccourcis vers une ville, vos favoris ou vos deux mondes.</li>
              <li>Module « Deux mondes » compact dans l&apos;application.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Ce qu&apos;elle ne peut pas faire</h3>
            <ul className="mt-1 ml-5 list-disc space-y-1 text-text-muted">
              <li>Aucune application web ne peut afficher une horloge permanente par-dessus les autres applications.</li>
              <li>Les widgets d&apos;écran d&apos;accueil ou de verrouillage iOS et Android exigent une application native.</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-sm text-text-muted">
          Une application compagnon (widget une ville, widget « Deux mondes », bulle Android facultative et désactivée par défaut) est
          envisagée dans une phase ultérieure. Vos réglages actuels de « Deux mondes » sont conçus pour pouvoir y être repris.
        </p>
      </section>

      <Card className="flex gap-3">
        <WifiOff className="mt-1 size-5 shrink-0 text-text-muted" aria-hidden />
        <div>
          <h2 className="font-semibold">Hors connexion</h2>
          <p className="text-sm text-text-muted">
            Une fois Horisphère chargée, les pages déjà visitées, vos favoris, la carte et les heures restent disponibles sans
            réseau : les heures sont calculées sur votre appareil. Les règles de fuseaux sont celles de votre navigateur ; elles se
            mettent à jour avec lui.
          </p>
        </div>
      </Card>
    </div>
  );
}
