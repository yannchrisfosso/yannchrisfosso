# Horisphère

> « Le temps du monde, à votre manière. » — nom de travail provisoire, à valider juridiquement (marques, domaines).

Application web (PWA) d'horloge mondiale : heure et date exactes de 548 lieux (247 pays et territoires),
carte du monde interactive avec l'ombre de la nuit en direct, comparateur de fuseaux, favoris sans compte,
module compact « Deux mondes » et personnalisation complète des couleurs (« Mon univers »).

Référence : PRD Horisphère v1.0 (20 novembre 2026).

## Lancer le projet

Prérequis : Node.js ≥ 20.9 (testé avec Node 22), npm.

```bash
cd horisphere
npm ci
npm run dev          # http://localhost:3000 (copie d'abord drapeaux, carte et worker MapLibre dans public/)
```

| Commande | Rôle |
|---|---|
| `npm run build` puis `npm start` | Build de production (560 pages statiques) et serveur |
| `npm run typecheck` | Types de routes Next.js + TypeScript strict |
| `npm run lint` | ESLint (règles Next.js, React Hooks, TypeScript) |
| `npm test` | Tests unitaires et de composants (Vitest + Testing Library) |
| `npm run test:e2e` | Parcours Playwright sur le build de production (lance `next start` sur le port 3200) |
| `npm run check` | Typage, lint, tests et build en une commande |
| `npm run catalog` | Régénère `src/data/locations.json` depuis `data/` |
| `npm run icons` | Régénère les icônes PNG de la PWA depuis `public/icons/icon.svg` |

Aucune variable d'environnement n'est nécessaire. `NEXT_PUBLIC_SITE_URL` (facultative) fixe l'URL absolue des
métadonnées Open Graph.

## Pages

| Route | Contenu |
|---|---|
| `/` | Explorer : titre, recherche, carte (globe ou plan), favoris, horloges, Deux mondes |
| `/ville/[slug]` | Détail : drapeau, heure à la seconde, date, IANA, UTC, écart avec vous, lever/coucher, prochain changement d'heure, autres villes du pays |
| `/comparer` | Deux villes, écart actuel, conversion d'une date/heure, heures ambiguës ou sautées, frise 24 h, copie et lien partageable |
| `/favoris` | Ajout, recherche, réorganisation (glisser ou flèches), suppression, affectation à Deux mondes |
| `/mon-univers` | 5 thèmes, mode clair/sombre/auto, 6 couleurs, contrastes WCAG, arrondis, dégradés, cartes individuelles, export/import JSON, annuler/enregistrer/réinitialiser |
| `/deux-mondes` et `/deux-mondes/vue` | Configuration du module (Mini/Confort, couleurs, date, décalage) et vue compacte à épingler |
| `/installer` | Installation selon le navigateur, raccourcis directs, limites des widgets |
| `/aide` | Réglages (12/24 h, secondes, animations, carte), vérification d'horloge, données locales, confidentialité, licences |

## Architecture

```
horisphere/
├─ data/                 Sources du catalogue (tzdb 2026e, noms français, villes ajoutées)
├─ scripts/              build-catalog, prepare-assets (drapeaux, carte, worker, service worker), generate-icons
├─ src/
│  ├─ lib/time/          Moteur horaire pur (engine, format, solar, ticker) — aucune dépendance UI
│  ├─ lib/catalog/       Accès au catalogue de lieux
│  ├─ lib/search/        Recherche tolérante aux accents et alias, regroupée par pays
│  ├─ lib/theme/         Couleurs, contrastes WCAG, thèmes prédéfinis, génération des design tokens
│  ├─ lib/state/         Stockage local versionné : favoris, Deux mondes, thème (brouillon + enregistré), réglages
│  ├─ lib/pwa/           Détection navigateur et invite d'installation
│  ├─ components/        UI : shell, clock, map, search, favorites, duo, compare, theme, install, help
│  └─ app/               Routes Next.js (App Router), manifest
└─ tests/                unit/ (Vitest) et e2e/ (Playwright)
```

### Choix techniques

- **Next.js 16.4 (App Router) + React 19.3 + TypeScript strict + Tailwind CSS 4.** Les pages sont statiques ;
  tout le calcul horaire se fait dans le navigateur. Pas de backend, pas d'authentification, pas de base de
  données (non nécessaires en V1, conformément au PRD).
- **Moteur horaire maison sur `Intl.DateTimeFormat`.** Chaque calcul part d'un instant UTC commun et de
  l'identifiant IANA du lieu ; aucun décalage n'est codé en dur. `resolveWallTime` convertit une heure murale en
  instant en signalant explicitement les heures **ambiguës** (deux instants) et **inexistantes** (saut d'heure
  d'été, décalage d'avant la transition appliqué, comme RFC 5545). Aucune bibliothèque de dates n'a été nécessaire.
- **Horloge partagée** (`lib/time/ticker.ts`) : un seul minuteur aligné sur la seconde, arrêté quand l'onglet est
  masqué, recalé au retour (`visibilitychange`, `focus`, `pageshow`) ; le fuseau de l'appareil est relu à chaque
  tic. Aucun appel réseau.
- **Jour/nuit solaire** (algorithme NOAA) à partir des coordonnées de chaque ville : lever/coucher, jour et nuit
  polaires ; jamais de règle fixe 6 h–18 h. L'état est toujours affiché avec une icône **et** un mot.
- **Carte MapLibre GL JS 6** avec un fond **Natural Earth 1:50m** (domaine public) servi par l'application :
  pas de clé, pas de service tiers, fonctionne hors ligne. Globe ou plan, ombre de la nuit et du crépuscule
  recalculée chaque minute, marqueurs aux coordonnées réelles (popularité par niveau de zoom, favoris toujours
  visibles et focalisables), chargement différé à l'approche de l'écran, réduction sur mobile.
- **Design tokens CSS** (`--color-bg`, `--color-surface`, `--color-primary`, …, `--radius-card`, `--motion-duration`,
  `--font-display`, `--font-ui`) générés par `lib/theme/tokens.ts` ; aucun composant n'a de couleur en dur
  (hors drapeaux et nuanciers de couleurs). Un script en ligne applique le thème enregistré avant le premier
  affichage (pas de flash).
- **Brouillon de thème** : l'aperçu s'applique immédiatement à toute l'application, n'est persisté qu'au clic
  sur « Enregistrer », chaque modification est annulable une à une.
- **Stockage local versionné** : enveloppe `{ v, data }`, validation et réparation de chaque valeur lue
  (données corrompues ou version future ignorées), synchronisation entre onglets.
- **PWA** : manifeste (icônes, icône « maskable », raccourcis Deux mondes/Comparer/Favoris), service worker écrit
  à la main (pages en réseau d'abord avec repli cache et page hors ligne, ressources versionnées en cache d'abord),
  invite d'installation réelle sur Chromium, instructions honnêtes ailleurs.
- **Animations** : CSS et Motion, transitions de 150–350 ms, aucune animation permanente ;
  `prefers-reduced-motion` respecté, plus un réglage explicite (système / réduites / complètes).
- **Sécurité** : CSP stricte (`default-src 'self'`, aucun domaine tiers), `Permissions-Policy` désactivant la
  géolocalisation, aucun secret dans le frontend.
- **Polices** auto-hébergées (Fontsource) : Fraunces (titres) et Manrope (interface, chiffres tabulaires).

## Données et licences

Voir [`docs/DONNEES.md`](docs/DONNEES.md). Résumé : IANA tzdb (domaine public), CLDR (licence Unicode), Natural
Earth (domaine public), MapLibre GL JS (BSD-3), flag-icons (MIT), Lucide (ISC), Fraunces et Manrope (OFL 1.1),
Next.js (MIT), React (MIT), Motion (MIT), Tailwind CSS (MIT).

## Rapports

- [`docs/RAPPORT-TESTS.md`](docs/RAPPORT-TESTS.md) — tests exécutés et résultats.
- [`docs/LIMITES.md`](docs/LIMITES.md) — limites restantes et pistes.
- [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md) — déploiement Vercel.
