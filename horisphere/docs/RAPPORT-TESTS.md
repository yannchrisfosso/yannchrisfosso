# Rapport de tests — Horisphère V1

Exécution du 20 novembre 2026, Node 22.23, Chromium (Playwright 1.63), build de production Next.js 16.4.6.

| Contrôle | Commande | Résultat |
|---|---|---|
| Typage strict | `npm run typecheck` | ✅ 0 erreur |
| Lint | `npm run lint` | ✅ 0 erreur, 0 avertissement |
| Tests unitaires et composants | `npm test` | ✅ 92/92 (4 fichiers) |
| Build de production | `npm run build` | ✅ 560 pages statiques |
| Parcours de bout en bout | `npm run test:e2e` | ✅ 17/17, trois exécutions consécutives sans échec |

Les tests unitaires tournent avec `TZ=Pacific/Pago_Pago` pour prouver que le fuseau de la machine n'influence pas
les calculs ; les tests E2E simulent un appareil à Québec (`America/Toronto`, `fr-FR`).

## Couverture des 12 exigences de test de la mission

| # | Exigence | Où | Détail vérifié |
|---|---|---|---|
| 1 | Québec et Douala, hiver et été | `engine.test.ts`, E2E Parcours D | +6 h en janvier, +5 h en juillet ; 09:00 à Québec = 15:00 (3 déc.) / 14:00 (3 juil.) à Douala |
| 2 | Pays à plusieurs fuseaux | `engine.test.ts`, `solar-search.test.ts` | Canada ≥ 6 décalages ; US, RU, AU, BR, ID, CD, MX multi ; Cameroun unique ; Saskatchewan sans heure d'été ; « Canada » propose plusieurs villes |
| 3 | Changements de date | `engine.test.ts`, E2E | Kiritimati/Honolulu (même heure, jour différent), Saint-Sylvestre (Londres 2026, Paris 2027), saut de Samoa 2011, page Auckland « vendredi 1er janvier 2027 » avec horloge figée |
| 4 | Décalages non entiers | `engine.test.ts`, E2E | Inde +5:30, Népal +5:45, Iran, Afghanistan, Myanmar, Terre-Neuve −3:30, Adélaïde, Darwin, Eucla +8:45, Chatham +13:45, Marquises −9:30, Lord Howe (heure d'été de 30 min) |
| 5 | Transitions heure d'été/hiver | `engine.test.ts`, E2E | 02:30 inexistante (Québec 8 mars, Paris 29 mars), 01:30 ambiguë (Québec 1er nov., deux instants exacts), Paris 25 oct., Santiago (hémisphère sud), prochain changement calculé à la minute |
| 6 | Favoris | `theme-storage.test.ts`, E2E | Ajout sans doublon, refus d'un lieu inconnu, suppression, réorganisation (flèches clavier), persistance après rechargement |
| 7 | Thèmes : personnalisation et persistance | `theme-storage.test.ts`, E2E Parcours C | Aperçu non persistant, enregistrement persistant, annulation pas à pas, abandon, couleurs du PRD exactes |
| 8 | Lisibilité des couleurs | `theme-storage.test.ts`, E2E | 5 thèmes × 2 modes : textes ≥ 4,5:1, accents ≥ 3:1 ; couleur illisible → avertissement + correction proposée et appliquée |
| 9 | Module Deux mondes | `theme-storage.test.ts`, `components.test.tsx`, E2E Parcours B | Québec/Douala par défaut, inversion (couleurs comprises), affectation, réparation, enregistrement, présence sur l'accueil, vue compacte |
| 10 | Parcours d'installation PWA | E2E | Manifeste (standalone, icône maskable, raccourcis), icônes servies, service worker actif, page hors ligne, aucun « widget » annoncé |
| 11 | Navigation clavier | E2E, `components.test.tsx` | Lien d'évitement, recherche « / », combobox flèches + Entrée, boutons de réorganisation |
| 12 | Écrans 360, 390, 430, 768, 1280, 1440 px | E2E `responsive.spec.ts` | 9 routes × 6 largeurs sans débordement horizontal ; navigation basse mobile ; Deux mondes Mini ≤ 120 px de haut à 360 px ; carte réductible |

Tests complémentaires : recherche (accents, alias français/anglais, IANA, < 300 ms), calcul solaire (lever/coucher
à Québec, nuit et jour polaires au Svalbard, Reykjavik en décembre), stockage versionné (données corrompues,
version future, migration), composants (carte d'horloge, accent individuel, format 12 h, combobox groupée par pays).

## Contrôles manuels effectués

Revue visuelle par captures d'écran (thème sombre et clair, 1440 et 390 px) de l'accueil, de la fiche ville, du
comparateur, de Mon univers ; aucune erreur dans la console du navigateur en production (hors messages de
performance du pilote WebGL logiciel de l'environnement de test).

## Non couvert automatiquement

- Safari iOS/macOS et Firefox (seul Chromium est disponible dans l'environnement de test).
- L'invite native `beforeinstallprompt` (non déclenchable en mode automatisé) : la logique est en place, les
  instructions manuelles sont vérifiées.
- Lecteurs d'écran réels (structure ARIA vérifiée par les sélecteurs de rôle des tests).
- Mesure LCP sur réseau mobile réel (à faire après déploiement, par exemple avec Lighthouse).
