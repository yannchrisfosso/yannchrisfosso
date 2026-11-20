# Rapport de tests — Horisphère V1 (refonte visuelle)

Exécution du 20 novembre 2026, Node 22.23, Playwright 1.63 (Chromium, Firefox, WebKit), build de production
Next.js 16.4.6.

| Contrôle | Commande | Résultat |
|---|---|---|
| Typage strict | `npm run typecheck` | ✅ 0 erreur |
| Lint | `npm run lint` | ✅ 0 erreur, 0 avertissement |
| Tests unitaires et composants | `npm test` | ✅ 111/111 (4 fichiers) |
| Build de production | `npm run build` | ✅ 560 pages statiques |
| Parcours de bout en bout | `npm run test:e2e` | ✅ 54/54 : 18 parcours × Chromium, Firefox, WebKit ; deux exécutions complètes consécutives sans échec |

Les tests unitaires tournent avec `TZ=Pacific/Pago_Pago` pour prouver que le fuseau de la machine n'influence pas
les calculs ; les tests E2E simulent un appareil à Québec (`America/Toronto`, `fr-FR`).

Évolution par rapport à la version précédente : les 92 tests unitaires et 17 parcours d'origine sont conservés.
Ont été adaptés : le mode par défaut (sombre au lieu d'automatique) dans 2 tests unitaires ; la vérification de la
carte (carte **ou** message de repli quand le navigateur n'a pas WebGL) ; le test hors ligne sous WebKit (voir
plus bas). Ajouts : 19 tests unitaires (6e thème, contraste des dégradés, ensembles de favoris et migration v1 → v2)
et 1 parcours E2E (ensembles de favoris).

## Couverture des exigences de test

| # | Exigence | Où | Détail vérifié |
|---|---|---|---|
| 1 | Québec et Douala, hiver et été | `engine.test.ts`, E2E Parcours D | +6 h en janvier, +5 h en juillet ; 09:00 à Québec = 15:00 (3 déc.) / 14:00 (3 juil.) à Douala |
| 2 | Pays à plusieurs fuseaux | `engine.test.ts`, `solar-search.test.ts` | Canada ≥ 6 décalages ; US, RU, AU, BR, ID, CD, MX ; Cameroun unique ; Saskatchewan sans heure d'été |
| 3 | Changements de date | `engine.test.ts`, E2E | Kiritimati/Honolulu, Saint-Sylvestre, saut de Samoa 2011, Auckland « vendredi 1er janvier 2027 » avec horloge figée |
| 4 | Décalages non entiers | `engine.test.ts`, E2E | Inde, Népal +5:45, Iran, Afghanistan, Myanmar, Terre-Neuve, Adélaïde, Eucla, Chatham, Marquises, Lord Howe |
| 5 | Transitions heure d'été/hiver | `engine.test.ts`, E2E | heures inexistantes et ambiguës (Québec, Paris), hémisphère sud, prochain changement à la minute |
| 6 | Favoris | unitaires, E2E | ajout sans doublon, suppression, réorganisation au clavier, persistance ; **ensembles** : création, doublon refusé, renommage, affectation, filtre, suppression, migration v1 → v2 |
| 7 | Thèmes : personnalisation et persistance | unitaires, E2E Parcours C | aperçu non persistant, enregistrement, annulation, abandon ; couleurs du PRD exactes ; 6 thèmes |
| 8 | Lisibilité des couleurs | `theme-storage.test.ts`, E2E | 6 thèmes × 2 modes : textes ≥ 4,5:1, accents ≥ 3:1 ; **texte des cartes d'horloge et des moitiés de Deux mondes ≥ 4,5:1 sur chaque arrêt du dégradé** (accents du thème et des 9 accents proposés), recherche en pilule, bouton dégradé |
| 9 | Module Deux mondes | unitaires, composants, E2E Parcours B | Québec/Douala par défaut, inversion, affectation, enregistrement, accueil, vue compacte |
| 10 | Installation PWA | E2E | manifeste, icônes, service worker actif, cache hors ligne, aucun « widget » annoncé |
| 11 | Navigation clavier | E2E, composants | lien d'évitement, « / », combobox, réorganisation |
| 12 | Écrans 360 → 1440 px | E2E `responsive.spec.ts` | 9 routes × 6 largeurs sans débordement, sur les trois moteurs ; navigation basse ; Deux mondes Mini ≤ 120 px |

## Points propres aux moteurs

- **Firefox (sans GPU dans le conteneur de test)** : WebGL n'est pas disponible ; Horisphère affiche son message
  de repli à la place de la carte et toutes les autres fonctions passent. La carte elle-même est vérifiée dans
  Chromium et WebKit.
- **WebKit** : l'émulation hors ligne de Playwright interrompt la navigation avant le service worker (« WebKit
  encountered an internal error ») ; sous WebKit, le test vérifie donc le contenu réel du cache du service worker
  (pages `/`, `/favoris`, `/deux-mondes/vue`, `/hors-ligne`). La bascule hors ligne réelle est vérifiée dans
  Chromium et Firefox.
- **Correction issue des tests WebKit** : un texte tapé avant l'hydratation de React était ignoré par la
  recherche (échec intermittent). La recherche récupère désormais ce texte ; 8 répétitions consécutives sans échec.

## Contrôles visuels

Captures Playwright (390 et 1440 px, données de démonstration, horloge figée) et comparaisons côte à côte avec
les maquettes dans `docs/captures/`.

## Non couvert automatiquement

- Safari et Firefox réels sur appareils (les moteurs WebKit et Gecko de Playwright s'en approchent).
- L'invite native `beforeinstallprompt` (non déclenchable en mode automatisé).
- Lecteurs d'écran réels ; mesure LCP sur réseau mobile (à faire après déploiement).
