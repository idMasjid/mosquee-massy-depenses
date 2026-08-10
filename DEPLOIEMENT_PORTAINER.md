# Déploiement Portainer — Dépenses Mosquée de Massy

Ce guide décrit le déploiement de l'application via Docker, publiée sur GitHub Container Registry (GHCR) et administrée avec Portainer Community Edition, à partir du dépôt `https://github.com/idMasjid/mosquee-massy-depenses`, branche `master`.

Aucune base de données séparée n'est utilisée : les données sont stockées en SQLite (via Prisma + libSQL) dans un fichier conservé sur un volume Docker nommé.

---

## 1. Pousser les nouveaux fichiers dans GitHub

Depuis votre poste, dans le dépôt du projet :

```bash
git add Dockerfile .dockerignore docker-compose.yml .env.example \
  .github/workflows/docker-publish.yml DEPLOIEMENT_PORTAINER.md \
  docker-entrypoint.sh src/app/api/health/route.ts src/proxy.ts
git commit -m "Ajoute le déploiement Docker/Portainer (image GHCR + CI)"
git push origin master
```

> Vérifiez avant le push qu'aucun fichier `.env` n'est suivi par Git (voir §9) — `git status` ne doit lister aucun fichier `.env*` autre que `.env.example`.

## 2. Vérifier que GitHub Actions a construit l'image

1. Sur GitHub, ouvrez l'onglet **Actions** du dépôt `mosquee-massy-depenses`.
2. Le workflow **Docker Publish** doit démarrer automatiquement après le push (déclenché par `push` sur `master`). Vous pouvez aussi le relancer manuellement via **Run workflow** (déclencheur `workflow_dispatch`).
3. Le job **Lint & typecheck** doit passer avant que **Build & push image** ne démarre.
4. Une fois le job **Build & push image** vert, l'image est disponible sur GHCR avec deux tags : `latest` et `sha-<sha_git_court>`.
5. En cas d'échec, ouvrez le job en échec pour voir le détail — aucun secret n'apparaît dans les logs (seul `GITHUB_TOKEN`, fourni automatiquement par GitHub, est utilisé pour l'authentification GHCR).

## 3. Rendre le paquet GHCR public (ou le configurer en privé dans Portainer)

### Option A — Paquet public (recommandé, retenu pour ce projet)

La toute première publication d'un paquet GHCR par `GITHUB_TOKEN` est **privée par défaut**, quelle que soit la visibilité du dépôt — GitHub ne permet pas à `GITHUB_TOKEN` de rendre un paquet public automatiquement, c'est une limite de sécurité volontaire. Après le premier run réussi du workflow :

1. Allez sur `https://github.com/idMasjid?tab=packages` (ou depuis la page du dépôt, section **Packages** dans la barre latérale droite).
2. Ouvrez le paquet **mosquee-massy-depenses**.
3. **Package settings** (en bas de la page du paquet) → **Danger Zone** → **Change visibility** → **Public**.
4. Confirmez. Portainer pourra alors tirer l'image sans authentification.

### Option B — Registre GHCR privé dans Portainer

Si vous préférez garder le paquet privé :

1. Créez un **Personal Access Token (classic)** sur GitHub avec le scope `read:packages` uniquement (Settings → Developer settings → Personal access tokens).
2. Dans Portainer : **Registries** → **Add registry** → **GitHub Container Registry** (ou "Custom registry" avec URL `ghcr.io`).
3. Renseignez votre nom d'utilisateur GitHub comme identifiant et le token comme mot de passe.
4. Portainer utilisera automatiquement ce registre pour tirer l'image lors du déploiement de la Stack.

## 4. Créer la Stack dans Portainer depuis le dépôt Git

Dans Portainer CE : **Stacks** → **Add stack** → onglet **Repository**.

| Champ | Valeur |
|---|---|
| Name | `mosquee-massy-depenses` |
| Repository URL | `https://github.com/idMasjid/mosquee-massy-depenses` |
| Repository reference | `refs/heads/master` |
| Compose path | `docker-compose.yml` |
| Authentication | À activer uniquement si le **dépôt** est privé (PAT GitHub avec scope `repo`) — indépendant de la visibilité du paquet GHCR (§3) |

## 5. Variables à ajouter dans l'interface Portainer

Dans la section **Environment variables** du formulaire de création de Stack (onglet "Advanced mode" si vous voulez les coller au format `.env`) :

| Variable | Obligatoire | Exemple / valeur | Notes |
|---|---|---|---|
| `AUTH_SECRET` | Oui | *(généré, voir ci-dessous)* | Aucune valeur par défaut dans le Compose — le déploiement échoue sans elle |
| `AUTH_GOOGLE_ID` | Non | *(vide si non utilisé)* | Active la connexion Google seulement si les deux sont renseignés |
| `AUTH_GOOGLE_SECRET` | Non | *(vide si non utilisé)* | |
| `SEED_ADMIN_EMAIL` | Non | `ai@mosquee-massy.fr` | Utilisé uniquement si vous lancez `npm run db:seed` manuellement (§7) |
| `SEED_ADMIN_PASSWORD` | Non | *(mot de passe fort)* | idem |
| `APP_PORT` | Non | `3000` | Port publié sur le réseau local (défaut : 3000) |
| `IMAGE_TAG` | Non | `latest` | `latest` ou `sha-<sha_git_court>` pour cibler une version précise (§8) |

Pour générer `AUTH_SECRET` depuis un poste avec Node.js installé :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 6. Premier déploiement

1. Une fois le formulaire de Stack rempli (§4 et §5), cliquez sur **Deploy the stack**.
2. Portainer clone le dépôt, lit `docker-compose.yml`, tire l'image `ghcr.io/idmasjid/mosquee-massy-depenses:latest` et démarre le conteneur.
3. Au démarrage, l'entrypoint applique automatiquement les migrations Prisma (`prisma migrate deploy`) sur le volume `app_data`, puis lance le serveur. Comptez quelques secondes avant que le healthcheck passe au vert (`start_period: 20s`).
4. Aucun utilisateur n'existe encore en base à ce stade — voir §7 pour créer le premier compte admin.

## 7. Créer le premier compte admin (une seule fois)

Le seed (`npm run db:seed`) n'est **pas** exécuté automatiquement à chaque démarrage (il importe aussi d'anciennes données CSV historiques — le relancer à chaque redémarrage n'a pas de sens). Pour l'exécuter une fois, après le premier déploiement :

```bash
docker exec -it <nom_ou_id_du_conteneur> node_modules/.bin/tsx prisma/seed.ts
```

Utilisez les valeurs `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` définies en §5 pour vous connecter ensuite.

## 8. Consulter les logs et vérifier le healthcheck

- **Logs** : dans Portainer, ouvrez le conteneur → onglet **Logs**. En ligne de commande : `docker logs -f <conteneur>`.
- **Healthcheck** : visible dans la liste des conteneurs Portainer (colonne Status : `healthy` / `unhealthy` / `starting`). Il interroge `GET /api/health`, qui vérifie à la fois que le serveur répond et que le fichier SQLite est accessible.
- Test manuel depuis l'hôte : `curl http://localhost:${APP_PORT:-3000}/api/health` → `{"status":"ok"}`.

## 9. Mettre à jour l'application

1. Poussez vos changements sur `master` → le workflow republie automatiquement `latest` et un nouveau tag `sha-<sha_git_court>`.
2. Dans Portainer : ouvrez la Stack → **Pull and redeploy** (ou **Update the stack**, selon la version) pour retirer l'image `latest` et recréer le conteneur.
3. Les migrations Prisma en attente sont appliquées automatiquement au redémarrage (§6, point 3).

## 10. Revenir à une image portant un ancien tag SHA

1. Repérez le SHA court du commit stable précédent (visible dans l'historique Git ou dans l'onglet Actions du run correspondant).
2. Dans Portainer, éditez la Stack → variable **`IMAGE_TAG`** → remplacez `latest` par `sha-<sha_git_court>`.
3. **Update the stack**. Aucune autre modification n'est nécessaire : `docker-compose.yml` référence l'image via `${IMAGE_TAG:-latest}`.
4. Attention : un rollback d'image ne revient pas en arrière sur les migrations de base de données déjà appliquées. Si le rollback doit annuler une migration, restaurez aussi une sauvegarde du volume `app_data` (§11) correspondant à cette version.

## 11. Sauvegarder et restaurer les volumes persistants

Deux volumes nommés contiennent tout l'état persistant : `app_data` (base SQLite) et `app_storage` (pièces jointes). Les noms réels incluent le préfixe de la Stack, par exemple `mosquee-massy-depenses_app_data` — vérifiez avec `docker volume ls`.

**Sauvegarde :**

```bash
docker run --rm \
  -v mosquee-massy-depenses_app_data:/data \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/app_data-$(date +%Y%m%d).tar.gz -C /data .

docker run --rm \
  -v mosquee-massy-depenses_app_storage:/data \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/app_storage-$(date +%Y%m%d).tar.gz -C /data .
```

**Restauration** (conteneur arrêté ou volume neuf) :

```bash
docker run --rm \
  -v mosquee-massy-depenses_app_data:/data \
  -v "$(pwd)":/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/app_data-YYYYMMDD.tar.gz -C /data"
```

Procédez de même pour `app_storage`. Redémarrez ensuite la Stack.

## 12. Raccorder l'application à SWAG (reverse proxy sur une VM séparée)

Dans votre infrastructure, SWAG tourne sur une **VM distincte** du serveur Docker/Portainer, sur le même réseau local — il n'y a donc pas de réseau Docker partagé entre les deux. SWAG doit joindre l'application via son **port publié sur l'hôte Portainer**, en passant par le réseau local (IP), pas par un nom DNS Docker. C'est déjà ce que fait `docker-compose.yml` par défaut (`ports: - "${APP_PORT:-3000}:3000"`) — aucune modification du Compose n'est nécessaire pour ce scénario.

### 12.1 Limiter l'exposition du port sur le réseau local

Le port publié sert du HTTP en clair (TLS géré par SWAG). Pour ne pas l'exposer inutilement à tout le LAN, restreignez-le au niveau du pare-feu de l'hôte Portainer pour n'autoriser que l'IP de la VM SWAG, par exemple avec `ufw` :

```bash
ufw allow from <IP_DE_LA_VM_SWAG> to any port ${APP_PORT:-3000} proto tcp
ufw deny ${APP_PORT:-3000}/tcp
```

(Adaptez selon votre pare-feu réel — `iptables`, pare-feu du NAS, etc.)

### 12.2 Créer le proxy-conf côté SWAG

Sur la VM SWAG, dans `/config/nginx/proxy-confs/`, copiez le modèle fourni par SWAG (`subdomain.conf.sample`) vers un nouveau fichier, par exemple `depenses.subdomain.conf`, puis adaptez-le :

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name depenses.*;   # remplacez par votre sous-domaine réel, ex: depenses.mosquee-massy.fr

    include /config/nginx/ssl.conf;

    client_max_body_size 10M;   # aligné sur MAX_ATTACHMENT_SIZE_BYTES (pièces jointes, 10 Mo)

    location / {
        include /config/nginx/proxy.conf;
        include /config/nginx/resolver.conf;
        set $upstream_app <IP_DU_SERVEUR_PORTAINER>;
        set $upstream_port <APP_PORT>;   # valeur de APP_PORT côté Portainer, 3000 par défaut
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;
    }
}
```

Les `include` (`proxy.conf`, `resolver.conf`) fournis par SWAG positionnent déjà `Host`, `X-Forwarded-Proto` et `X-Forwarded-For` correctement — c'est ce qui permet à `trustHost: true` (déjà présent dans `src/auth.ts`) de faire confiance à l'origine transmise par SWAG sans configuration supplémentaire côté application.

### 12.3 DNS

Créez un enregistrement DNS (interne si l'accès reste sur le LAN/VPN, ou public si SWAG expose l'application sur Internet) pointant votre sous-domaine vers l'IP publique ou locale de la VM SWAG, selon votre usage prévu.

### 12.4 Google OAuth (si utilisé)

Si vous activez la connexion Google (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, voir §5), mettez à jour l'URI de redirection autorisée dans Google Cloud Console avec l'URL publique réelle, par exemple `https://depenses.mosquee-massy.fr/api/auth/callback/google` — et non plus `http://localhost:3000/...`.
