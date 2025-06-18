# Skull King Backend 🏴‍☠️

Backend Express.js pour le jeu de cartes Skull King avec Socket.IO pour les interactions temps réel.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [WebSocket Events](#websocket-events)
- [Déploiement](#déploiement)
- [Scripts disponibles](#scripts-disponibles)

## 🎯 Vue d'ensemble

Ce backend fournit :
- **API REST** pour la gestion des utilisateurs et salles
- **WebSocket (Socket.IO)** pour les parties en temps réel
- **Base de données** avec Prisma ORM (SQLite dev / PostgreSQL prod)
- **Logique de jeu complète** pour Skull King

### Technologies utilisées
- **Node.js** + **Express.js** (serveur web)
- **Socket.IO** (communications temps réel)
- **Prisma** (ORM base de données)
- **SQLite** (développement) / **PostgreSQL** (production)

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Étapes d'installation

1. **Cloner et installer les dépendances** :
```bash
cd backend
npm install
```

2. **Configuration de l'environnement** :
```bash
# Créer le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos paramètres
# DATABASE_URL="file:./prisma/dev.db"  # SQLite pour dev
# PORT=3001
# NODE_ENV=development
```

3. **Configurer la base de données** :
```bash
# Générer le client Prisma
npm run db:generate

# Créer et migrer la base de données
npm run db:push

# Optionnel : Ouvrir Prisma Studio pour explorer la DB
npm run db:studio
```

4. **Démarrer le serveur** :
```bash
# Mode développement (avec watch)
npm run dev

# Mode production
npm start
```

Le serveur sera accessible sur `http://localhost:3001`

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env` avec :

```env
# Environnement
NODE_ENV=development

# Serveur
PORT=3001

# Base de données
DATABASE_URL="file:./prisma/dev.db"  # SQLite pour développement
# DATABASE_URL="postgresql://user:password@localhost:5432/skullking"  # PostgreSQL pour production

# CORS (Production uniquement)
ALLOWED_ORIGINS="https://votre-domaine.com,https://autre-domaine.com"
```

### Configuration de production

Pour la production, modifiez :
- `NODE_ENV=production`
- `DATABASE_URL` vers PostgreSQL
- `ALLOWED_ORIGINS` avec vos domaines autorisés

## 📖 Utilisation

### Démarrer une partie

1. **Créer un utilisateur** : `POST /api/users`
2. **Créer une salle** : `POST /api/rooms`
3. **Les autres joueurs rejoignent** : `POST /api/rooms/{code}/join`
4. **L'hôte démarre la partie** : WebSocket `startGame`
5. **Jouer** : WebSocket `placeBid`, `playCard`, etc.

### Endpoints principaux

```bash
# Santé du serveur
curl http://localhost:3001/health

# Créer un utilisateur
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"PlayerOne"}'

# Lister les salles
curl http://localhost:3001/api/rooms
```

## 🏗️ Architecture

```
backend/
├── server.js              # Point d'entrée principal
├── src/
│   ├── api/               # Routes API REST
│   │   ├── routes.js      # Configuration routes
│   │   ├── users.js       # Endpoints utilisateurs  
│   │   └── rooms.js       # Endpoints salles
│   ├── database/
│   │   └── prisma.js      # Configuration Prisma
│   ├── game/
│   │   └── game-logic.js  # Logique jeu + Socket.IO
│   └── utils/
│       └── validation.js  # Fonctions validation
├── prisma/
│   ├── schema.prisma      # Schéma base de données
│   └── dev.db            # Base SQLite (dev)
└── docs/                 # Documentation
    ├── API.md            # Documentation API complète
    ├── ARCHITECTURE.md   # Architecture détaillée
    ├── GAME_LOGIC.md     # Logique de jeu
    └── swagger.yaml      # Spécification OpenAPI
```

### Flux de données

**REST API** :
```
Client → Express.js → Validation → Prisma → Database
```

**WebSocket** :
```
Client → Socket.IO → Game Logic → Memory + Database → Broadcast
```

## 📚 API Documentation

### Documentation complète
- **[API.md](docs/API.md)** - Documentation complète de l'API REST
- **[swagger.yaml](docs/swagger.yaml)** - Spécification OpenAPI 3.0
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Architecture détaillée
- **[GAME_LOGIC.md](docs/GAME_LOGIC.md)** - Logique de jeu

### Endpoints principaux

#### Users
- `GET /api/users?username=xxx` - Vérifier disponibilité nom d'utilisateur
- `POST /api/users` - Créer un utilisateur
- `GET /api/users/:id` - Récupérer un utilisateur
- `DELETE /api/users/:id` - Supprimer un utilisateur
- `PATCH /api/users/:id` - Marquer hors ligne
- `POST /api/users/disconnect` - Déconnexion beacon

#### Rooms
- `GET /api/rooms` - Lister les salles
- `POST /api/rooms` - Créer une salle
- `GET /api/rooms/:code` - Détails d'une salle
- `POST /api/rooms/:code/join` - Rejoindre une salle
- `DELETE /api/rooms/:code` - Quitter une salle

#### Health
- `GET /health` - État du serveur
- `POST /api/rooms` - Créer une room
- `GET /api/rooms/:code` - Détails d'une room
- `POST /api/rooms/:code/join` - Rejoindre une room
- `DELETE /api/rooms/:code` - Quitter une room

### Health
- `GET /health` - Vérification de santé du serveur

## 🔌 WebSocket Events

### Événements client → serveur

```javascript
// Se connecter à une salle
socket.emit('joinRoom', { roomCode: 'ABC123', userId, username });

// Démarrer une partie (hôte uniquement)
socket.emit('startGame', { roomCode: 'ABC123', userId });

// Placer une enchère
socket.emit('placeBid', { roomCode: 'ABC123', userId, bid: 2 });

// Jouer une carte
socket.emit('playCard', { 
  roomCode: 'ABC123', 
  userId, 
  cardId: 'BLACK_14',
  tigressMode: 'PIRATE' // Si Tigresse
});

// Envoyer un message de chat
socket.emit('sendMessage', { roomCode: 'ABC123', userId, message: 'Salut !' });

// Quitter une salle
socket.emit('leaveRoom', { roomCode: 'ABC123', userId });
```

### Événements serveur → client

```javascript
// Mise à jour de la salle
socket.on('roomUpdated', (data) => {
  console.log('Salle mise à jour:', data.room);
});

// Partie démarrée
socket.on('gameStarted', (data) => {
  console.log('Partie commencée:', data.gameState);
});

// État de jeu mis à jour
socket.on('gameStateUpdate', (data) => {
  console.log('Nouvel état:', data.gameState);
  console.log('Données privées:', data.privateData);
});

// Nouveau message de chat
socket.on('messageReceived', (data) => {
  console.log(`${data.username}: ${data.message}`);
});

// Erreur
socket.on('error', (data) => {
  console.error('Erreur:', data.message);
});
```

## 🚀 Déploiement

### Avec PM2 (recommandé)

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer l'application
pm2 start ecosystem.config.js

# Monitoring
pm2 monit

# Redémarrer
pm2 restart skullking-backend

# Arrêter
pm2 stop skullking-backend
```

### Avec Docker

```bash
# Construire l'image
docker build -t skullking-backend .

# Lancer le container
docker run -d \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://..." \
  --name skullking-backend \
  skullking-backend
```

### Variables d'environnement production

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/skullking
ALLOWED_ORIGINS=https://votre-frontend.com,https://autre-domaine.com
```

### Checklist de déploiement

- [ ] Variables d'environnement configurées
- [ ] Base PostgreSQL créée et accessible
- [ ] Migrations Prisma appliquées (`npm run db:migrate:deploy`)
- [ ] Client Prisma généré (`npm run db:generate`)
- [ ] CORS configuré pour le(s) domaine(s) frontend
- [ ] Monitoring configuré (PM2, Docker health checks)
- [ ] Reverse proxy configuré (nginx, traefik) avec SSL
- [ ] Logs configurés et rotatifs

## 📜 Scripts disponibles

```bash
# Développement
npm run dev              # Démarrer avec watch mode
npm start               # Démarrer en mode production

# Base de données
npm run db:generate     # Générer le client Prisma
npm run db:push         # Synchroniser le schema (dev)
npm run db:migrate      # Créer une migration (dev)
npm run db:migrate:deploy # Appliquer migrations (prod)
npm run db:studio       # Ouvrir Prisma Studio
npm run db:reset        # Reset complet de la DB

# Utilitaires
npm run lint            # Linter le code (si configuré)
npm test               # Lancer les tests (si configurés)
```

## 🐛 Debugging

### Logs de développement

Les logs Prisma sont activés en mode développement :
```javascript
// Voir dans src/database/prisma.js
log: ['query', 'info', 'warn', 'error']
```

### Health Check

Vérifiez l'état du serveur :
```bash
curl http://localhost:3001/health
```

Réponse attendue :
```json
{
  "status": "healthy",
  "timestamp": "2025-06-18T10:30:00.000Z",
  "uptime": "3600s",
  "memory": {
    "used": "45MB",
    "total": "120MB"
  },
  "environment": "development"
}
```

### Problèmes courants

#### Erreur de connexion base de données
```bash
# Vérifier que la base existe
npm run db:push

# Regénérer le client
npm run db:generate
```

#### CORS en production
```bash
# Vérifier ALLOWED_ORIGINS
echo $ALLOWED_ORIGINS

# Doit contenir vos domaines frontend
```

#### Port déjà utilisé
```bash
# Trouver le processus utilisant le port
lsof -i :3001

# Arrêter le processus
kill -9 <PID>
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

### Standards de code

- Utiliser ESLint pour le style de code
- Commenter les fonctions complexes
- Tester les nouvelles fonctionnalités
- Suivre les conventions de nommage existantes

## 📄 Licence

MIT License - voir le fichier [LICENSE](../LICENSE) pour plus de détails.

## 📞 Support

- **Documentation complète** : [/docs](docs/)
- **API Reference** : [docs/API.md](docs/API.md)
- **Architecture** : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Game Logic** : [docs/GAME_LOGIC.md](docs/GAME_LOGIC.md)

Pour toute question ou problème, consultez d'abord la documentation puis ouvrez une issue sur le repository.
