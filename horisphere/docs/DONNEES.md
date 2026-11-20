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

## Images de villes

Les cartes d'horloge et la fiche ville affichent une zone d'illustration. Sans image, Horisphère dessine une
illustration SVG stylisée (silhouette urbaine propre à chaque ville, relief, eau, végétation selon la latitude,
soleil ou lune selon l'état jour/nuit réel). Pour remplacer ce dessin par vos propres illustrations :

| Exigence | Valeur |
|---|---|
| Emplacement | `public/villes/` |
| Nom du fichier | identifiant du lieu + `.webp`, exactement comme dans l'adresse de la fiche : `/ville/douala-cm` → `douala-cm.webp`, `quebec-ca.webp`, `tokyo-jp.webp`, `paris-fr.webp` |
| Format | WebP (qualité 75 à 82 recommandée) |
| Dimensions | **1200 × 600 px** (ratio 2:1) ; le bas de l'image est toujours visible, le haut peut être rogné |
| Poids | **≤ 120 Ko** par image (cible 60–90 Ko) |
| Composition | Sujet (monument, skyline, paysage) dans la moitié basse ; laisser le haut calme : l'image est posée sous l'heure et la date |
| Couleurs | Tons cohérents avec le dégradé de la carte ; pas de texte incrusté |
| Licence | Images créées pour le projet ou sous licence permettant la réutilisation commerciale ; noter la source dans ce fichier |

Après l'ajout d'images, relancer `npm run dev` ou `npm run build` : le script `prepare-assets` recense les
fichiers présents (`src/data/city-images.json`) ; seules les villes listées chargent une image, sans requête
inutile. Un nom de fichier qui ne correspond à aucun lieu du catalogue est ignoré.

## Ensembles de favoris (stockage)

Clé `horisphere.favorites`, schéma **v2** : `{ items: [{ locationId, position, createdAt, setIds? }], sets: [{ id, name, createdAt }] }`.
Les données v1 (simple tableau de favoris) sont migrées automatiquement à la première lecture, avec les ensembles
« Famille » et « Travail » créés vides.
