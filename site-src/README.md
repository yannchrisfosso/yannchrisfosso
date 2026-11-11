# Sources du site « Le Bar de Yann »

- `template.html` : la page (design + code), avec trois marqueurs remplacés au build.
- `recipes-source.html` : l'ancienne page, d'où les recettes sont reprises **telles quelles**.
- `imgmeta.json` : correspondance cocktails / photos, ingrédients / vignettes, et crédits.
- Rebuild : `node build.js template.html recipes-source.html imgmeta.json ../catalogue-cocktails/index.html`

Téléphone et courriel : modifier `PHONE` et `EMAIL` en haut du script dans `template.html`, puis rebuild.
