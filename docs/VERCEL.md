# Hébergement temporaire sur Vercel — « Le Bar de Yann »

Netlify reste en place (netlify.toml, netlify/functions, @netlify/blobs intacts). Le même code tourne sur les deux :

| | Netlify | Vercel (temporaire) |
|---|---|---|
| Pages | `catalogue-cocktails/site/` | idem (`outputDirectory: "site"`) |
| Fonctions | `netlify/functions/*.mjs` | `api/*.mjs` |
| Logique | `lib/soiree-core.mjs` (commune) | `lib/soiree-core.mjs` (commune) |
| Stockage | Netlify Blobs, store `bar-de-yann` | Upstash Redis, clés `yanniel:…` |
| Choix du stockage | `STORAGE_BACKEND` absent ou `netlify-blobs` | `STORAGE_BACKEND=upstash` |
| Config | `netlify.toml` + `site/_headers` | `vercel.json` |
| Base d'URL des fonctions | `/api` (`site/config.js` → `apiBase`) | `/api` |

Clés Upstash : `yanniel:disponibles-ce-soir` (soirée), `yanniel:modeles` (modèles),
`yanniel:login-fail/…` et `yanniel:login-ok/…` (expiration native 300 s = 5 min, comme le blocage Netlify).

## Réglages Vercel (à saisir une fois)
1. vercel.com → Add New → Project → Import du dépôt GitHub `yannchrisfosso/yannchrisfosso`.
2. Project Name : `bar-yanniel` (sinon `le-bar-yanniel`).
3. Framework Preset : **Other** · Root Directory : **catalogue-cocktails** · Build Command : vide (désactivé) ·
   Output Directory : **site** · Install Command : `npm install`.
4. Production Branch : la branche qui porte la migration (`claude/cocktail-catalogue-netlify-q1b4cv`).
5. Storage → Marketplace → **Upstash for Redis** (offre gratuite) → Connect to project `bar-yanniel`
   (crée `KV_REST_API_URL` et `KV_REST_API_TOKEN`).
6. Settings → Environment Variables (Production) : `ADMIN_PIN`, `SESSION_SECRET`, `STORAGE_BACKEND` = `upstash`.
7. Deployments → Redeploy (pour que les variables soient prises en compte).

## Revenir sur Netlify plus tard
1. Annuler le commit « og:url et og:image vers bar-yanniel.vercel.app » (`git revert <commit>`).
2. Déployer `catalogue-cocktails/` sur Netlify comme avant (rien à changer : `STORAGE_BACKEND` absent = Netlify Blobs).
3. Les données de soirée et les modèles saisis sur Vercel restent dans Upstash : les ressaisir dans `/bar` si besoin.
4. Mettre le projet Vercel en pause ou le supprimer depuis son tableau de bord.

## Tests locaux
- Équivalent de `vercel dev` (qui exige un compte connecté) : `npm run serve:vercel-local` puis `npm run test:vercel-local`.
- Mode Netlify : `npm run serve:local` puis `npm run test:local`.
