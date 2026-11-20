# Limites restantes et pistes

## Fonctionnelles

- **Widgets natifs et bulle Android** : non disponibles (impossible depuis une application web). L'interface le dit
  explicitement (`/installer#widgets`) ; la préférence « Deux mondes » est un objet autonome réutilisable par une
  future application compagnon.
- **Ensembles de favoris** : disponibles dans `/favoris` (créer, renommer, supprimer, filtrer). Ils ne sont pas
  encore proposés comme filtre sur l'accueil.
- **Langue** : interface en français uniquement ; les formats sont produits par `lib/time/format.ts` (structure
  prête pour d'autres langues, textes non externalisés).
- **Illustrations de villes** : aucune photo ni illustration externe n'est livrée (licences) ; une illustration
  SVG générée les remplace. Le format attendu pour vos images est décrit dans `docs/DONNEES.md`.
- **Synchronisation entre appareils** : aucune (pas de compte, conformément au PRD) ; export JSON manuel des données.

## Données

- Catalogue de 548 lieux : toutes les zones IANA et ~130 grandes villes ajoutées. Une ville absente doit être
  ajoutée à `data/catalog/extra-cities.mjs`. Coordonnées approximatives (centre-ville, ≈ 5 km) : suffisantes
  pour le jour/nuit, pas pour de la navigation.
- Les règles de fuseaux sont celles du navigateur de l'utilisateur ; un navigateur non mis à jour peut ignorer un
  changement de règle récent ou une zone très récente (alors masquée du catalogue).
- Le calcul solaire (NOAA simplifié) est précis à environ une minute ; le relief et l'altitude sont ignorés.

## Carte

- Fond Natural Earth 1:50m : pas de routes, ni de noms de lieux sur le fond (les noms sont portés par les
  marqueurs). Au-delà du zoom 7 la carte n'apporte plus de détail ; un fond vectoriel plus riche (par exemple
  OpenFreeMap, OSM, attribution ODbL) pourrait être ajouté, au prix d'un service tiers et d'une CSP élargie.
- Pas de regroupement géométrique (« clustering ») : l'affichage des marqueurs est filtré par popularité selon
  le zoom, ce qui évite les chevauchements dans la pratique.
- Les marqueurs non favoris ne sont pas atteignables à la tabulation (pour ne pas imposer des dizaines d'arrêts) ;
  toutes les villes restent accessibles au clavier par la recherche.
- Sans WebGL, un message remplace la carte ; le reste de l'application fonctionne.

## PWA et hors ligne

- Le service worker met en cache les pages principales et leurs ressources à l'installation ; une fiche ville
  jamais visitée n'est pas disponible hors connexion (page « hors ligne » proposée).
- iOS ne permet pas d'invite d'installation programmable : instructions manuelles.
- Firefox ordinateur n'installe pas les applications web : marque-page proposé.

## Écarts assumés avec les maquettes

- Pas d'onglet « Widgets », de bouton « Ajouter un widget », de cloche ni d'avatar (règles du PRD) : remplacés par
  « Mon univers », « Installer l'app » et « Créer un raccourci ».
- Photographies et décors foisonnants (fleurs, palmiers, paysages peints) remplacés par des illustrations SVG
  légères, un cadran romain discret et un horizon stylisé.
- Fond de carte Natural Earth : continents à aplats colorés par région plutôt qu'une carte peinte en relief.
- Le titre reprend le texte imposé (« Le temps du monde, à votre manière. ») plutôt que celui des maquettes.

## Technique

- La CSP autorise `'unsafe-inline'` pour les scripts (amorçage Next.js et script anti-flash du thème) ; une CSP à
  nonces imposerait un rendu dynamique de chaque page.
- La bibliothèque MapLibre (~300 Ko compressés) n'est chargée qu'à l'approche de la carte.
- Tests automatisés sur Chromium, Firefox et WebKit (Playwright) ; restent à vérifier sur appareils réels
  (Safari iOS en particulier). Firefox installé dans le conteneur de test n'a pas WebGL : la carte n'y est
  vérifiée que sous forme de repli.
- Le nom « Horisphère » n'a fait l'objet d'aucune vérification de marque ni de domaine.

## Déploiement

À faire par le propriétaire du projet (voir `docs/DEPLOIEMENT.md`).
