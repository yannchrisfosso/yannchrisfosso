# Journal des versions — Le Bar de Yanniel

Le numéro affiché dans le pied de page et dans `/version.json` vient de `site-src/version.json`.

## v1.8 · 12 nov. 2026 — Le Bar de Yanniel + vidéo d'ambiance
- Renommage visible « Le Bar de Yann » → « Le Bar de Yanniel » (titres, logo, pied de page, <title>, Open Graph,
  manifeste PWA, /bar, page 404, messages, image de partage og.jpg, PRD et documentation). Identifiants
  techniques inchangés (store « bar-de-yann », clés, variables).
- Accueil : la vidéo `ambiance-bar-amis-son.mp4` (avec poster) remplace l'image entre l'accueil et « CE SOIR » :
  pleine largeur bord à bord, lecture muette automatique en boucle, pause hors écran, bouton son 🔇/🔊
  (coupé automatiquement hors écran), apparition au défilement (fondu, +40 px, zoom 0,96 → 1 en 900 ms),
  poster fixe si « réduire les animations » ou autoplay bloqué. Hauteur min(55vh, 72vw) sur mobile et
  min(80vh, 72vw) sur ordinateur pour garder les trois visages entiers. Ancienne image conservée dans le dépôt.
- CSP : `media-src 'self'` ; service worker : la vidéo n'est jamais mise en cache (lecture par plages).

## v1.7 · 12 nov. 2026 — Migration Vercel (temporaire)
- Hébergement temporaire sur Vercel (`bar-yanniel.vercel.app`), Netlify conservé : logique commune
  `lib/soiree-core.mjs`, stockage interchangeable `lib/store.mjs` (Netlify Blobs ou Upstash Redis selon
  `STORAGE_BACKEND`, clés `yanniel:…`, expiration native pour le blocage), fonctions `api/*.mjs`,
  `vercel.json` (réécritures, redirections, tous les en-têtes), base d'URL des fonctions dans `config.js`.
- Contient tout le lot v1.6 jamais publié. Détails et retour vers Netlify : `docs/VERCEL.md`.

## v1.6 · 11 nov. 2026 — Lot jamais publié (inclus dans v1.7)
- T-02 : blocage après 5 PIN faux, compteur unique toutes adresses confondues, en clés nouvelles
  (visibles immédiatement), pour que le 5e échec bloque vraiment (B-02, N-06).
- Règle budget Netlify : les invités n'appellent /api/soiree que si la page est visible (test R-01).
- Accueil : image d'ambiance « ambiance-bar-amis » (WebP + JPG de secours) entre l'accueil et
  « Quelle est ton humeur ce soir ? », fondue dans le fond, apparition au défilement, zoom lent et
  lueur dorée ; tout est figé si « réduire les animations » est actif, visible même sans JavaScript.
- Serveur de test local `tests/local/` (`npm run serve:local` puis `npm run test:local`).
- PRD : décisions Node 24, recettes dans le code, branche principale plus tard ; règle de budget.

## v1.5 · 11 nov. 2026 — Alignement sur le PRD
- Espace barman : vocabulaire du PRD (Sélection, Publier, Arrêter la soirée, Modèle), bloc d'état
  EN LIGNE / HORS LIGNE toujours visible, publication refusée à 0 cocktail, mise à jour automatique
  quand la soirée est en ligne, « Utiliser ce modèle » puis « Publier maintenant » (B-01 à B-11).
- Sécurité : session par jeton signé 30 jours (`SESSION_SECRET`), le PIN n'est plus gardé sur
  l'appareil ; 5 échecs = 5 min de blocage ; contrôle de version (409) ; en-têtes CSP et
  X-Content-Type-Options (B-03, N-06, N-07).
- Entrée « Espace barman » dans le menu ☰ (B-01).
- Cocktail du jour calé sur la date de Toronto (F-03) ; machine à sous ≤ 2,5 s (F-04).
- Numéro de version dans le pied de page et `/version.json` ; rechargement unique à l'arrivée d'une
  nouvelle version (F-12, N-02, N-03).
- Serveur injoignable = soirée hors ligne immédiatement (S-07, N-04).
- « À consommer avec modération » aussi sur l'accueil (N-11) ; jetons de couleur du PRD ; cibles
  tactiles ≥ 44 px (N-08) ; photos ≤ 120 Ko (N-05).
- `docs/PRD.md`, ce journal et les tests de bout en bout `tests/e2e/` (`npm run test:prod`).

## v1.4 · 11 nov. 2026 — Contact
- Vraies coordonnées (2 téléphones, courriel) dans un fichier unique `site/config.js` (F-11).

## v1.3 · 11 nov. 2026 — Accès à l'espace propriétaire
- Adresse `/admin`, page 404 qui redirige les fautes de frappe vers `/bar`, appui long sur le logo.

## v1.2 · 11 nov. 2026 — Disponibles ce soir
- Page `/bar` protégée par PIN, Netlify Functions + Blobs, bandeau et filtre « Ce soir » côté invités.

## v1.1 · 11 nov. 2026 — Site vitrine
- Vraies photos, humeurs, cocktail du jour, machine à sous, fiche, mode bar, « Préparer une soirée », PWA.

## v1.0 · 11 nov. 2026 — Catalogue
- Première mise en ligne du catalogue de cocktails sur Netlify.
