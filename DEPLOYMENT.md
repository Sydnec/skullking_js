# 🚀 Guide de Déploiement Vercel - Skull King

## 📋 Prérequis

1. **Compte Vercel** : [vercel.com](https://vercel.com)
2. **CLI Vercel** (optionnel) : `npm i -g vercel`
3. **Repository Git** : Votre code doit être sur GitHub/GitLab/Bitbucket

## 🗄️ Configuration de la Base de Données

### Option 1 : Vercel Postgres (Recommandé)

```bash
# 1. Dans le dashboard Vercel, créez une base PostgreSQL
# 2. Copiez l'URL de connexion
# 3. Ajoutez-la dans les variables d'environnement Vercel
```

### Option 2 : Base de données externe

- **Supabase** : Base PostgreSQL gratuite
- **PlanetScale** : Base MySQL serverless
- **Railway** : Base PostgreSQL simple

## 🔧 Étapes de Déploiement

### Méthode 1 : Via le Dashboard Vercel (Recommandé)

1. **Connectez votre repository**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "New Project"
   - Importez votre repository GitHub

2. **Configurez les variables d'environnement**
   ```
   DATABASE_URL=your_database_url_here
   SESSION_SECRET=your_secure_session_secret
   JWT_SECRET=your_secure_jwt_secret
   ALLOWED_ORIGINS=https://your-app.vercel.app
   NODE_ENV=production
   ```

3. **Déployez**
   - Cliquez sur "Deploy"
   - Vercel build automatiquement votre app

### Méthode 2 : Via la CLI Vercel

```bash
# 1. Installer Vercel CLI
npm i -g vercel

# 2. Se connecter
vercel login

# 3. Déployer depuis le dossier du projet
cd /path/to/skullking_js
vercel

# 4. Suivre les instructions
# - Link to existing project? No
# - Project name: skullking
# - Deploy directory: ./
```

## ⚙️ Configuration Post-Déploiement

### 1. Variables d'Environnement

Ajoutez ces variables dans le dashboard Vercel :

```bash
# Base de données
DATABASE_URL="postgresql://..."

# Sécurité
SESSION_SECRET="generate-secure-random-string"
JWT_SECRET="generate-secure-random-string"

# CORS
ALLOWED_ORIGINS="https://your-app.vercel.app"

# Performance
NODE_ENV="production"
```

### 2. Domaine Personnalisé (Optionnel)

1. Dans le dashboard Vercel → Settings → Domains
2. Ajoutez votre domaine personnalisé
3. Configurez les DNS selon les instructions

### 3. Mise à jour des CORS

Mettez à jour la variable `ALLOWED_ORIGINS` avec votre vraie URL :
```bash
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

## 🔍 Vérification du Déploiement

### 1. Tests Fonctionnels

- ✅ Page d'accueil se charge
- ✅ Création d'utilisateur fonctionne
- ✅ Création de room fonctionne
- ✅ Socket.IO se connecte
- ✅ Jeu multijoueur fonctionne

### 2. Performance

- ✅ Temps de chargement < 3s
- ✅ Base de données répond rapidement
- ✅ Socket.IO stable

### 3. Monitoring

- Dashboard Vercel → Analytics
- Logs d'erreur dans Functions
- Métriques de performance

## 🚨 Problèmes Courants

### Socket.IO ne fonctionne pas

**Cause** : Vercel ne supporte pas les WebSockets persistants

**Solutions** :
1. Utiliser un service externe pour Socket.IO (Railway, Render)
2. Migrer vers les Vercel Edge Functions
3. Utiliser des solutions alternatives (Pusher, Ably)

### Base de données SQLite

**Problème** : SQLite ne persiste pas sur Vercel

**Solution** : Migrer vers PostgreSQL
```bash
# 1. Modifier prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# 2. Régénérer le client
npx prisma generate

# 3. Faire la migration
npx prisma db push
```

### Variables d'environnement

**Vérification** :
```bash
# Dans les logs Vercel, vérifiez que les variables sont bien définies
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'defined' : 'undefined');
```

## 📊 Alternative Hybride (Recommandée)

### Frontend sur Vercel + Backend sur Railway

1. **Frontend** : Déployez Next.js sur Vercel
2. **Backend** : Déployez server.js sur Railway/Render
3. **Configuration** : Pointez l'API vers le backend externe

```typescript
// src/lib/api.ts
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend.railway.app'
  : 'http://localhost:3000';
```

## 🔄 Mise à jour Continue

### Auto-déploiement

- Chaque push sur `main` déclenche un déploiement
- Configurez des environnements staging/production
- Tests automatiques avec GitHub Actions

### Commandes utiles

```bash
# Déploiement manuel
vercel --prod

# Voir les logs
vercel logs

# Variables d'environnement
vercel env ls
vercel env add DATABASE_URL
```

## 📚 Ressources

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma on Vercel](https://www.prisma.io/docs/guides/deployment/deploying-to-vercel)

---

🏴‍☠️ **Bon déploiement, capitaine !**
