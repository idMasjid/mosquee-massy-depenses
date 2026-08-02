# Gestion des dépenses — Mosquée de Massy

Application interne de workflow des dépenses : l'équipe **IT** initie les dépenses, l'équipe **Bureau** les valide, et un tableau de bord suit les dépenses réalisées/engagées par rapport au budget alloué, avec une projection de fin d'exercice. Une console d'administration permet de gérer les comptes et les rôles.

## Stack technique

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Prisma 7 (SQLite via l'adaptateur LibSQL, portable vers Postgres) · Auth.js v5 (email + mot de passe, Google optionnel) · react-hook-form + Zod · TanStack Table · Recharts.

## Démarrage

### 1. Installer les dépendances

```bash
npm install
```

### 2. Lancer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) et connectez-vous avec un compte admin déjà créé :

| Email | Mot de passe |
|---|---|
| `ai@mosquee-massy.fr` | `ChangeMoi123!` |
| `tama@mosquee-massy.fr` | `ChangeMoi123!` |

**Changez ce mot de passe dès la première connexion** via le menu utilisateur (avatar en haut à droite → "Changer mon mot de passe"). Ajoutez ensuite les autres membres des équipes IT et Bureau depuis **Utilisateurs** — l'admin choisit un mot de passe initial pour chaque nouveau compte, que la personne pourra changer elle-même après connexion.

### Authentification

L'authentification se fait aujourd'hui par **email + mot de passe** (comptes créés uniquement via la console `/admin/users`, pas d'auto-inscription). La connexion Google peut être activée plus tard sans changement de code : dès que `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` sont renseignés dans `.env.local`, un bouton "Se connecter avec Google" apparaît automatiquement sur la page de connexion, en complément du mot de passe. Pour la configurer :

1. Dans la [Google Cloud Console](https://console.cloud.google.com/), créez (ou sélectionnez) un projet.
2. Configurez l'écran de consentement OAuth (mode "Interne" si vous utilisez Google Workspace, sinon "Externe" + utilisateurs de test).
3. Créez un identifiant **OAuth 2.0 Client ID** de type "Application Web".
4. Ajoutez l'URI de redirection autorisée : `http://localhost:3000/api/auth/callback/google`
5. Copiez le Client ID et le Client Secret dans `.env.local` :

```bash
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
```

Un `AUTH_SECRET` est déjà généré dans `.env.local`. Si besoin d'en régénérer un :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Importer l'historique du Google Sheet

1. Depuis le Google Sheet, exportez les onglets en CSV :
   - Onglet **"Détail dépenses"** → enregistrez sous `prisma/seed-data/detail-depenses.csv`
   - Onglet **"Projets"** (ou "Recap") → enregistrez sous `prisma/seed-data/projets.csv`
2. Lancez l'import :

```bash
npm run db:seed
```

Les dépenses avec fournisseur/produit renseignés sont importées en **"Réalisé"** ; les lignes qui n'ont qu'un montant estimé et une rubrique (pas encore de fournisseur choisi) sont importées en **"À venir"** pour alimenter la prospective. L'import est protégé contre les doublons : si des dépenses existent déjà en base, il ne réimporte rien (message affiché dans la console).

⚠️ Si Windows masque les extensions de fichiers, le CSV téléchargé peut se retrouver nommé `detail-depenses.csv.csv` — vérifiez le nom exact avant de lancer l'import.

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` / `npm run start` | Build et lancement en production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Applique une nouvelle migration Prisma après modification du schéma |
| `npm run db:seed` | (Ré)importe les données de `prisma/seed-data/*.csv` |
| `npm run db:studio` | Interface Prisma Studio pour explorer la base |

## Rôles et workflow

- **IT** : crée les dépenses (statut initial "À venir" ou "En attente"), les soumet, les marque "Réalisé" une fois payées.
- **Bureau** : valide ou rejette les dépenses "En attente".
- **Admin** : peut tout faire, y compris forcer un changement de statut, et gère les comptes/rôles dans **Utilisateurs**.

Statuts : À venir → En attente → Validé → Réalisé, avec les branches Rejeté et Annulé à tout moment. Chaque changement de statut est journalisé (visible dans l'historique de chaque dépense).

## Pièces jointes

Les factures/devis sont stockées localement dans `./storage` (hors de `/public`, non accessibles sans authentification). Pour un déploiement en production, remplacez `LocalFsStorageProvider` dans `src/lib/storage.ts` par une implémentation S3/Vercel Blob respectant la même interface `StorageProvider`.

## Passer de SQLite à Postgres (déploiement)

La base de données locale est un fichier SQLite (`dev.db`) accédé via l'adaptateur LibSQL. Pour migrer vers Postgres (ex: Neon, Supabase, Vercel Postgres) :

1. Changez `provider = "sqlite"` en `provider = "postgresql"` dans `prisma/schema.prisma`.
2. Remplacez `PrismaLibSql` par `@prisma/adapter-pg` dans `src/lib/prisma.ts` et `prisma/seed.ts`.
3. Mettez à jour `DATABASE_URL` dans `.env`/`.env.local`.
4. Relancez `npx prisma migrate dev`.

Aucun autre changement de code n'est nécessaire (les montants sont stockés en centimes/entiers et les statuts en texte, compatibles avec les deux moteurs).

## Notes

- Un avertissement Turbopack bénin peut apparaître au build à propos de `src/lib/storage.ts` (trace de fichiers liée à l'usage de `path.join` avec une variable d'environnement) — cela n'affecte pas le fonctionnement de l'application.
