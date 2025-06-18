# 🚀 Installation & Lancement

Guide complet pour installer et déployer Skull King avec l'architecture séparée backend/frontend.

## Prérequis

- **Node.js** 18+ 
- **npm** ou **yarn**
- **Git** pour cloner le repository
- **PostgreSQL** (pour la production)

## 🛠️ Installation

### 1. Cloner le repository

```bash
git clone https://github.com/sydnec/skullking_js.git
cd skullking_js
```

### 2. Installation des dépendances

#### Backend
```bash
cd backend/
npm install
npx prisma generate
npx prisma db push
```

#### Frontend
```bash
cd ../frontend/
npm install
```

### 3. Configuration des variables d'environnement

#### Backend (.env)
```bash
cd ../backend/
cp .env.example .env
# Éditer .env avec vos configurations
```

#### Frontend (.env.local)
```bash
cd ../frontend/
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:3001" >> .env.local
```

### 4. Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
DATABASE_URL="file:./prisma/db/dev.db"
PORT=3000
NODE_ENV="development"
```

### 5. Démarrage

**Option A - Démarrage simple (développement) :**
```bash
npm run dev
```

**Option B - Démarrage avec l'outil de gestion :**
```bash
# Déploiement complet automatisé
./sk deploy

# Ou démarrage simple
./sk start
```

### 6. Accès à l'application

Ouvrez votre navigateur sur [http://localhost:3000](http://localhost:3000)

---

## 🔧 Outil de gestion unifié `sk`

Le projet inclut un script bash `sk` qui simplifie toutes les opérations de développement et de déploiement.

### Commandes principales

```bash
# 🚀 Démarrage et arrêt
./sk start          # Démarre l'application avec PM2
./sk stop           # Arrête l'application
./sk restart        # Redémarre l'application
./sk status         # Affiche le statut détaillé

# 🛠️ Développement et déploiement
./sk deploy         # Déploiement complet (deps + build + start)
./sk update         # Mise à jour complète de l'application

# 📊 Monitoring et debugging
./sk logs           # Affiche les logs PM2 en temps réel
./sk monitor        # Monitoring complet avec ressources système
./sk api            # Vérifie la santé de l'API

# 🔄 Maintenance
./sk reset          # Réinitialise complètement le projet (⚠️ SUPPRIME TOUTES LES DONNÉES)
./sk reset --y      # Réinitialisation automatique sans confirmation
```

### Fonctionnalités avancées du script `sk`

- **Sauvegarde automatique** des logs et de la base de données
- **Vérification de santé** de l'application et de l'API
- **Monitoring des ressources** système (CPU, RAM, disque)
- **Mise à jour intelligente** avec git pull automatique
- **Gestion des erreurs** et rollback en cas de problème

---

## 🏭 Déploiement en production

### Déploiement automatisé

```bash
# Déploiement complet en une commande
./sk deploy
```

Cette commande effectue automatiquement :
1. Vérification de l'environnement
2. Installation des dépendances de production
3. Génération du client Prisma
4. Build de l'application
5. Migration de la base de données
6. Démarrage avec PM2
7. Vérification du bon fonctionnement

### Configuration de production

#### Variables d'environnement (.env)

```env
DATABASE_URL="file:./prisma/db/prod.db"
PORT=3000
NODE_ENV="production"
```

#### Pour PostgreSQL (ex: Vercel, Heroku)

```env
DATABASE_URL="postgresql://user:password@host:port/database"
NODE_ENV="production"
```

### ⚙️ Configuration PM2

Le projet utilise PM2 pour la gestion des processus en production via le fichier `ecosystem.config.js` :

```javascript
{
  name: 'skullking',
  script: 'server.js',
  instances: 1,
  autorestart: true,
  max_memory_restart: '1G',
  error_file: './logs/err.log',
  out_file: './logs/out.log',
  log_file: './logs/combined.log',
  time: true,
  // Optimisé pour Raspberry Pi
  node_args: '--max-old-space-size=512',
  // Redémarrage automatique
  min_uptime: '10s',
  max_restarts: 10
}
```

---

## 📊 Monitoring et maintenance

### Surveillance en temps réel

```bash
# Vue d'ensemble complète
./sk monitor
```

Affiche :
- Statut PM2 de l'application
- Test de santé de l'API
- Ressources système (CPU, RAM, disque)
- Connectivité réseau
- Logs récents
- Informations de déploiement

### Gestion des logs

Les logs sont organisés dans le dossier `logs/` :
- `combined.log` - Tous les logs
- `err.log` - Erreurs uniquement  
- `out.log` - Sorties standard
- `startup.log` - Logs de démarrage

```bash
# Accès aux logs
./sk logs        # Logs en temps réel
tail -f logs/combined.log    # Logs avec tail
```

### Mise à jour automatisée

```bash
./sk update
```

Cette commande effectue :
1. Sauvegarde des logs actuels
2. Arrêt temporaire de l'application
3. Sauvegarde de la base de données
4. Git pull des dernières modifications
5. Installation des dépendances
6. Build de l'application
7. Migration de la base de données
8. Redémarrage et vérification

### Réinitialisation complète

```bash
# Avec confirmation
./sk reset

# Mode automatique (sans confirmation)
./sk reset --y
```

⚠️ **Attention** : Cette commande supprime toutes les données utilisateur et parties !

---

## 📋 Scripts NPM disponibles

- `npm run dev` - Serveur de développement avec Socket.IO
- `npm run build` - Build de production avec génération Prisma
- `npm run start` - Serveur de production
- `npm run lint` - Vérification ESLint
- `npm run lint:fix` - Correction automatique ESLint
- `npm run type-check` - Vérification TypeScript
- `npm run clean` - Nettoyage des builds

### Scripts de base de données

- `npm run db:generate` - Génère le client Prisma
- `npm run db:push` - Pousse le schéma vers la base de données
- `npm run db:migrate` - Applique les migrations
- `npm run db:studio` - Ouvre Prisma Studio
- `npm run db:reset` - Remet à zéro la base de données

---

## 🐛 Résolution de problèmes

### Problèmes courants

**Port 3000 déjà utilisé :**
```bash
# Changer le port
PORT=3001 npm run dev
# ou modifier .env
```

**Erreur de base de données :**
```bash
# Régénérer la base de données
npm run db:reset
npm run db:push
```

**Problème de permissions avec `sk` :**
```bash
chmod +x sk
```

**Application ne démarre pas :**
```bash
# Vérifier les logs
./sk logs

# Vérifier le statut
./sk status

# Redémarrage forcé
./sk restart
```

### Logs de débogage

```bash
# Logs détaillés
NODE_ENV=development npm run dev

# Logs PM2
pm2 logs skullking

# Monitoring système
./sk monitor
```

---

## 🔗 Liens utiles

- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation PM2](https://pm2.keymetrics.io/docs/)
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Socket.IO](https://socket.io/docs/)

---

*Pour plus d'informations, consultez les autres guides de documentation ou ouvrez une issue sur GitHub.*
