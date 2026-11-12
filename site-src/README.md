# Sources du site « Le Bar de Yanniel »

- `template.html` : page invités (design + code). `bar-template.html` : espace propriétaire `/bar`.
- `recipes-source.html` : l'ancienne page, d'où les recettes sont reprises **telles quelles**.
- `imgmeta.json` : correspondance cocktails / photos, ingrédients / vignettes, et crédits.
- Rebuild : `cd site-src && node build.js` (écrit `catalogue-cocktails/site/index.html`, `site/bar.html`,
  `site/sw.js` et `catalogue-cocktails/netlify/shared/names.mjs`).

Déploiement : le dossier `catalogue-cocktails/` (pages dans `site/`, fonctions dans `netlify/functions/`).

## Disponibles ce soir
- `GET /api/soiree` (public) : `{ active, selection, updatedAt }`, lu depuis Netlify Blobs (store `bar-de-yann`).
- `POST /api/soiree-admin` : écritures, PIN vérifié côté serveur (variable d'environnement Netlify `ADMIN_PIN`),
  8 essais ratés max par IP sur 15 min.
- Changer le PIN : Netlify > Project configuration > Environment variables > `ADMIN_PIN`, puis redéployer.

Téléphone et courriel : modifier `PHONE` et `EMAIL` en haut du script dans `template.html`, puis rebuild.

## Hébergement
Netlify (`netlify.toml`) ou Vercel temporaire (`vercel.json`) : voir `docs/VERCEL.md`.
