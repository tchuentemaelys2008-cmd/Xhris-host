# 🚀 XHRIS HOST - Guide de Déploiement Complet

## Table des Matières
1. [Installation locale](#installation-locale)
2. [Configuration PostgreSQL](#configuration-postgresql)
3. [Déploiement Railway](#déploiement-railway)
4. [Déploiement Vercel](#déploiement-vercel)
5. [Déploiement Cloudflare](#déploiement-cloudflare)
6. [Variables d'environnement](#variables-denvironnement)
7. [Build Production](#build-production)
8. [Scaling](#scaling)
9. [Sauvegardes](#sauvegardes)
10. [Sécurité](#sécurité)

---

## 1. Installation Locale

### Prérequis
- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (optionnel)
- npm ou pnpm

### Installation

```bash
# Cloner le projet
git clone https://github.com/votre-repo/xhris-host.git
cd xhris-host

# Installer les dépendances
npm install

# Configurer le frontend
cd frontend
cp .env.local.example .env.local
# Éditer .env.local avec vos valeurs

# Configurer le backend
cd ../backend
cp .env.example .env
# Éditer .env avec vos valeurs

# Générer le client Prisma
npm run db:generate

# Appliquer les migrations
npm run db:migrate

# Seeder la base de données
npm run db:seed

# Démarrer en développement
cd ..
npm run dev
```

---

## 2. Configuration PostgreSQL

### Installation locale
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Créer la base de données
sudo -u postgres psql
CREATE DATABASE xhris_host;
CREATE USER xhris_user WITH PASSWORD 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE xhris_host TO xhris_user;
\q
```

### URL de connexion
```
DATABASE_URL="postgresql://xhris_user:votre_mot_de_passe@localhost:5432/xhris_host"
```

### Commandes Prisma utiles
```bash
# Générer le client
npx prisma generate

# Créer une migration
npx prisma migrate dev --name init

# Appliquer en production
npx prisma migrate deploy

# Ouvrir Prisma Studio
npx prisma studio

# Réinitialiser la DB (développement uniquement)
npx prisma migrate reset
```

---

## 3. Déploiement Railway

### Backend

1. Créer un nouveau projet sur [Railway.app](https://railway.app)
2. Connecter votre dépôt GitHub
3. Ajouter un service PostgreSQL
4. Configurer les variables d'environnement :

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=votre-secret-tres-long-et-securise
FRONTEND_URL=https://votre-frontend.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

5. Commande de build :
```bash
cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

6. Commande de démarrage :
```bash
cd backend && node dist/index.js
```

### Frontend (Railway)

1. Ajouter un nouveau service dans le même projet
2. Configurer :

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://votre-backend.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://votre-backend.railway.app
NEXTAUTH_URL=https://votre-frontend.railway.app
NEXTAUTH_SECRET=votre-nextauth-secret
API_URL=https://votre-backend.railway.app
```

3. Build : `cd frontend && npm install && npm run build`
4. Start : `cd frontend && npm start`

---

## 4. Déploiement Vercel (Frontend)

### Installation
```bash
npm i -g vercel
cd frontend
vercel
```

### Configuration vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXTAUTH_URL": "https://xhris.host",
    "NEXT_PUBLIC_API_URL": "https://api.xhris.host/api"
  }
}
```

### Variables d'environnement Vercel
Dans le dashboard Vercel > Settings > Environment Variables :

| Variable | Valeur |
|----------|--------|
| NEXTAUTH_SECRET | votre-secret-32-chars-min |
| NEXTAUTH_URL | https://votre-domaine.vercel.app |
| NEXT_PUBLIC_API_URL | https://votre-backend.railway.app/api |
| GOOGLE_CLIENT_ID | votre-id |
| GOOGLE_CLIENT_SECRET | votre-secret |

---

## 5. Déploiement Cloudflare

### Cloudflare Pages (Frontend alternatif)
```bash
# Installer Wrangler
npm install -g wrangler
wrangler login

# Build et déployer
cd frontend
npm run build
wrangler pages deploy .next
```

### Cloudflare R2 (Stockage)
```bash
# Créer un bucket
wrangler r2 bucket create xhris-host

# Configurer dans .env
STORAGE_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=votre-access-key
STORAGE_SECRET_KEY=votre-secret-key
STORAGE_BUCKET=xhris-host
```

### Cloudflare Workers (API Edge)
Pour mettre le backend derrière Cloudflare Workers pour les performances :

```js
// worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const backendUrl = `https://votre-backend.railway.app${url.pathname}${url.search}`;
    return fetch(backendUrl, request);
  }
};
```

---

## 6. Variables d'Environnement

### Frontend (.env.local)
```env
# App
NEXT_PUBLIC_APP_NAME=XHRIS HOST
NEXT_PUBLIC_APP_URL=https://xhris.host
NEXT_PUBLIC_API_URL=https://api.xhris.host/api
NEXT_PUBLIC_SOCKET_URL=https://api.xhris.host

# Auth
NEXTAUTH_URL=https://xhris.host
NEXTAUTH_SECRET=minimum-32-caracteres-aleatoires

# Google OAuth (console.cloud.google.com)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# API interne (server-side)
API_URL=https://api.xhris.host
```

### Backend (.env)
```env
# App
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://xhris.host

# Database
DATABASE_URL=postgresql://user:pass@host:5432/xhris_host

# JWT
JWT_SECRET=minimum-32-caracteres-tres-securise
JWT_EXPIRES=30d

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@xhris.host
SMTP_PASS=app-password-gmail

# Redis
REDIS_URL=redis://user:pass@host:6379

# Storage (Cloudflare R2)
STORAGE_ENDPOINT=https://account.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=access-key
STORAGE_SECRET_KEY=secret-key
STORAGE_BUCKET=xhris-host
CDN_URL=https://cdn.xhris.host

# Paiements
FAPSHI_API_KEY=fapshi-key
GENIUSPAY_API_KEY=geniuspay-key
MINIPAY_API_KEY=minipay-key
STRIPE_SECRET_KEY=sk_live_...
```

---

## 7. Build Production

### Avec Docker Compose
```bash
# Copier les fichiers env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Éditer les valeurs

# Build et démarrer
docker-compose up -d --build

# Appliquer les migrations
docker-compose exec backend npx prisma migrate deploy

# Seeder (première fois)
docker-compose exec backend npm run db:seed

# Vérifier les logs
docker-compose logs -f
```

### Sans Docker
```bash
# Backend
cd backend
npm run build
NODE_ENV=production node dist/index.js

# Frontend
cd frontend
npm run build
npm start
```

### PM2 (production)
```bash
npm install -g pm2

# Backend
pm2 start backend/dist/index.js --name xhris-backend --instances 2 --exec-mode cluster

# Frontend
pm2 start "npm start" --name xhris-frontend --cwd ./frontend

# Sauvegarder la config PM2
pm2 save
pm2 startup
```

---

## 8. Scaling

### Horizontal Scaling (Backend)

```nginx
# nginx.conf
upstream backend {
  server backend1:3001;
  server backend2:3001;
  server backend3:3001;
}

server {
  listen 80;
  server_name api.xhris.host;

  location / {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Base de données (Connection Pooling)

Pour gérer la charge, utiliser PgBouncer :
```bash
# DATABASE_URL avec PgBouncer
DATABASE_URL="postgresql://user:pass@pgbouncer:5432/xhris_host?pgbouncer=true"
```

### Redis Cluster
```env
REDIS_URL=redis://cluster-host:6379
REDIS_CLUSTER=true
```

---

## 9. Sauvegardes

### PostgreSQL automatique
```bash
#!/bin/bash
# backup.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"
BACKUP_DIR="/backups"

pg_dump -U postgres -h localhost xhris_host > "${BACKUP_DIR}/${BACKUP_FILE}"
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

# Supprimer les sauvegardes > 30 jours
find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +30 -delete

echo "Sauvegarde créée: ${BACKUP_FILE}.gz"
```

### Cron
```bash
# Sauvegarde quotidienne à 3h du matin
0 3 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Restauration
```bash
gunzip backup_20240101_030000.sql.gz
psql -U postgres -h localhost xhris_host < backup_20240101_030000.sql
```

---

## 10. Sécurité

### SSL/TLS
```bash
# Avec Certbot (Let's Encrypt)
certbot --nginx -d xhris.host -d api.xhris.host -d cdn.xhris.host
```

### Firewall
```bash
# UFW
ufw allow 22/tcp  # SSH
ufw allow 80/tcp  # HTTP
ufw allow 443/tcp # HTTPS
ufw deny 3001     # API direct (via nginx uniquement)
ufw deny 5432     # PostgreSQL direct
ufw enable
```

### Variables sensibles
- Utiliser des gestionnaires de secrets (Vault, AWS Secrets Manager)
- Ne jamais committer les fichiers .env
- Rotation régulière des clés JWT
- Tokens JWT à courte durée de vie avec refresh

### Monitoring
```bash
# PM2 monitoring
pm2 monit

# Logs centralisés
pm2 logs --lines 1000

# Health check
curl https://api.xhris.host/health
```

---

## Support

- 📧 Email: support@xhris.host
- 💬 Discord: discord.gg/xhrishost
- 📖 Docs: docs.xhris.host
- 🐛 Issues: github.com/xhris-host/issues

---

© 2024 XHRIS HOST. Tous droits réservés.
