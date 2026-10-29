# ÉcolePlus

Prototype web de gestion scolaire construit à partir du design Canva « ÉcolePlus Prototype ».

Le logo vectoriel est disponible en version couleur (`public/logo.svg`), en version claire pour fond sombre (`public/logo-reversed.svg`) et en icône (`public/favicon.svg`).

## Lancer

Ouvrir `public/index.html` dans un navigateur. Au premier lancement, l’établissement saisit son identité, ses coordonnées, son année scolaire, sa devise, ses niveaux et le responsable principal. Aucun établissement ni élève fictif n’est préchargé.

Les classes, dossiers élèves, membres du personnel, évaluations, présences, frais, paiements et annonces sont ajoutés manuellement depuis les écrans correspondants. Pour l’instant, ces données sont enregistrées localement dans le navigateur de l’appareil utilisé. La base D1 est conçue pour stocker plusieurs établissements, mais l’authentification et la synchronisation Worker ne sont pas encore raccordées à l’interface.

## Déploiement

- Interface et API prévues sur Cloudflare Workers, avec les fichiers statiques déployés depuis GitHub.
- La configuration `wrangler.jsonc` relie le Worker à la base `ecoleplus` avec l’identifiant D1 fourni.
- Le schéma initial de la base est dans `migrations/0001_initial_schema.sql`.
- Après avoir ajouté `CLOUDFLARE_ACCOUNT_ID` et `CLOUDFLARE_API_TOKEN` aux secrets GitHub, chaque poussée sur `main` déploie le Worker avec le workflow `.github/workflows/deploy.yml`.
- Appliquer la première migration une fois depuis un terminal authentifié Cloudflare : `npx wrangler d1 migrations apply ecoleplus --remote`.
- `/api/health` vérifie la liaison Worker–D1. Les données d’élèves ne sont pas exposées par l’API tant que l’authentification n’est pas mise en place.
- Configurer les identifiants de déploiement comme secrets GitHub ou dans les paramètres Cloudflare, jamais dans le code source.

Le Worker expose uniquement le contrôle `/api/health`. Avant d’utiliser l’application avec de vraies données scolaires, il faudra connecter les formulaires à des routes API authentifiées et activer la synchronisation avec D1.
