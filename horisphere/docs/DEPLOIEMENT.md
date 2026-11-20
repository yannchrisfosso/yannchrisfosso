# Déploiement sur Vercel

## État

Tentative du 20 novembre 2026 : le build de production passe localement, mais le jeton Vercel disponible dans
l'environnement de développement est limité à une équipe et l'API répond « You don't have permission to create a
project ». Le seul projet visible appartient à un autre site et n'a pas été modifié. **Aucune URL de production
n'existe donc encore.**

## Mise en ligne (une fois, depuis le tableau de bord Vercel)

1. vercel.com → **Add New → Project** → importer le dépôt GitHub `yannchrisfosso/yannchrisfosso`.
2. Project Name : `horisphere` (ou un autre nom disponible).
3. **Root Directory : `horisphere`** (le dépôt contient aussi le site du bar, à la racine).
4. Framework Preset : **Next.js** (détecté). Build Command : `npm run build` (par défaut). Install Command : `npm ci`.
   Node.js : 22.x.
5. Aucune variable d'environnement requise. Facultatif : `NEXT_PUBLIC_SITE_URL=https://<domaine>` pour les
   métadonnées Open Graph absolues.
6. Choisir la branche de production (`claude/horisphere-app-dev-ke1r4x` ou `main` après fusion) puis **Deploy**.

Le script `prebuild` copie automatiquement drapeaux, fond de carte, worker MapLibre et génère le service worker
(versionné par le SHA du commit Vercel). HTTPS, requis pour l'installation PWA et le service worker, est fourni par
Vercel.

## Après le premier déploiement

- Vérifier `/manifest.webmanifest`, `/sw.js` (en-tête `Cache-Control: no-cache`) et l'installation sur Android/iOS.
- Lancer les parcours sur l'URL : `BASE_URL=https://<url> npm run test:e2e`.
- Mesurer le LCP mobile (Lighthouse).
