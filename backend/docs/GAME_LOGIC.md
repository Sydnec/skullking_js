# Logique de Jeu - Skull King

## Table des matières
- [Vue d'ensemble du jeu](#vue-densemble-du-jeu)
- [Règles de base](#règles-de-base)
- [Types de cartes](#types-de-cartes)
- [Déroulement d'une partie](#déroulement-dune-partie)
- [Système d'enchères](#système-denchères)
- [Mécaniques de jeu](#mécaniques-de-jeu)
- [Système de scoring](#système-de-scoring)
- [Implémentation technique](#implémentation-technique)
- [États de partie](#états-de-partie)
- [Événements WebSocket](#événements-websocket)

## Vue d'ensemble du jeu

Skull King est un jeu de cartes de plis (tricks) pour 2 à 8 joueurs. Le jeu se joue en 10 manches progressives, où le nombre de cartes distribuées augmente à chaque manche (1 carte en manche 1, 2 cartes en manche 2, etc.).

### Objectif
Chaque joueur doit prédire exactement le nombre de plis qu'il va réussir. Les points sont attribués selon la précision de la prédiction et des bonus spéciaux.

## Règles de base

### Configuration de partie
- **Joueurs**: 2 à 8 joueurs
- **Manches**: 10 manches (nombre de cartes = numéro de manche)
- **Deck**: 70 cartes au total
- **Durée**: 30-60 minutes selon le nombre de joueurs

### Principe général
1. Distribution des cartes selon la manche
2. Phase d'enchères (prédiction du nombre de plis)
3. Phase de jeu (tour par tour, chaque joueur joue une carte)
4. Calcul des scores
5. Passage à la manche suivante

## Types de cartes

### Cartes numérotées (56 cartes)
- **4 couleurs**: Noir, Vert, Violet, Jaune
- **Valeurs**: 1 à 14 dans chaque couleur
- **Hiérarchie**: 14 > 13 > ... > 2 > 1

### Cartes spéciales (14 cartes)

#### Pirates (5 cartes)
- **Fonction**: Battent toutes les cartes numérotées
- **Hiérarchie**: Tous égaux entre eux
- **Bonus**: +30 points si capturé par Skull King

#### Sirènes/Mermaids (2 cartes)
- **Fonction**: Battent les Pirates
- **Hiérarchie**: Toutes égales entre elles
- **Bonus**: +20 points si capturée par un Pirate

#### Skull King (1 carte)
- **Fonction**: Bat tout sauf les Sirènes
- **Particularité**: Carte la plus forte (sauf contre Sirènes)
- **Bonus**: +40 points si capturé par une Sirène

#### Tigresse (1 carte)
- **Fonction**: Carte transformable
- **Utilisation**: Peut être jouée comme Pirate ou comme Fuite
- **Déclaration**: Le joueur doit annoncer son choix

#### Fuites/Escape (5 cartes)
- **Fonction**: Ne peuvent jamais gagner un pli
- **Utilisation**: Pour éviter de prendre des plis non désirés
- **Particularité**: Toujours perdantes

## Déroulement d'une partie

### Phase de distribution
```javascript
// Manche N = N cartes par joueur
const cardsPerPlayer = currentRound;
const totalCardsNeeded = cardsPerPlayer * players.length;

// Carte retournée (manche 1-9)
const trumpCard = currentRound < 10 ? deck[totalCardsNeeded] : null;
```

### Phase d'enchères
1. **Ordre**: Joueur à gauche du donneur commence
2. **Enchère**: 0 à nombre maximum de plis possibles
3. **Contrainte**: Le dernier joueur ne peut pas faire une enchère qui égalise le total
4. **Enregistrement**: Toutes les enchères sont visibles

### Phase de jeu
1. **Premier pli**: Joueur à gauche du donneur
2. **Plis suivants**: Gagnant du pli précédent
3. **Obligation de suivre**: Si possible, suivre la couleur demandée
4. **Atout**: La couleur de la carte retournée (manches 1-9)
5. **Sans atout**: Manche 10

### Résolution d'un pli
```javascript
// Ordre de force (du plus fort au plus faible)
1. Skull King (sauf si Sirène présente)
2. Sirènes (battent Pirates et Skull King)
3. Pirates (battent cartes numérotées)
4. Cartes d'atout (si couleur d'atout demandée)
5. Cartes de la couleur demandée
6. Autres cartes numérotées
7. Fuites (toujours perdantes)
```

## Système d'enchères

### Types d'enchères possibles
- **0**: Prédiction de ne prendre aucun pli
- **1 à N**: Prédiction du nombre exact de plis

### Contraintes
```javascript
// Contrainte du dernier enchérisseur
const totalBids = previousBids.reduce((sum, bid) => sum + bid, 0);
const remainingTricks = currentRound;
const forbiddenBid = remainingTricks - totalBids;

// Le dernier joueur ne peut pas enchérir forbiddenBid
if (isLastBidder && bid === forbiddenBid) {
  throw new Error('Cette enchère égaliserait le total');
}
```

### Stratégies d'enchères
- **Enchère à 0**: Bonus si réussie, mais risqué
- **Enchères précises**: Récompensées par des points
- **Sur-enchères**: Pénalisées lourdement

## Mécaniques de jeu

### Suivi de couleur obligatoire
```javascript
function canPlayCard(card, leadSuit, playerHand) {
  // Si pas de couleur demandée (premier du pli)
  if (!leadSuit) return true;
  
  // Si carte spéciale, toujours jouable
  if (card.type !== 'NUMBER') return true;
  
  // Si même couleur que demandée
  if (card.suit === leadSuit) return true;
  
  // Vérifier si le joueur a la couleur demandée
  const hasLeadSuit = playerHand.some(c => 
    c.type === 'NUMBER' && c.suit === leadSuit
  );
  
  // Peut jouer autre chose seulement si n'a pas la couleur
  return !hasLeadSuit;
}
```

### Résolution des conflits de cartes
```javascript
function resolveTrick(cardsPlayed, trumpSuit) {
  const leadSuit = cardsPlayed[0].suit;
  
  // 1. Skull King gagne (sauf si Sirène présente)
  const skullKing = cardsPlayed.find(c => c.type === 'SKULL_KING');
  const mermaids = cardsPlayed.filter(c => c.type === 'MERMAID');
  
  if (skullKing && mermaids.length === 0) {
    return skullKing;
  }
  
  // 2. Sirènes battent tout (y compris Skull King)
  if (mermaids.length > 0) {
    return mermaids[0]; // Première sirène jouée
  }
  
  // 3. Pirates battent cartes numérotées
  const pirates = cardsPlayed.filter(c => c.type === 'PIRATE' || 
    (c.type === 'TIGRESS' && c.playedAs === 'PIRATE'));
  
  if (pirates.length > 0) {
    return pirates[0]; // Premier pirate joué
  }
  
  // 4. Cartes d'atout
  const trumpCards = cardsPlayed.filter(c => 
    c.type === 'NUMBER' && c.suit === trumpSuit
  );
  
  if (trumpCards.length > 0) {
    return trumpCards.reduce((highest, card) => 
      card.value > highest.value ? card : highest
    );
  }
  
  // 5. Cartes de la couleur demandée
  const leadSuitCards = cardsPlayed.filter(c => 
    c.type === 'NUMBER' && c.suit === leadSuit
  );
  
  if (leadSuitCards.length > 0) {
    return leadSuitCards.reduce((highest, card) => 
      card.value > highest.value ? card : highest
    );
  }
  
  // 6. Première carte jouée par défaut
  return cardsPlayed[0];
}
```

## Système de scoring

### Points de base
```javascript
const SCORING = {
  TRICK_POINTS: 20,           // Points par pli réussi
  ZERO_BID_POINTS: 10,        // Multiplicateur pour enchère à 0
  FAIL_PENALTY: -10,          // Malus par pli manqué/excédentaire
};
```

### Calcul des points principaux
```javascript
function calculateBaseScore(bid, actualTricks) {
  if (bid === 0) {
    // Enchère à 0
    if (actualTricks === 0) {
      return SCORING.ZERO_BID_POINTS * currentRound;
    } else {
      return SCORING.FAIL_PENALTY * actualTricks;
    }
  } else {
    // Enchère normale
    if (bid === actualTricks) {
      return bid * SCORING.TRICK_POINTS;
    } else {
      const difference = Math.abs(bid - actualTricks);
      return SCORING.FAIL_PENALTY * difference;
    }
  }
}
```

### Bonus spéciaux
```javascript
const BONUS_SCORING = {
  // Cartes 14 (plus hautes valeurs)
  BLACK_14_BONUS: 20,         // 14 de noir
  COLORED_14_BONUS: 10,       // 14 d'autres couleurs
  
  // Captures spéciales
  MERMAID_CAPTURED_BY_PIRATE: 20,    // Sirène prise par Pirate
  PIRATE_CAPTURED_BY_SKULL_KING: 30, // Pirate pris par Skull King
  SKULL_KING_CAPTURED_BY_MERMAID: 40 // Skull King pris par Sirène
};
```

### Exemples de scoring
```javascript
// Exemple 1: Enchère 2, réalisé 2, avec bonus
const player = {
  bid: 2,
  tricksWon: 2,
  bonuses: [
    { type: 'COLORED_14', points: 10 },
    { type: 'PIRATE_CAPTURED_BY_SKULL_KING', points: 30 }
  ]
};

const score = (2 * 20) + 10 + 30; // 80 points

// Exemple 2: Enchère 0, réalisé 0
const playerZero = {
  bid: 0,
  tricksWon: 0,
  round: 5
};

const score = 10 * 5; // 50 points

// Exemple 3: Échec (enchère 3, réalisé 1)
const playerFail = {
  bid: 3,
  tricksWon: 1
};

const score = -10 * Math.abs(3 - 1); // -20 points
```

## Implémentation technique

### Structure de données principale
```javascript
const gameState = {
  // Métadonnées
  roomCode: 'ABC123',
  phase: 'PLAYING', // BIDDING | PLAYING | SCORING | FINISHED
  round: 5,
  
  // Configuration
  players: [
    {
      id: 'user1',
      username: 'Player1',
      position: 0,
      isConnected: true
    }
  ],
  
  // État de la manche
  hands: {
    'user1': [/* cartes */],
    'user2': [/* cartes */]
  },
  
  bids: {
    'user1': 2,
    'user2': 1
  },
  
  // Pli en cours
  currentTrick: {
    leadPlayer: 'user1',
    cards: [
      { playerId: 'user1', card: {/* carte */} }
    ]
  },
  
  // Plis terminés
  completedTricks: [
    {
      winner: 'user1',
      cards: [/* cartes du pli */]
    }
  ],
  
  // Scores
  scores: {
    'user1': 120,
    'user2': 85
  },
  
  // État du tour
  currentPlayer: 'user2',
  trumpSuit: 'BLACK',
  
  // Configuration spéciale
  lastRound: 10,
  maxPlayers: 6
};
```

### Gestion des transitions d'état
```javascript
function advanceGameState(gameState) {
  switch (gameState.phase) {
    case 'BIDDING':
      if (allBidsPlaced(gameState)) {
        gameState.phase = 'PLAYING';
        gameState.currentPlayer = getFirstPlayer(gameState);
      }
      break;
      
    case 'PLAYING':
      if (trickComplete(gameState)) {
        processTrick(gameState);
        if (roundComplete(gameState)) {
          gameState.phase = 'SCORING';
        } else {
          startNewTrick(gameState);
        }
      }
      break;
      
    case 'SCORING':
      calculateRoundScores(gameState);
      if (gameState.round >= 10) {
        gameState.phase = 'FINISHED';
      } else {
        startNewRound(gameState);
      }
      break;
  }
}
```

## États de partie

### Diagramme d'états
```
[WAITING] → [BIDDING] → [PLAYING] → [SCORING] → [FINISHED]
     ↑           ↓           ↓           ↓
     └───────────┴───────────┴───────────┘
           (nouvelle manche si < 10)
```

### Transitions possibles
- **WAITING → BIDDING**: Hôte démarre la partie
- **BIDDING → PLAYING**: Toutes les enchères placées
- **PLAYING → SCORING**: Tous les plis joués
- **SCORING → BIDDING**: Nouvelle manche (si < 10)
- **SCORING → FINISHED**: Fin de partie (manche 10)

### Validation des actions
```javascript
function validateAction(gameState, action, playerId) {
  const validations = {
    'PLACE_BID': () => {
      return gameState.phase === 'BIDDING' && 
             !gameState.bids[playerId] &&
             isValidBid(action.bid, gameState);
    },
    
    'PLAY_CARD': () => {
      return gameState.phase === 'PLAYING' &&
             gameState.currentPlayer === playerId &&
             hasCard(playerId, action.cardId, gameState) &&
             canPlayCard(action.card, gameState);
    }
  };
  
  return validations[action.type]?.() || false;
}
```

## Événements WebSocket

### Événements client → serveur
```javascript
// Démarrer une partie (hôte uniquement)
socket.emit('startGame', { roomCode, userId });

// Placer une enchère
socket.emit('placeBid', { roomCode, userId, bid: 2 });

// Jouer une carte
socket.emit('playCard', { 
  roomCode, 
  userId, 
  cardId: 'BLACK_14',
  tigressMode: 'PIRATE' // Si Tigresse
});

// Chat
socket.emit('sendMessage', { roomCode, userId, message: 'Bien joué!' });
```

### Événements serveur → client
```javascript
// Mise à jour d'état complet
socket.emit('gameStateUpdate', {
  gameState: {/* état complet */},
  privateData: {
    hand: [/* cartes du joueur */],
    canPlay: true
  }
});

// Événements spécifiques
socket.emit('bidPlaced', { playerId, bid, nextPlayer });
socket.emit('cardPlayed', { playerId, card, trickComplete });
socket.emit('trickWon', { winner, trick, nextLeader });
socket.emit('roundComplete', { scores, newRound });
socket.emit('gameComplete', { finalScores, winner });

// Erreurs
socket.emit('error', { message: 'Action invalide' });
```

### Synchronisation d'état
```javascript
function broadcastGameState(roomCode, gameState) {
  const room = io.to(roomCode);
  
  // État public pour tous
  const publicState = {
    phase: gameState.phase,
    round: gameState.round,
    currentPlayer: gameState.currentPlayer,
    bids: gameState.bids,
    scores: gameState.scores,
    trumpSuit: gameState.trumpSuit,
    tricksRemaining: getTricksRemaining(gameState)
  };
  
  room.emit('gameStateUpdate', { gameState: publicState });
  
  // Données privées pour chaque joueur
  gameState.players.forEach(player => {
    if (player.isConnected) {
      io.to(player.socketId).emit('privateGameData', {
        hand: gameState.hands[player.id],
        canPlay: player.id === gameState.currentPlayer,
        validCards: getValidCards(player.id, gameState)
      });
    }
  });
}
```
