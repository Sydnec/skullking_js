# API Documentation - Skull King Backend

## Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Configuration](#configuration)
- [Authentification](#authentification)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Users](#users)
  - [Rooms](#rooms)
- [WebSocket Events](#websocket-events)
- [Modèles de données](#modèles-de-données)
- [Codes d'erreur](#codes-derreur)

## Vue d'ensemble

L'API Skull King Backend fournit une interface RESTful pour gérer les utilisateurs, les salles de jeu et les parties en temps réel. Le backend utilise Express.js avec Socket.IO pour les communications en temps réel.

### Technologies utilisées
- **Framework**: Express.js
- **Base de données**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma
- **WebSocket**: Socket.IO
- **Validation**: Custom validators

### URL de base
- **Développement**: `http://localhost:3001`
- **Production**: Configuré via `ALLOWED_ORIGINS`

## Configuration

### Variables d'environnement requises

```env
# Base de données
DATABASE_URL="file:./dev.db"  # SQLite pour le dev
# DATABASE_URL="postgresql://..." # PostgreSQL pour la prod

# Serveur
PORT=3001
NODE_ENV=development

# CORS (Production uniquement)
ALLOWED_ORIGINS="https://skullking.vercel.app,https://autre-domaine.com"
```

## Authentification

Actuellement, l'API n'utilise pas d'authentification basée sur des tokens. L'identification des utilisateurs se fait via des IDs uniques générés lors de la création.

## Endpoints

### Health Check

#### GET /health
Vérifier l'état de santé du serveur.

**Réponse**:
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

### Users

#### GET /api/users
Vérifier la disponibilité d'un nom d'utilisateur.

**Paramètres de requête**:
- `username` (string, requis): Le nom d'utilisateur à vérifier

**Exemple**: `/api/users?username=PlayerOne`

**Réponse**:
```json
{
  "available": true,
  "username": "PlayerOne"
}
```

**Codes d'erreur**:
- `400`: Nom d'utilisateur invalide
- `500`: Erreur interne du serveur

#### POST /api/users
Créer un nouvel utilisateur.

**Corps de la requête**:
```json
{
  "username": "PlayerOne"
}
```

**Règles de validation**:
- Longueur: 2-20 caractères
- Caractères autorisés: lettres, chiffres, tirets et underscores
- Doit être unique

**Réponse**:
```json
{
  "user": {
    "id": "clx1234567890abcdef",
    "username": "PlayerOne",
    "isOnline": true,
    "createdAt": "2025-06-18T10:30:00.000Z"
  }
}
```

**Codes d'erreur**:
- `400`: Nom d'utilisateur invalide
- `409`: Nom d'utilisateur déjà pris
- `500`: Erreur interne du serveur

#### GET /api/users/:id
Récupérer les informations d'un utilisateur.

**Paramètres d'URL**:
- `id` (string): L'ID de l'utilisateur

**Réponse**:
```json
{
  "user": {
    "id": "clx1234567890abcdef",
    "username": "PlayerOne",
    "isOnline": true,
    "createdAt": "2025-06-18T10:30:00.000Z"
  }
}
```

#### DELETE /api/users/:id
Déconnecter et nettoyer un utilisateur.

**Corps de la requête**:
```json
{
  "userId": "clx1234567890abcdef"
}
```

**Réponse**:
```json
{
  "message": "Utilisateur déconnecté et nettoyage effectué",
  "roomsCleaned": 2
}
```

#### PATCH /api/users/:id
Marquer un utilisateur comme hors ligne.

**Réponse**:
```json
{
  "user": {
    "id": "clx1234567890abcdef",
    "username": "PlayerOne",
    "isOnline": false,
    "updatedAt": "2025-06-18T10:35:00.000Z"
  }
}
```

#### POST /api/users/disconnect
Déconnexion via beacon (fermeture du navigateur).

**Corps de la requête**:
```json
{
  "userId": "clx1234567890abcdef"
}
```

**Réponse**:
```json
{
  "message": "Utilisateur déconnecté et nettoyage effectué",
  "roomsCleaned": 1
}
```

### Rooms

#### GET /api/rooms
Lister toutes les salles disponibles.

**Réponse**:
```json
{
  "rooms": [
    {
      "id": "ABC123",
      "name": "Partie rapide",
      "host": "PlayerOne",
      "players": ["PlayerOne", "PlayerTwo"],
      "maxPlayers": 6,
      "status": "waiting",
      "createdAt": "2025-06-18T10:30:00.000Z"
    }
  ]
}
```

#### POST /api/rooms
Créer une nouvelle salle.

**Corps de la requête**:
```json
{
  "userId": "clx1234567890abcdef"
}
```

**Réponse**:
```json
{
  "room": {
    "id": "ABC123",
    "name": "Partie de PlayerOne",
    "host": "PlayerOne",
    "players": ["PlayerOne"],
    "maxPlayers": 6,
    "status": "waiting",
    "createdAt": "2025-06-18T10:30:00.000Z"
  }
}
```

#### GET /api/rooms/:code
Récupérer les détails d'une salle.

**Paramètres d'URL**:
- `code` (string): Le code de la salle (6 caractères alphanumériques)

**Réponse**:
```json
{
  "room": {
    "id": "ABC123",
    "name": "Partie rapide",
    "host": "PlayerOne",
    "players": ["PlayerOne", "PlayerTwo"],
    "maxPlayers": 6,
    "status": "waiting",
    "createdAt": "2025-06-18T10:30:00.000Z"
  }
}
```

#### POST /api/rooms/:code/join
Rejoindre une salle.

**Corps de la requête**:
```json
{
  "userId": "clx1234567890abcdef"
}
```

**Réponse**:
```json
{
  "room": {
    "id": "ABC123",
    "name": "Partie rapide",
    "host": "PlayerOne",
    "players": ["PlayerOne", "PlayerTwo"],
    "maxPlayers": 6,
    "status": "waiting",
    "createdAt": "2025-06-18T10:30:00.000Z"
  }
}
```

**Codes d'erreur**:
- `400`: Code de salle invalide, partie commencée, ou salle complète
- `404`: Salle ou utilisateur non trouvé
- `500`: Erreur interne du serveur

#### DELETE /api/rooms/:code
Quitter une salle.

**Corps de la requête**:
```json
{
  "userId": "clx1234567890abcdef"
}
```

**Réponse**:
```json
{
  "message": "Vous avez quitté la room",
  "roomDeleted": false
}
```

## WebSocket Events

Le serveur Socket.IO gère les événements en temps réel pour les parties.

### Événements du client vers le serveur

#### `joinRoom`
Rejoindre une salle de jeu.
```javascript
socket.emit('joinRoom', { roomCode, userId, username });
```

#### `leaveRoom`
Quitter une salle de jeu.
```javascript
socket.emit('leaveRoom', { roomCode, userId });
```

#### `startGame`
Démarrer une partie (hôte uniquement).
```javascript
socket.emit('startGame', { roomCode, userId });
```

#### `placeBid`
Placer une enchère.
```javascript
socket.emit('placeBid', { roomCode, userId, bid });
```

#### `playCard`
Jouer une carte.
```javascript
socket.emit('playCard', { roomCode, userId, cardId });
```

#### `sendMessage`
Envoyer un message de chat.
```javascript
socket.emit('sendMessage', { roomCode, userId, message });
```

### Événements du serveur vers le client

#### `roomUpdated`
Mise à jour de l'état de la salle.
```javascript
{
  room: {
    code: "ABC123",
    players: [...],
    gameState: {...}
  }
}
```

#### `gameStarted`
Partie démarrée.
```javascript
{
  gameState: {
    round: 1,
    phase: "BIDDING",
    players: [...],
    hands: {...}
  }
}
```

#### `gameStateUpdate`
Mise à jour de l'état de la partie.
```javascript
{
  gameState: {
    currentPlayer: "userId",
    phase: "PLAYING",
    trick: [...],
    scores: {...}
  }
}
```

#### `messageReceived`
Nouveau message de chat.
```javascript
{
  id: "msg123",
  username: "PlayerOne",
  message: "Salut tout le monde !",
  timestamp: "2025-06-18T10:30:00.000Z"
}
```

#### `error`
Erreur d'événement.
```javascript
{
  message: "Description de l'erreur"
}
```

## Modèles de données

### User
```typescript
interface User {
  id: string;           // CUID généré automatiquement
  username: string;     // Nom d'utilisateur unique (2-20 caractères)
  isOnline: boolean;    // Statut de connexion
  createdAt: Date;      // Date de création
  updatedAt: Date;      // Date de dernière mise à jour
}
```

### Room
```typescript
interface Room {
  id: string;           // CUID généré automatiquement
  code: string;         // Code de 6 caractères (unique)
  name: string;         // Nom de la salle
  hostId: string;       // ID de l'hôte
  maxPlayers: number;   // Nombre maximum de joueurs (défaut: 6)
  status: RoomStatus;   // WAITING | PLAYING | FINISHED
  createdAt: Date;      // Date de création
  updatedAt: Date;      // Date de dernière mise à jour
}
```

### GameState
```typescript
interface GameState {
  id: string;
  roomId: string;
  round: number;        // Manche actuelle (1-10)
  phase: GamePhase;     // BIDDING | PLAYING | SCORING | FINISHED
  currentPlayer: string;
  data: object;         // État complet de la partie (JSON)
  createdAt: Date;
  updatedAt: Date;
}
```

### Card
```typescript
interface Card {
  id: string;           // Identifiant unique de la carte
  type: CardType;       // NUMBER | PIRATE | MERMAID | SKULL_KING | TIGRESS | ESCAPE
  suit?: string;        // Pour les cartes numérotées: BLACK | GREEN | PURPLE | YELLOW
  value?: number;       // Pour les cartes numérotées: 1-14
  name: string;         // Nom affiché de la carte
}
```

## Codes d'erreur

### Codes HTTP standard
- `200`: Succès
- `400`: Requête invalide
- `404`: Ressource non trouvée
- `409`: Conflit (ex: nom d'utilisateur déjà pris)
- `500`: Erreur interne du serveur

### Messages d'erreur courants

#### Validation
- `"Nom d'utilisateur invalide"`: Le nom ne respecte pas les règles (2-20 caractères, alphanumériques + _ -)
- `"Code de room invalide"`: Le code ne fait pas 6 caractères alphanumériques
- `"Données manquantes"`: Paramètres requis manquants

#### Logique métier
- `"Ce nom d'utilisateur est déjà pris"`: Nom d'utilisateur en conflit
- `"Room non trouvée"`: Code de salle inexistant
- `"Utilisateur non trouvé"`: ID utilisateur inexistant
- `"Cette partie a déjà commencé"`: Tentative de rejoindre une partie en cours
- `"Cette partie est complète"`: Salle à la capacité maximale
- `"Vous êtes déjà dans cette partie"`: Tentative de rejoindre une salle déjà rejointe

#### Erreurs serveur
- `"Erreur interne du serveur"`: Erreur non gérée côté serveur
- `"Impossible de générer un code unique"`: Échec de génération de code de salle

## Notes d'implémentation

### Gestion des connexions
- Les utilisateurs hors ligne sont automatiquement nettoyés
- Les salles vides sont supprimées automatiquement
- Les connexions WebSocket sont maintenues avec ping/pong

### Performance
- Utilisation de Prisma pour l'optimisation des requêtes
- Cache en mémoire pour les états de partie actifs
- Limitation de la taille des messages (1MB)

### Sécurité
- Validation stricte des entrées
- CORS configuré pour la production
- Pas de données sensibles exposées
