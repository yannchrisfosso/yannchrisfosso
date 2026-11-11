# PRD – Le Bar de Yann

> Source de vérité du projet (copie texte du PDF « PRD – Le Bar de Yann », 11 nov. 2026, 14 pages).
> Les tableaux sont conservés tels quels, en texte à largeur fixe.

```text
Nov 11, 2026        ·   @yann chris

1. Vue d'ensemble
« Le Bar de Yann » est un site vitrine mobile de 52 recettes de cocktails : il impressionne les
invités, aide Yann à préparer ses soirées et lui permet de publier la carte des cocktails
disponibles ce soir.

Problème. En événement, les invités demandent des cocktails que le barman ne peut pas
faire faute d'ingrédients, et Yann n'a pas d'outil pour présenter son savoir-faire ni préparer
ses achats.

Objectifs.

   1. Émerveiller : un invité qui choisit un cocktail voit une vraie photo, une fiche claire et
      belle.
   2. Servir l'événement : Yann publie en moins de 1 minute la liste des cocktails disponibles
      ce soir, visible sur le téléphone de chaque invité.
   3. Préparer : la liste de courses d'une soirée se calcule à partir des cocktails et du
      nombre d'invités.
   4. Décrocher des contrats : un invité peut contacter Yann pour son propre événement.

Indicateurs de succès.

  Indicateur                                          Cible

  Temps pour publier la carte du soir                 < 1 min depuis l'ouverture de l'espace
                                                      barman

  Délai de mise à jour chez les invités               ≤ 60 s sans recharger

  Chargement de l'accueil sur mobile 4G               < 2,5 s (LCP)

  Score Lighthouse mobile (perf, accessibilité,       ≥ 90 chacun
  bonnes pratiques)

  Tests de bout en bout en production                 100 % réussis avant chaque livraison

2. Utilisateurs et parcours
Deux profils utilisent le site : l'invité, sans compte, et le propriétaire (Yann), protégé par un
PIN.

  Profil                 Contexte                             Besoin principal

  Invité                 Soirée, téléphone en main,           Choisir vite un cocktail disponible
                         scanne un QR code ou reçoit le       et être impressionné
                         lien

  Ami ou client          Reçoit le lien sur WhatsApp, hors    Parcourir la carte, voir le savoir-
  potentiel              événement                            faire, contacter Yann

  Propriétaire           Avant et pendant la soirée, sur      Publier la carte du soir, préparer
  (Yann)                 iPhone                               les courses, suivre une recette

Parcours invité (soirée en ligne).

   1. Ouvre le lien ou scanne le QR code.
   2. Voit le bandeau « Ce soir au bar · X cocktails disponibles ».
   3. Choisit une humeur, la carte filtrée ou « Surprends-moi ».
   4. Ouvre la fiche, montre son choix au barman.

Parcours propriétaire (publier la carte du soir).

   1. Ouvre « Espace barman » (menu ☰) et saisit son PIN.
   2. Coche les cocktails disponibles, ou applique un modèle enregistré.
   3. Touche « Publier la carte de ce soir » : l'état passe à EN LIGNE.
   4. Ajuste en direct pendant la soirée ; touche « Arrêter la soirée » à la fin.

Parcours propriétaire (préparer une soirée). Coche des cocktails, entre le nombre
d'invités, obtient la liste de courses et la carte à montrer ; peut l'envoyer comme carte du
soir.

3. Périmètre
La version 1 couvre la vitrine, la carte du soir et la préparation de soirée ; aucune
commande ni paiement en ligne.

Inclus (v1).

       Catalogue de 52 cocktails avec vraies photos, fiche détaillée, doses ajustables, étapes
       à cocher.
       Accueil, « Quelle est ton humeur ce soir ? », cocktail du jour, « Surprends-moi », carte
       filtrable.
       Espace barman protégé par PIN : carte du soir, modèles, QR code.
       « Préparer une soirée » : liste de courses et carte des invités.

       Mode bar, favoris, partage d'une fiche, PWA installable et hors ligne.
       Section contact « Un barman pour votre événement ? ».

Hors périmètre (v1).

       Commandes en ligne, file d'attente ou paiement.
       Comptes invités, plusieurs barmans, rôles multiples.
       Gestion de stock détaillée (bouteilles restantes).
       Version anglaise (prévue plus tard, voir la feuille de route).
       Ajout de nouvelles recettes depuis l'interface (les recettes restent dans le code).

4. Architecture technique
Le site est statique sur Netlify ; seuls l'état de la soirée et les modèles passent par deux
fonctions serveur et le stockage Netlify Blobs.

architecture · site statique, Functions, Blobs

Les invités ne lisent que /api/soiree ; toute écriture passe par /api/soiree-admin avec un
jeton obtenu grâce au PIN.

  Élément              Choix

  Front                HTML, CSS et JavaScript sans framework lourd,
                       recettes dans le code (décision du 11 nov. 2026 :
                       pas de fichier JSON séparé)

  Hébergement          Netlify, projet catalogue-cocktails-yann,
                       déploiement depuis la branche principale : à
                       traiter plus tard (décision du 11 nov. 2026)

  Élément                Choix

  Serveur                Netlify Functions (Node 24, décision du
                         11 nov. 2026)

  Stockage               Netlify Blobs (état de la soirée, modèles)

  Tests                  Playwright (WebKit + Chromium), Lighthouse

  Dépôt                  Ce PRD dans docs/PRD.md , journal des versions
                         dans CHANGELOG.md

5. Exigences fonctionnelles côté invités
Chaque exigence porte un identifiant stable (F-xx) qui sert dans les tests et les rapports
de Claude Code.

  ID           Exigence                                                  Priorité

  F-01         Accueil plein écran : photo d'ambiance, logo « Le         Must
               Bar de Yann », titre « L'art du cocktail, verre après
               verre. », boutons « Choisis ton cocktail » et «
               Surprends-moi »

  F-02         « Quelle est ton humeur ce soir ? » : 6 tuiles photo      Must
               (Fruité & coloré, Frais & mentholé, Fort & classique,
               Tropical, Pétillant, Sans alcool) qui filtrent la carte

  F-03         Cocktail du jour : change chaque jour (date locale        Must
               Amérique/Toronto), photo, description, pastilles,
               barres de goût Sucré/Acide/Amer/Force

  F-04         « Surprends-moi » : animation machine à sous (≤ 2,5       Must
               s), puis ouverture de la fiche du cocktail tiré

  F-05         Carte : 52 cocktails, recherche par nom ou                Must
               ingrédient (sans accents ni majuscules), filtres par
               alcool et par style, cartes photo

  F-06         Fiche : photo plein écran, vignettes d'ingrédients,       Must
               doses en ml et oz, bouton « Verres » (1, 2, 4, 10, 20),
               étapes à cocher, astuce, anecdote, niveau d'alcool

  F-07         Mode bar : une étape à la fois, gros texte, écran         Should
               maintenu allumé (Wake Lock si disponible)

  ID           Exigence                                                   Priorité

  F-08         Partager une fiche : lien direct #nom-du-cocktail          Should
               + partage natif du téléphone, copie du lien en
               secours

  F-09         Favoris : étoile sur la fiche, filtre « Favoris »,         Could
               conservés sur l'appareil

  F-10         « Préparer une soirée » : cocktails cochés + nombre        Must
               d'invités → liste de courses (bouteilles, fruits,
               sirops, glace) + carte à montrer

  F-11         Contact « Un barman pour votre événement ? » :             Must
               boutons Appeler et Écrire (valeurs dans un seul
               fichier de configuration)

  F-12         Pied de page : logo, crédits photos, « À consommer         Must
               avec modération », numéro de version

Quand la soirée est EN LIGNE (publiée depuis l'espace barman) :

  ID           Comportement                                               Priorité

  S-01         Bandeau « Ce soir au bar · X cocktails disponibles »       Must
               avec leurs photos, en haut de l'accueil, bouton «
               Voir »

  S-02         Carte : filtre « Disponibles ce soir » actif par défaut,   Must
               disponibles en premier avec badge « Ce soir », les
               autres estompés avec « Pas ce soir » mais
               consultables

  S-03         « Surprends-moi » et cocktail du jour tirent               Must
               UNIQUEMENT parmi les disponibles

  S-04         Tuiles d'humeur : disponibles en premier +                 Should
               compteur « X ce soir »

  S-05         Fiche d'un cocktail non disponible : mention « Pas         Must
               disponible ce soir »

  S-06         Mise à jour chez l'invité au rechargement, et              Must
               automatiquement en ≤ 60 s

  S-07         Soirée HORS LIGNE ou serveur injoignable : site            Must
               complet, sans bandeau ni badge

6. Espace barman
L'espace barman (/bar) sert à une seule chose avant tout : publier la carte du soir. Un
modèle enregistré ne publie jamais rien tout seul.

Vocabulaire imposé dans l'interface.

       Sélection : les cocktails cochés à l'écran, pas encore visibles par les invités.
       Publier : rend la sélection visible par tous les invités (soirée EN LIGNE).
       Arrêter la soirée : les invités revoient toute la carte (HORS LIGNE).
       Modèle : une sélection gardée pour plus tard (« Anniversaire », « 007 »).

  ID           Exigence                                                  Priorité

  B-01         Accès : entrée « Espace barman » en bas du menu           Must
               ☰, appui long 1,5 s sur le logo du pied de page,
               adresses /bar et /admin

  B-02         Écran PIN : champ numérique, mauvais PIN =                Must
               message clair ; 5 échecs = blocage 5 min côté
               serveur

  B-03         Session ouverte sur l'appareil jusqu'à «                  Must
               Déconnexion » ou 30 jours (jeton signé, jamais le
               PIN stocké)

  B-04         Bloc d'état toujours visible en haut : « EN LIGNE ·       Must
               les invités voient X cocktails » ou « HORS LIGNE ·
               les invités voient toute la carte »

  B-05         Bouton « Publier la carte de ce soir » (impossible        Must
               avec 0 cocktail, message explicatif) et bouton «
               Arrêter la soirée »

  B-06         Soirée EN LIGNE : cocher ou décocher publie               Must
               automatiquement, message « Mis à jour pour les
               invités »

  B-07         Liste des 52 cocktails avec photo et interrupteur ;       Must
               recherche, filtres par alcool, « Tout sélectionner », «
               Tout retirer », compteur

  B-08         Modèles enregistrés sur le serveur : Enregistrer, «       Should
               Utiliser ce modèle » (puis proposer « Publier
               maintenant »), Supprimer avec confirmation

  B-09         QR code du site, plein écran, à afficher au bar           Should

  ID           Exigence                                          Priorité

  B-10         Chaque action affiche un succès ou une erreur     Must
               réelle ; jamais de faux succès si le serveur ne
               répond pas

  B-11         Bouton « Voir le site comme un invité » et «      Must
               Déconnexion »

Changer le PIN. Netlify → Project configuration → Environment variables → ADMIN_PIN →
nouvelle valeur (6 chiffres minimum) → Trigger deploy. Le PIN n'apparaît jamais dans le
code, les réponses de l'API ni les messages de Claude Code.

7. Données et API
Les recettes sont statiques (fichier JSON versionné) ; seul l'état de la soirée et les
modèles vivent côté serveur, dans Netlify Blobs.

Les schémas et routes ci-dessous décrivent le comportement attendu. Si
l'implémentation actuelle utilise d'autres noms de champs ou de routes (par exemple
/api/soiree-admin sans sous-route) et remplit l'exigence, on la garde telle quelle : pas de
renommage ni de migration sans nécessité.

Recette ( data/cocktails.json , une entrée par cocktail) :

  {
       "id": "mojito",
       "nom": "Mojito",
       "base": "rhum",
       "styles": ["menthe", "fruité", "événement"],
       "humeurs": ["frais-menthole"],
       "verre": "highball",
       "glace": "pilée",
       "methode": "Pilon",
       "difficulte": 2,
       "tempsMin": 4,
       "alcool": "moyen",
       "gout": { "sucre": 3, "acide": 3, "amer": 0, "force": 2 },
       "photo": "/images/mojito.webp",
       "ingredients": [
      { "id": "rhum-blanc", "nom": "Rhum blanc", "qte": 50, "unite": "ml",
  "image": "/images/ingredients/rhum-blanc.webp" }
    ],

      "etapes": ["…"],
      "astuce": "…",
      "anecdote": null
  }

État de la soirée (Blob soiree/etat ) :

  { "enLigne": true, "cocktails": ["mojito", "negroni"], "misAJour": "2026-11-
  11T23:10:00Z", "version": 14 }

Modèles (Blob soiree/modeles ) : liste de { "id", "nom", "cocktails": [], "creeLe"
}.

  Méthode et route                 Accès    Rôle                       Réponse

  GET /api/soiree                  Public   Lire l'état de la soirée   200 + état ; en-tête
                                                                       Cache-Control: no-
                                                                       store

  POST /api/soiree-admin/login     PIN      Échanger le PIN            200 + jeton ; 401 si PIN
                                            contre un jeton de         faux ; 429 si bloqué
                                            session

  PUT /api/soiree-admin/etat       Jeton    Publier, modifier ou       200 + nouvel état ; 400 si
                                            arrêter la soirée          0 cocktail publié ; 409 si
                                                                       version périmée

  GET/POST/DELETE                  Jeton    Gérer les modèles          200 + liste
  /api/soiree-admin/modeles

Règles. Chaque écriture vérifie le jeton côté serveur ; les identifiants de cocktails
inconnus sont refusés ; le champ version empêche qu'un vieil onglet écrase une
publication plus récente.

8. Design system
Le site garde l'ambiance validée par Yann : bar de luxe de nuit, fond très sombre, accents
dorés, vraies photos. Toute nouvelle page réutilise ces jetons, sans couleur ni police
ajoutée.

  Jeton                Valeur    Usage

   --bg                #0b0e12   Fond de page

   --surface           #141a20   Cartes, panneaux

  Jeton                   Valeur        Usage

   --line                 #232b33       Bordures fines

   --ink                  #f3efe8       Texte principal

   --muted                #a9a39a       Texte secondaire

   --gold                 #d9a65b       Boutons principaux, badges, accents

   --gold-light           #f0c784       Mots en italique dans les titres

Typographie. Titres : Cormorant Garamond (500 et 600, italique doré sur les mots forts).
Texte et boutons : Manrope (400 à 700). Sur-titres : majuscules, interlettrage 0,2 em, doré.

Composants. Boutons en pilule (hauteur ≥ 48 px), cartes arrondies 18 à 24 px, pastilles de
filtre, badge « Ce soir » doré, interrupteurs dorés, messages de confirmation en bas
d'écran.

Photos. Une vraie photo par cocktail (TheCocktailDB en priorité, sinon Unsplash ou Pexels
libres de droits), stockée dans /images en WebP, chargement différé sauf l'accueil. Le
Foléré Fizz est ROUGE (hibiscus). Crédits listés dans le pied de page ; aucune image
Shutterstock ou sous licence payante.

Référence visuelle. La maquette de l'accueil validée par Yann (image jointe au projet) fait
foi pour l'ordre des sections et la mise en page.

9. Exigences non fonctionnelles
Le point le plus sensible est le cache de la PWA : un téléphone ne doit jamais rester bloqué
sur une ancienne version.

  ID            Domaine            Exigence

  N-01          PWA et cache       index.html et /api/* ne sont jamais servis
                                   depuis le cache du service worker (réseau d'abord)
                                   ; images et polices en cache

  N-02          PWA et cache       Nouvelle version = nouveau nom de cache ;
                                    skipWaiting + clientsClaim ; la page se
                                   recharge une fois quand une nouvelle version
                                   prend la main

  N-03          PWA et cache       Numéro de version (ex. « v1.4 · 11 nov. ») affiché
                                   dans le pied de page et dans /version.json

  ID            Domaine           Exigence

  N-04          Hors ligne        Sans réseau, la carte et les fiches restent
                                  consultables ; la soirée est considérée HORS
                                  LIGNE

  N-05          Performance       LCP < 2,5 s en 4G, photos WebP ≤ 120 Ko,
                                  chargement différé hors écran

  N-06          Sécurité          PIN uniquement dans ADMIN_PIN ; comparaison en
                                  temps constant ; jeton signé (secret
                                   SESSION_SECRET ) ; 5 échecs = 5 min de blocage

  N-07          Sécurité          Aucun secret dans le code, l'historique Git ni les
                                  réponses ; en-têtes de sécurité de base (CSP, X-
                                  Content-Type-Options)

  N-08          Accessibilité     Contraste texte ≥ 4,5:1, cibles tactiles ≥ 44 px, vrais
                                  boutons et liens, focus visible, « réduire les
                                  animations » respecté

  N-09          Compatibilité     Safari iOS 17+ (prioritaire), Chrome Android,
                                  Chrome et Safari ordinateur ; appli installée sur
                                  l'écran d'accueil

  N-10          Partage           Aperçu Open Graph soigné (image, titre,
                                  description) sur WhatsApp et Messenger

  N-11          Contenu           Français ; mention « À consommer avec modération
                                  » visible sur l'accueil et le pied de page

10. Critères d'acceptation et plan de tests
Une livraison est acceptée seulement si les tests de bout en bout passent sur l'adresse de
production, avec WebKit (moteur de Safari) en taille iPhone et avec Chromium.

Outils. Playwright ( npx playwright install webkit chromium ), tests dans
 tests/e2e/ , lancés par npm run test:prod contre https://catalogue-cocktails-
yann.netlify.app . Le PIN de test est lu depuis une variable d'environnement locale,
jamais écrit dans les tests.

  Scénario                      Étapes                       Résultat attendu               Exigences

  T-01 Parcours invité          Accueil → humeur →           Photo chargée, doses × 4       F-01, F-02,
                                fiche → « Verres » = 4       exactes                        F-06

  Scénario              Étapes                         Résultat attendu                Exigences

  T-02 Mauvais PIN      /bar, PIN faux 5 fois          Message d'erreur, puis          B-02, N-06
                                                       blocage 5 min

  T-03 Publication      Navigateur A (barman)          B voit le bandeau avec          B-05, S-01,
  sur deux appareils    publie 3 cocktails ;           exactement ces 3 cocktails      S-02
                        navigateur B (invité)
                        recharge

  T-04 Mise à jour      A ajoute un 4e cocktail ;      B affiche 4 en ≤ 60 s           B-06, S-06
  sans recharger        B attend

  T-05 Surprends-       B lance « Surprends-moi        Seuls les cocktails publiés     S-03
  moi filtré            » 20 fois                      sortent

  T-06 Publication      A retire tout et touche        Publication refusée,            B-05
  vide                  Publier                        message clair

  T-07 Modèles          A enregistre « Test-e2e »,     Modèle conservé au              B-08
                        recharge, l'utilise, publie,   rechargement, publié
                        puis le supprime               correctement

  T-08 Arrêt de la      A touche « Arrêter la          B revoit toute la carte, sans   S-07
  soirée                soirée »                       badge

  T-09 Ancienne         Installer la version N,        N+1 affichée (numéro de         N-01 à N-03
  version en cache      déployer N+1, rouvrir          version) sans manipulation

  T-10 Serveur          Bloquer /api/soiree            Site complet, aucun             S-07, N-04
  injoignable                                          bandeau, aucune erreur
                                                       visible

  T-11 Qualité          Lighthouse mobile sur          ≥ 90 en performance,            N-05, N-08
                        l'accueil                      accessibilité, bonnes
                                                       pratiques

Nettoyage. Chaque exécution termine avec la soirée HORS LIGNE et supprime les
modèles de test.

11. Règles de travail pour Claude Code
Ce PRD est la source de vérité : Claude Code le lit avant chaque tâche, ne développe que
ce qu'il décrit et signale tout écart au lieu d'improviser.

On continue, on ne recommence pas. Le site en ligne est la base du travail : on ne le
reconstruit pas et on ne réécrit pas ce qui fonctionne déjà. Claude Code compare
l'existant au PRD, garde tout ce qui remplit déjà une exigence, et ne développe ou ne
corrige que les écarts. Toute refonte d'une partie existante doit d'abord être proposée à
Yann et acceptée.

Méthode pour chaque demande.

   1. Relire ce PRD (fichier docs/PRD.md à la racine du dépôt) et identifier les exigences
       concernées par leur ID.
   2. Diagnostiquer avant de coder : état actuel, cause du problème, plan en 5 lignes
       maximum.
   3. Une demande ambiguë ou en contradiction avec le PRD → poser la question, ne rien
       supposer.
   4. Coder par petites étapes, une exigence à la fois, sans toucher au reste.
   5. Déployer en production, puis lancer TOUS les tests de bout en bout (section 10)
       contre la production.
   6. Un test échoue → corriger, redéployer, relancer tous les tests ; recommencer jusqu'à
       100 %.
   7. Mettre à jour ce PRD et le journal des versions si une décision change.

Définition de « terminé » (toutes les cases, sinon ce n'est pas terminé) :

       Exigences concernées implémentées, IDs cités dans le rapport
       Déployé en production sur catalogue-cocktails-yann.netlify.app, numéro de version
       incrémenté
       Tests de bout en bout passés sur la production avec WebKit et Chromium
       Captures d'écran prises sur la production
       Soirée remise HORS LIGNE, données de test supprimées
       Aucun PIN ni secret dans le code, les commits ou la réponse

Format du rapport à Yann (en français simple, court) : ce qui a changé en 5 lignes ; tableau
exigence → réussi/échoué → navigateur ; captures ; mode d'emploi en 5 étapes maximum
si une manipulation est nécessaire ; numéro de version en ligne.

Interdits. Déclarer un succès sans test sur la production ; modifier les recettes sans
demande ; ajouter une bibliothèque lourde sans justification ; changer le design validé
sans demande.

Budget de déploiement (règle du 11 nov. 2026). Netlify gratuit = environ 20 déploiements
par mois pour toute l'équipe. Regrouper les changements, tester en local, et ne déployer
qu'une seule fois par lot validé. Les invités n'appellent /api/soiree que lorsque la page
est visible à l'écran.

12. Feuille de route
On n'ouvre une phase que lorsque la précédente a passé sa porte ; aucune date n'est fixée
pour l'instant.

feuille de route · 4 phases, 2 portes de passage

La phase 1 se termine quand les tests T-01 à T-10 passent à 100 % en production ; la phase
2, quand Yann a utilisé la carte du soir lors d'un vrai événement.

13. Questions ouvertes et décisions
Décisions prises.

  Décision                                         Raison

  Hébergement sur Netlify avec Functions et        Déjà en place, gratuit, stockage partagé
  Blobs                                            entre téléphones

  Carte du soir publiée explicitement (bouton      Éviter la confusion entre « enregistrer » et «
  Publier), modèles séparés                        montrer aux invités »

  Les cocktails non disponibles restent            La vitrine montre tout le savoir-faire
  visibles, estompés

  Foléré Fizz rouge à l'hibiscus, cocktail         Recette d'origine
  signature

Questions ouvertes.

       Garder le badge « Powered by Netlify » (gratuit) ou passer à l'offre payante (environ 9
       $ par mois) pour le retirer, ou déménager sur Vercel (le stockage serait à adapter) ?

       Intégrer le contact fourni par Yann : 438-435-7072, 367-321-3177, Yfosso4@gmail.com
       (remplace [TÉLÉPHONE] et [EMAIL]).
       Nouveau PIN à définir (l'actuel a été affiché en clair et doit être changé).
       Nom de domaine personnalisé (ex. lebardeyann.ca) ?
       Version anglaise pour les événements bilingues ?
```
