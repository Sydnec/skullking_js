# Skull King Backend

Backend Express.js pour le jeu Skull King avec Socket.IO pour le temps réel.

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer la base de données :
```bash
cp .env.example .env
# Éditer .env avec vos paramètres

# Générer le client Prisma
npm run db:generate

# Créer/migrer la base de données
npm run db:push
```

3. Démarrer le serveur :
```bash
# Développement
npm run dev

# Production
npm start
```

## Variables d'environnement

- `NODE_ENV` : Environnement (development/production)
- `PORT` : Port du serveur (défaut: 3001)
- `DATABASE_URL` : URL de la base de données
- `ALLOWED_ORIGINS` : Origins autorisées pour CORS (séparées par des virgules)

## API Endpoints

### Users
- `GET /api/users?username=xxx` - Vérifier disponibilité du nom d'utilisateur
- `POST /api/users` - Créer un utilisateur
- `GET /api/users/:id` - Récupérer un utilisateur
- `PATCH /api/users/:id` - Mettre à jour le statut d'un utilisateur
- `DELETE /api/users/:id` - Supprimer un utilisateur
- `POST /api/users/disconnect` - Déconnexion via beacon

### Rooms
- `GET /api/rooms` - Lister les rooms
- `POST /api/rooms` - Créer une room
- `GET /api/rooms/:code` - Détails d'une room
- `POST /api/rooms/:code/join` - Rejoindre une room
- `DELETE /api/rooms/:code` - Quitter une room

### Health
- `GET /health` - Vérification de santé du serveur

## Socket.IO Events

### Client → Server
- `join` - Se connecter avec userId/username
- `join_room` - Rejoindre une room
- `leave_room` - Quitter une room
- `game_action` - Action de jeu (START_GAME, BID, PLAY_CARD)
- `chat_message` - Envoyer un message de chat

### Server → Client
- `room_state` - État de la room
- `game_state_update` - Mise à jour de l'état du jeu
- `chat_message` - Message de chat reçu
- `chat_history` - Historique des messages
- `game_error` - Erreur de jeu
- `error` - Erreur générale

## Déploiement

### Avec Docker
```bash
# Construire l'image
docker build -t skullking-backend .

# Lancer le conteneur
docker run -p 3001:3001 -e DATABASE_URL="your_db_url" skullking-backend
```

### Avec PM2
```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Voir les logs
pm2 logs skullking-backend

# Redémarrer
pm2 restart skullking-backend
```

### Variables d'environnement en production
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://username:password@host:5432/database"
ALLOWED_ORIGINS="https://votre-frontend.vercel.app,https://autre-domaine.com"
```

## Structure du projet

```
backend/
├── src/
│   ├── api/           # Routes API Express
│   ├── database/      # Configuration Prisma
│   ├── game/          # Logique de jeu
│   └── utils/         # Utilitaires
├── prisma/           # Schéma et migrations
└── server.js         # Point d'entrée
```
