# Catalogue de lieux, cartographie et licences

## Catalogue (`src/data/locations.json`)

Généré par `npm run catalog` (`scripts/build-catalog.mjs`). 548 lieux, 247 pays et territoires.

| Source | Contenu | Licence |
|---|---|---|
| `data/tzdb/zone.tab`, `iso3166.tab` (tzdb **2026e**) | Une ville principale par zone IANA, coordonnées, codes pays | Domaine public |
| CLDR via `Intl.DisplayNames('fr')` | Noms de pays en français | Licence Unicode |
| `data/catalog/zones-fr.mjs` | Noms de villes en français, régions, popularité, alias | Saisie du projet |
| `data/catalog/extra-cities.mjs` | 130 grandes villes absentes de zone.tab (Québec, Montréal, Yaoundé, New Delhi…) rattachées explicitement à leur zone IANA | Saisie du projet ; coordonnées approximatives (≈ 0,05°) issues de références publiques (GeoNames, CC BY 4.0) |

Modèle d'un lieu (PRD §8) : `id` (slug « ville-pays »), `city`, `cc`, `region?`, `tz`, `lat`, `lon`, `pop` (0–3),
`keys` (alias normalisés), `ref?` (ville de référence du pays), `src` (`tzdb` ou `curated`).

Règles :
- l'heure est toujours calculée depuis la zone IANA d'une ville, jamais depuis un pays ;
- chaque pays a une ville de référence proposée en premier quand on cherche le pays ;
- un pays est « multi-fuseaux » s'il compte plusieurs décalages UTC **au moment présent** (calculé, pas codé) ;
- au chargement, les zones inconnues du navigateur sont écartées (zones très récentes sur un navigateur ancien).

Codes ISO sans lieu habité : BV (île Bouvet), HM (îles Heard-et-MacDonald).

Étendre le catalogue : ajouter une ligne à `extra-cities.mjs` (nom, pays, zone IANA, lat, lon, popularité, région,
alias) puis `npm run catalog`. Le script refuse les zones inconnues et les identifiants en double.

## Règles de fuseaux à l'exécution

Les décalages viennent des règles tzdb intégrées au navigateur de l'utilisateur (ICU). Elles se mettent à jour
avec le navigateur ; un pays qui change ses règles peut être affiché selon les anciennes sur un navigateur non
mis à jour (signalé dans `/aide`).

## Cartographie

- Fond : Natural Earth 1:50m (pays), paquet `world-atlas` 2.0.2 — domaine public (ISC pour le paquet). Copié dans
  `public/geo/` au build, servi par l'application. Attribution affichée sur la carte.
- Moteur : MapLibre GL JS 6.19.0 (BSD-3-Clause). Son worker est copié dans `public/vendor/`.
- Aucune tuile tierce, aucune clé d'API. Les maquettes conceptuelles ne sont pas utilisées comme source géographique.

## Autres ressources

| Ressource | Licence |
|---|---|
| Drapeaux SVG — flag-icons 7.6.0 | MIT |
| Icônes — lucide-react | ISC |
| Polices — Fraunces, Manrope (Fontsource) | SIL OFL 1.1 |
| Icône de l'application (`public/icons/icon.svg`) | Créée pour le projet |

Aucune photographie de ville n'est utilisée (licences non vérifiables dans ce cadre) ; les cartes d'horloge
proposent des fonds uni, dégradé ou motif.
