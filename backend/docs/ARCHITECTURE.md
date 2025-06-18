# Architecture du Backend - Skull King

## Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Structure du projet](#structure-du-projet)
- [Technologies utilisées](#technologies-utilisées)
- [Architecture des données](#architecture-des-données)
- [Architecture réseau](#architecture-réseau)
- [Logique de jeu](#logique-de-jeu)
- [Gestion des erreurs](#gestion-des-erreurs)
- [Performance et optimisation](#performance-et-optimisation)
- [Sécurité](#sécurité)
- [Déploiement](#déploiement)

## Vue d'ensemble

Le backend Skull King est conçu comme une architecture modulaire utilisant Node.js/Express.js avec Socket.IO pour les communications temps réel. L'application suit les principes REST pour les opérations CRUD et WebSocket pour les interactions de jeu en temps réel.

### Principes architecturaux
- **Séparation des responsabilités**: API REST, logique de jeu, et gestion des données sont séparées
- **Modularité**: Chaque composant peut être testé et maintenu indépendamment
- **Scalabilité**: Architecture prête pour la montée en charge
- **Robustesse**: Gestion d'erreurs complète et récupération automatique

## Structure du projet

```
backend/
├── server.js                 # Point d'entrée principal
├── ecosystem.config.js       # Configuration PM2
├── package.json             # Dépendances et scripts
├── Dockerfile               # Container Docker
├── prisma/
│   ├── schema.prisma        # Schéma de base de données
│   ├── dev.db              # Base SQLite (développement)
│   └── generated/          # Client Prisma généré
├── src/
│   ├── api/                # Routes API REST
│   │   ├── routes.js       # Configuration des routes
│   │   ├── users.js        # Endpoints utilisateurs
│   │   └── rooms.js        # Endpoints salles
│   ├── database/
│   │   └── prisma.js       # Configuration Prisma
│   ├── game/
│   │   └── game-logic.js   # Logique de jeu et Socket.IO
│   └── utils/
│       └── validation.js   # Fonctions de validation
└── docs/                   # Documentation
    ├── API.md              # Documentation API
    ├── ARCHITECTURE.md     # Ce fichier
    └── GAME_LOGIC.md       # Documentation de la logique de jeu
```

### Responsabilités par module

#### `server.js`
- Configuration Express.js
- Initialisation Socket.IO
- Middleware CORS et parsing
- Gestion gracieuse de l'arrêt

#### `src/api/`
- **routes.js**: Configuration centralisée des routes
- **users.js**: Gestion CRUD des utilisateurs
- **rooms.js**: Gestion des salles de jeu

#### `src/database/`
- **prisma.js**: Configuration et connexion à la base de données

#### `src/game/`
- **game-logic.js**: Logique complète du jeu Skull King et gestion WebSocket

#### `src/utils/`
- **validation.js**: Fonctions de validation réutilisables

## Technologies utilisées

### Stack principal
- **Runtime**: Node.js 18+
- **Framework web**: Express.js 4.18+
- **WebSocket**: Socket.IO 4.8+
- **Base de données**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma 6.9+

### Outils de développement
- **Process manager**: PM2
- **Containerisation**: Docker
- **Variables d'environnement**: dotenv

### Dépendances clés
```json
{
  "@prisma/client": "^6.9.0",    // Client ORM
  "express": "^4.18.2",          // Framework web
  "socket.io": "^4.8.1",         // WebSocket
  "cors": "^2.8.5",              // CORS middleware
  "prisma": "^6.9.0",            // Prisma CLI
  "sqlite3": "^5.1.7",           // Driver SQLite
  "dotenv": "^16.3.1"            // Variables d'environnement
}
```

## Architecture des données

### Modèle de données Prisma

#### User (Utilisateur)
```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  isOnline  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  hostedRooms Room[] @relation("RoomHost")
  playerRooms RoomPlayer[]
}
```

#### Room (Salle)
```prisma
model Room {
  id          String     @id @default(cuid())
  code        String     @unique          // Code à 6 caractères
  name        String?
  hostId      String
  maxPlayers  Int        @default(6)
  status      RoomStatus @default(WAITING)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Relations
  host        User         @relation("RoomHost")
  players     RoomPlayer[]
  gameStates  GameState[]
}
```

#### RoomPlayer (Association Salle-Joueur)
```prisma
model RoomPlayer {
  id     String @id @default(cuid())
  userId String
  roomId String

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@unique([userId, roomId])
}
```

#### GameState (État de partie)
```prisma
model GameState {
  id           String    @id @default(cuid())
  roomId       String
  round        Int       @default(1)
  phase        GamePhase @default(BIDDING)
  currentPlayer String?
  data         Json      // État complet sérialisé
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations
  room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
}
```

### Enums
```prisma
enum RoomStatus {
  WAITING   // En attente de joueurs
  PLAYING   // Partie en cours
  FINISHED  // Partie terminée
}

enum GamePhase {
  BIDDING   // Phase d'enchères
  PLAYING   // Phase de jeu
  SCORING   // Calcul des scores
  FINISHED  // Partie terminée
}
```

### Stratégie de persistance
- **Développement**: SQLite pour la simplicité
- **Production**: PostgreSQL pour la robustesse
- **État de jeu**: Persistance hybride (mémoire + base)
- **Nettoyage automatique**: Salles vides et utilisateurs hors ligne

## Architecture réseau

### Communication REST (HTTP)
```
Client ←→ Express.js ←→ Prisma ←→ Database
```

**Flux de données REST**:
1. Client envoie requête HTTP
2. Express route vers le bon handler
3. Handler valide les données
4. Prisma exécute les requêtes DB
5. Réponse JSON renvoyée au client

### Communication WebSocket
```
Client ←→ Socket.IO ←→ Game Logic ←→ Memory Store
                           ↓
                     Prisma ←→ Database
```

**Flux de données WebSocket**:
1. Client émet un événement Socket.IO
2. Game Logic traite l'événement
3. État mis à jour en mémoire
4. Persistance asynchrone en base
5. Événements diffusés aux clients connectés

### Configuration Socket.IO
```javascript
const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,          // 60s timeout
  pingInterval: 25000,         // 25s ping interval
  upgradeTimeout: 30000,       // 30s upgrade timeout
  maxHttpBufferSize: 1e6,      // 1MB limit
  allowEIO3: true             // Compatibilité EIO3
});
```

## Logique de jeu

### Architecture de la logique de jeu

#### État en mémoire
```javascript
const activeGames = new Map();      // États de parties actives
const roomUsers = new Map();        // Utilisateurs par salle
const roomChatMessages = new Map(); // Messages de chat
```

#### Cycle de vie d'une partie
1. **Création de salle**: Génération du code, ajout de l'hôte
2. **Rejoindre**: Validation et ajout des joueurs
3. **Démarrage**: Initialisation du deck et distribution
4. **Phases de jeu**:
   - **BIDDING**: Collecte des enchères
   - **PLAYING**: Jeu des cartes (tricks)
   - **SCORING**: Calcul des points
5. **Fin de manche**: Nouvelle distribution ou fin de partie

#### Gestion des cartes
```javascript
// Deck complet (70 cartes)
const DECK_COMPOSITION = {
  NUMBER_CARDS: 56,    // 4 couleurs × 14 valeurs
  PIRATES: 5,          // Cartes pirate
  MERMAIDS: 2,         // Cartes sirène
  SKULL_KING: 1,       // Skull King
  TIGRESS: 1,          // Tigresse
  ESCAPE: 5            // Cartes fuite
};
```

#### Système de scoring
```javascript
const SCORING = {
  TRICK_POINTS: 20,                           // Points par pli réussi
  ZERO_BID_POINTS: 10,                       // Bonus pour enchère à 0
  FAIL_PENALTY: -10,                         // Malus par pli manqué
  PIRATE_CAPTURED_BY_SKULL_KING_BONUS: 30,  // Bonus spéciaux
  // ... autres bonus
};
```

## Gestion des erreurs

### Stratégie d'erreurs
1. **Validation précoce**: Données validées dès l'entrée
2. **Erreurs typées**: Messages d'erreur explicites
3. **Logging structuré**: Traces pour le debugging
4. **Récupération gracieuse**: Pas de crash server

### Middleware d'erreurs Express
```javascript
app.use((err, _req, res) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message 
  });
});
```

### Gestion des erreurs Socket.IO
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  socket.emit('error', { message: 'Une erreur est survenue' });
});
```

## Performance et optimisation

### Stratégies de performance

#### Base de données
- **Indexes**: Sur `username`, `code`, `roomId`
- **Relations optimisées**: `include` et `select` stratégiques
- **Requêtes groupées**: Éviter N+1 queries

#### Mémoire
- **Cache des parties actives**: États en RAM pour accès rapide
- **Nettoyage automatique**: Timeout pour les données obsolètes
- **Limitation de taille**: Messages limités à 1MB

#### Réseau
- **Compression WebSocket**: Automatique avec Socket.IO
- **Batching d'événements**: Regroupement d'updates
- **CORS optimisé**: Origins spécifiques en production

### Monitoring
```javascript
// Health check endpoint
app.get('/health', (_req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    uptime: `${Math.floor(uptime)}s`,
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    }
  });
});
```

## Sécurité

### Mesures de sécurité implémentées

#### Validation des entrées
```javascript
export function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length >= 2 && trimmed.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}
```

#### CORS
```javascript
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
};
```

#### Limitations
- **Taille des messages**: 1MB maximum
- **Rate limiting**: À implémenter selon les besoins
- **Validation stricte**: Tous les inputs validés

### Recommandations futures
1. **Authentication JWT**: Pour les utilisateurs persistants
2. **Rate limiting**: Protection contre les abus
3. **Sanitization**: Nettoyage des inputs utilisateur
4. **HTTPS**: SSL/TLS en production
5. **Logs de sécurité**: Audit des actions sensibles

## Déploiement

### Configuration PM2
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'skullking-backend',
    script: 'server.js',
    instances: 1,                    // Single instance pour Socket.IO
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "start"]
```

### Variables d'environnement production
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/db
ALLOWED_ORIGINS=https://domain1.com,https://domain2.com
```

### Checklist de déploiement
- [ ] Variables d'environnement configurées
- [ ] Base de données PostgreSQL configurée
- [ ] Migrations Prisma appliquées
- [ ] CORS configuré pour le domaine de production
- [ ] Logs configurés (PM2 ou Docker)
- [ ] Health check endpoint fonctionnel
- [ ] SSL/TLS configuré (reverse proxy)

### Monitoring production
1. **Health checks**: Endpoint `/health` pour monitoring
2. **Logs**: Rotation automatique avec PM2
3. **Métriques**: CPU, mémoire, connexions actives
4. **Alertes**: Notifications en cas de problème
