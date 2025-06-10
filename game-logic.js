import { PrismaClient } from './src/generated/prisma/index.js';

// Initialize Prisma client with error handling
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'minimal'
});

// Store active games in memory (with database persistence)
const activeGames = new Map();
const roomUsers = new Map();

// Constants for game configuration
const GAME_CONFIG = {
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 2,
  DEFAULT_ROUNDS: 10,
  CARD_DECK_SIZE: 70,
  SAVE_INTERVAL: 60000, // 1 minute
  CLEANUP_DELAY: 30000, // 30 seconds
  RECONNECTION_TIMEOUT: 300000 // 5 minutes
};

// Enhanced logging
const logWithTimestamp = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    debug: '🔍'
  }[level] || '📝';
  
  console.log(`${prefix} [${timestamp}] ${message}`, Object.keys(data).length > 0 ? data : '');
};

// Database persistence functions
async function saveGameState(roomCode, gameState) {
  try {
    // First, find the room by its code to get the internal ID
    const room = await prisma.room.findUnique({
      where: { code: roomCode }
    });

    if (!room) {
      logWithTimestamp('warn', `Room ${roomCode} not found in database, skipping save`);
      return;
    }

    const gameData = {
      currentRound: gameState.currentRound?.number || 1,
      maxRounds: gameState.settings?.roundsToPlay || GAME_CONFIG.DEFAULT_ROUNDS,
      gameState: JSON.stringify(gameState)
    };

    await prisma.gameData.upsert({
      where: { roomId: room.id }, // Use the internal room ID
      update: {
        currentRound: gameData.currentRound,
        maxRounds: gameData.maxRounds,
        gameState: gameData.gameState,
        updatedAt: new Date()
      },
      create: {
        roomId: room.id, // Use the internal room ID
        currentRound: gameData.currentRound,
        maxRounds: gameData.maxRounds,
        gameState: gameData.gameState
      }
    });

    logWithTimestamp('success', `Game state saved for room ${roomCode}`, {
      round: gameData.currentRound,
      players: gameState.players?.length || 0
    });
  } catch (error) {
    logWithTimestamp('error', `Error saving game state for room ${roomCode}`, { error: error.message });
  }
}

async function loadGameState(roomCode) {
  try {
    // First, find the room by its code to get the internal ID
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        players: {
          include: {
            user: true
          }
        }
      }
    });

    if (!room) {
      console.log(`⚠️ Room ${roomCode} not found in database`);
      return null;
    }

    const gameData = await prisma.gameData.findUnique({
      where: { roomId: room.id }
    });

    if (gameData && gameData.gameState) {
      const savedState = JSON.parse(gameData.gameState);
      console.log(`📁 Loaded game state for room ${roomCode} (Round ${gameData.currentRound})`);
      return savedState;
    }

    return null;
  } catch (error) {
    console.error(`❌ Error loading game state for room ${roomCode}:`, error);
    return null;
  }
}

async function deleteGameState(roomCode) {
  try {
    // First, find the room by its code to get the internal ID
    const room = await prisma.room.findUnique({
      where: { code: roomCode }
    });

    if (!room) {
      console.log(`⚠️ Room ${roomCode} not found in database`);
      return;
    }

    await prisma.gameData.delete({
      where: { roomId: room.id }
    });
    console.log(`🗑️ Game state deleted for room ${roomCode}`);
  } catch (error) {
    if (error.code !== 'P2025') { // P2025 = Record not found
      console.error(`❌ Error deleting game state for room ${roomCode}:`, error);
    }
  }
}

// Periodic auto-save for all active games
function startPeriodicSave() {
  setInterval(async () => {
    if (activeGames.size === 0) return;
    
    logWithTimestamp('info', `Starting periodic save for ${activeGames.size} active games`);
    const savePromises = [];
    
    for (const [roomId, gameState] of activeGames.entries()) {
      savePromises.push(
        saveGameState(roomId, gameState).catch(error => 
          logWithTimestamp('error', `Periodic save failed for room ${roomId}`, { error: error.message })
        )
      );
    }
    
    await Promise.allSettled(savePromises);
  }, GAME_CONFIG.SAVE_INTERVAL);
}

// Validation function for card play legality
function isValidCardPlay(card, playerHand, currentTrick) {
  // First card of trick can always be played
  if (!currentTrick || currentTrick.cards.length === 0) {
    return { valid: true };
  }
  
  const leadCard = currentTrick.cards[0].card;
  
  // Special cards can always be played
  if (card.type !== 'NUMBER') {
    return { valid: true };
  }
  
  // If leading card is also special (no suit), any card can be played
  if (leadCard.type !== 'NUMBER') {
    return { valid: true };
  }
  
  const leadSuit = leadCard.suit;
  
  // If playing same suit, it's valid
  if (card.suit === leadSuit) {
    return { valid: true };
  }
  
  // If playing different suit, check if player has cards of leading suit
  const hasLeadSuit = playerHand.some(c => 
    c.type === 'NUMBER' && c.suit === leadSuit
  );
  
  if (hasLeadSuit) {
    const leadSuitName = {
      'BLACK': 'NOIRE',
      'GREEN': 'VERTE', 
      'PURPLE': 'VIOLETTE',
      'YELLOW': 'JAUNE'
    }[leadSuit] || leadSuit;
    
    return { 
      valid: false, 
      reason: `Vous devez jouer une carte ${leadSuitName} car vous en avez en main` 
    };
  }
  
  // Player doesn't have leading suit, can play any card
  return { valid: true };
}

export function setupGameSocketHandlers(io) {
  logWithTimestamp('info', 'Setting up Socket.IO game handlers...');
  
  // Start periodic save
  startPeriodicSave();
  
  // Connection timeout cleanup
  const connectionCleanup = setInterval(() => {
    // Clean up old inactive connections
    for (const [roomId, users] of roomUsers.entries()) {
      const activeUsers = users.filter(user => {
        const socket = io.sockets.sockets.get(user.socketId);
        return socket && socket.connected;
      });
      
      if (activeUsers.length !== users.length) {
        roomUsers.set(roomId, activeUsers);
        logWithTimestamp('debug', `Cleaned up inactive connections in room ${roomId}`, {
          before: users.length,
          after: activeUsers.length
        });
      }
    }
  }, 30000); // Every 30 seconds
  
  io.on('connection', (socket) => {
    logWithTimestamp('info', `User connected: ${socket.id}`);
    
    // Enhanced error handling wrapper
    const handleSocketAction = (eventName, handler) => {
      socket.on(eventName, async (...args) => {
        try {
          await handler(...args);
        } catch (error) {
          logWithTimestamp('error', `Socket ${eventName} error`, {
            socketId: socket.id,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
          
          socket.emit('error', {
            type: 'SOCKET_ERROR',
            message: 'Une erreur est survenue. Veuillez réessayer.',
            event: eventName
          });
        }
      });
    };    handleSocketAction('join-game', async (data) => {
      const { roomId, userId, username } = data;
      logWithTimestamp('info', `User ${username} (${userId}) joining room ${roomId}`, { socketId: socket.id });
      
      // Validate input data
      if (!roomId || !userId || !username) {
        socket.emit('join-rejected', { 
          reason: 'Invalid data',
          message: 'Données manquantes pour rejoindre la partie.'
        });
        return;
      }
      
      // Add user to room
      socket.join(roomId);
      
      // Track user in room
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, []);
      }
      const users = roomUsers.get(roomId);
      const existingUserIndex = users.findIndex(u => u.id === userId);
      
      if (existingUserIndex >= 0) {
        // Update existing user's socket ID (reconnection case)
        users[existingUserIndex].socketId = socket.id;
        console.log(`🔄 Updated socket ID for existing user ${username}`);
      } else {
        // Add new user
        users.push({ id: userId, username, socketId: socket.id });
        console.log(`➕ Added new user ${username} to room ${roomId}`);
      }        // Create or update game state
      if (!activeGames.has(roomId)) {
        // Try to load existing game state from database
        const savedGameState = await loadGameState(roomId);
        
        if (savedGameState) {
          // Restore game from database
          console.log(`🔄 Restoring game state for room ${roomId}`);
          
          // Update player online status for reconnected users
          savedGameState.players.forEach(player => {
            // Try to match by userId first, then by username
            const userById = users.find(u => u.id === player.id);
            const userByName = users.find(u => u.username === player.username);
            
            if (userById) {
              player.isOnline = true;
              console.log(`🔄 Player ${player.username} matched by userId: ${player.id}`);
            } else if (userByName) {
              // Update player's userId if they reconnected with different userId
              console.log(`🔄 Player ${player.username} matched by username, updating userId from ${player.id} to ${userByName.id}`);
              player.id = userByName.id;
              player.isOnline = true;
            } else {
              player.isOnline = false;
              console.log(`😴 Player ${player.username} not online`);
            }
          });
          
          // Add any completely new players that joined while game was saved
          users.forEach(user => {
            const existingPlayerById = savedGameState.players.find(p => p.id === user.id);
            const existingPlayerByName = savedGameState.players.find(p => p.username === user.username);
            
            if (!existingPlayerById && !existingPlayerByName && savedGameState.roomStatus === 'LOBBY') {
              // Only allow new players to join if game is still in lobby
              console.log(`➕ Adding completely new player ${user.username} to restored game`);
              savedGameState.players.push({
                id: user.id,
                username: user.username,
                cards: [],
                bid: null,
                score: 0,
                tricksWon: 0,
                isReady: false,
                isOnline: true
              });
            }
          });
          
          activeGames.set(roomId, savedGameState);
        } else {
          // Initialize new lobby - no game started yet
          const gameState = {
            id: roomId,
            roomId: roomId,
            creatorId: userId, // First user becomes the creator
            roomStatus: 'LOBBY', // Start in lobby mode
            players: users.map(user => ({
              id: user.id,
              username: user.username,
              cards: [],
              bid: null,
              score: 0,
              tricksWon: 0,
              isReady: false,
              isOnline: true
            })),
            currentRound: {
              number: 1,
              currentTrick: {
                cards: [],
                winner: null,
                leadSuit: null
              },
              completedTricks: []
            },
            gamePhase: 'WAITING', // Waiting in lobby
            settings: {
              maxPlayers: 8,
              roundsToPlay: 10
            }
          };
          activeGames.set(roomId, gameState);
        }
        
        // Only log and emit if it's actually a new game
        if (!savedGameState) {
          console.log(`🎲 Created new lobby for room ${roomId} with creator ${username}`);
          // Notify all clients that a new room has been created
          io.emit('room-list-updated', { 
            action: 'room-created',
            roomId: roomId 
          });
        } else {
          console.log(`🔄 Restored existing game for room ${roomId}`);
        }
      } else {        // Update existing game state
        const gameState = activeGames.get(roomId);
        
        console.log(`🔍 Checking if ${username} (${userId}) is an existing player in active game...`);
        console.log(`📋 Current players in game: ${gameState.players.map(p => `${p.username}(${p.id}, online:${p.isOnline})`).join(', ')}`);
        
        // Check if this player was already in the game (by userId or username)
        const existingPlayerIndex = gameState.players.findIndex(p => p.id === userId);
        const existingPlayerByUsername = gameState.players.find(p => p.username === username);
        
        console.log(`🔍 DEBUG - Looking for player: userId=${userId}, username=${username}`);
        console.log(`🔍 DEBUG - Existing players: ${gameState.players.map(p => `${p.username}(id:${p.id})`).join(', ')}`);
        console.log(`🔍 DEBUG - Found by ID: ${existingPlayerIndex >= 0}, Found by username: ${!!existingPlayerByUsername}`);
        
        if (existingPlayerIndex >= 0) {
          // Player reconnecting with same userId - allow reconnection
          console.log(`🔄 Player ${username} reconnecting to room ${roomId} (same userId)`);
          gameState.players[existingPlayerIndex].isOnline = true;
        } else if (existingPlayerByUsername) {
          // Player reconnecting with different userId but same username - update userId
          console.log(`🔄 Player ${username} reconnecting to room ${roomId} (updating userId from ${existingPlayerByUsername.id} to ${userId})`);
          existingPlayerByUsername.id = userId;
          existingPlayerByUsername.isOnline = true;
        } else {
          // This is a completely new player
          console.log(`❓ ${username} not found in existing players list`);
          
          // Check if game has already started - prevent NEW players from joining
          if (gameState.roomStatus === 'GAME_STARTED') {
            console.log(`❌ Game already started in room ${roomId}, rejecting NEW player ${username}`);
            socket.emit('join-rejected', { 
              reason: 'Game has already started',
              message: 'Cette partie a déjà commencé. Vous ne pouvez plus rejoindre.'
            });
            return;
          }
          
          // Only allow new players if game is still in lobby
          if (gameState.roomStatus === 'LOBBY') {
            // New player joining existing lobby
            gameState.players.push({
              id: userId,
              username: username,
              cards: [],
              bid: null,
              score: 0,
              tricksWon: 0,
              isReady: false,
              isOnline: true
            });
            console.log(`➕ Added new player ${username} to lobby ${roomId}`);
          } else {
            console.log(`❌ Cannot add new player to game in progress`);
            socket.emit('join-rejected', { 
              reason: 'Game in progress',
              message: 'Impossible de rejoindre une partie en cours.'
            });
            return;
          }
        }
      }

      // Send current game state to all players in room
      const gameState = activeGames.get(roomId);
      console.log(`📤 Sending game state to room ${roomId}:`, {
        playersCount: gameState.players.length,
        gamePhase: gameState.gamePhase
      });
      
      // Send join confirmation to the joining user
      socket.emit('join-success', { gameState });
      
      // Notify all players in room about the updated state
      io.to(roomId).emit('game-updated', gameState);
      io.to(roomId).emit('player-joined', { userId, username });
    });    socket.on('leave-game', (data) => {
      const { roomId, userId } = data;
      console.log(`User ${userId} leaving room ${roomId}`);
      
      socket.leave(roomId);
      
      // Remove user from room tracking
      if (roomUsers.has(roomId)) {
        const users = roomUsers.get(roomId);
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex >= 0) {
          users.splice(userIndex, 1);
        }
        
        // Update game state
        if (activeGames.has(roomId)) {
          const gameState = activeGames.get(roomId);
          const playerIndex = gameState.players.findIndex(p => p.id === userId);
          
          if (playerIndex >= 0) {
            // Mark player as offline instead of removing them
            gameState.players[playerIndex].isOnline = false;
            console.log(`🔌 Player ${gameState.players[playerIndex].username} marked as offline`);
          }
          
          // If no online players left, clean up the game
          const onlinePlayers = gameState.players.filter(p => p.isOnline);
          if (onlinePlayers.length === 0) {
            console.log(`🗑️ No online players left in room ${roomId}, cleaning up`);
            activeGames.delete(roomId);
            roomUsers.delete(roomId);
          } else {
            io.to(roomId).emit('game-updated', gameState);
            io.to(roomId).emit('player-left', { userId, username: gameState.players[playerIndex]?.username });
          }
        }
      }
    });    socket.on('delete-room', async (data) => {
      const { roomId, userId } = data;
      console.log(`User ${userId} attempting to delete room ${roomId}`);
      
      if (activeGames.has(roomId)) {
        const gameState = activeGames.get(roomId);
        
        // Only the room creator can delete the room
        if (gameState.creatorId !== userId) {
          socket.emit('error', 'Only the room creator can delete the room');
          return;
        }
        
        console.log(`🗑️ Room ${roomId} being deleted by creator`);
        
        try {
          // Delete from database first
          await prisma.room.delete({
            where: { code: roomId }
          });
          console.log(`🗄️ Room ${roomId} deleted from database`);
          
          // Delete game state from database
          await deleteGameState(roomId);
        } catch (error) {
          console.error(`❌ Error deleting room ${roomId} from database:`, error);
          // Continue with in-memory cleanup even if database deletion fails
        }
          // Notify all players that the room is being deleted
        io.to(roomId).emit('room-deleted', { 
          message: 'La room a été supprimée par le créateur' 
        });
        
        // Notify all clients (including those not in the room) to refresh their room list
        io.emit('room-list-updated', { 
          action: 'room-deleted',
          roomId: roomId 
        });
        
        // Clean up in-memory data
        activeGames.delete(roomId);
        roomUsers.delete(roomId);
        
        console.log(`✅ Room ${roomId} successfully deleted`);
      } else {
        console.log(`⚠️ Room ${roomId} not found in active games, trying database deletion only`);
        
        try {
          // Try to delete from database even if not in memory
          const room = await prisma.room.findUnique({
            where: { code: roomId }
          });
          
          if (room && room.hostId === userId) {            await prisma.room.delete({
              where: { code: roomId }
            });
            console.log(`🗄️ Room ${roomId} deleted from database (not in memory)`);
            
            // Delete game state from database
            await deleteGameState(roomId);
            
            // Notify all clients to refresh their room list
            io.emit('room-list-updated', { 
              action: 'room-deleted',
              roomId: roomId 
            });
            
            socket.emit('room-deleted', { 
              message: 'La room a été supprimée' 
            });
          } else {
            socket.emit('error', 'Room not found or you are not the creator');
          }
        } catch (error) {
          console.error(`❌ Error deleting room ${roomId}:`, error);
          socket.emit('error', 'Error deleting room');
        }
      }
    });
      socket.on('gameAction', async (data) => {
      const { type, payload, playerId, roomId } = data;
      console.log(`Game action: ${type} from player ${playerId} in room ${roomId}`, payload);
      
      const gameState = activeGames.get(roomId);
      if (!gameState) {
        socket.emit('error', 'Game not found');
        return;
      }
      
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) {
        socket.emit('error', 'Player not found in game');
        return;
      }
      
      try {
        let actionResult = null;
        
        if (type === 'START_GAME') {
          actionResult = handleStartGame(gameState, player);
        } else if (type === 'BID') {
          actionResult = handleBid(gameState, player, payload.bid);
        } else if (type === 'PLAY_CARD') {
          console.log(`🔍 DEBUG gameAction: payload =`, payload);
          actionResult = handlePlayCard(gameState, player, payload.cardId, payload.tigressChoice);
        }
        
        // Check if action returned an error (for validation errors)
        if (actionResult && actionResult.error) {
          console.log(`⚠️ Action ${type} validation error:`, actionResult.error);
          socket.emit('game-error', { 
            type: 'VALIDATION_ERROR',
            message: actionResult.error,
            action: type
          });
          return;
        }
        
        // Send updated game state to all players
        console.log(`🎮 Game state after ${type}:`, {
          gamePhase: gameState.gamePhase,
          currentPlayerId: gameState.currentRound?.currentPlayerId,
          playingPhase: gameState.currentRound?.playingPhase,
          currentPlayerName: gameState.players.find(p => p.id === gameState.currentRound?.currentPlayerId)?.username
        });
        
        // Save game state to database after each action
        await saveGameState(roomId, gameState);
        
        // Send updated game state to all players
        io.to(roomId).emit('game-updated', gameState);
        
        // If this was a card play that completed a trick, emit special event
        if (type === 'PLAY_CARD' && actionResult && actionResult.trickWinner) {
          console.log(`🎯 Emitting trick-completed event for winner: ${actionResult.trickWinner.playerName}`);
          io.to(roomId).emit('trick-completed', {
            winner: {
              playerId: actionResult.trickWinner.playerId,
              playerName: actionResult.trickWinner.playerName
            },
            completedTrick: actionResult.trickWinner.completedTrick
          });
        }
      } catch (error) {
        console.error('Error handling game action:', error);
        socket.emit('game-error', { 
          type: 'SERVER_ERROR',
          message: 'Une erreur serveur est survenue. Veuillez réessayer.',
          action: type
        });
      }
    });
      socket.on('disconnect', () => {
      console.log('👋 User disconnected:', socket.id);
      
      // Find and handle cleanup for disconnected users
      for (const [roomId, users] of roomUsers.entries()) {
        const userIndex = users.findIndex(u => u.socketId === socket.id);
        if (userIndex >= 0) {
          const user = users[userIndex];
          console.log(`🧹 Cleaning up disconnected user ${user.username} (${user.id}) from room ${roomId}`);
          
          // Remove user from room tracking (immediate cleanup)
          users.splice(userIndex, 1);
          
          // Update game state
          if (activeGames.has(roomId)) {
            const gameState = activeGames.get(roomId);
            
            // Keep player in game for potential reconnection, but mark as disconnected
            const player = gameState.players.find(p => p.id === user.id);
            if (player) {
              player.isOnline = false;
            }
            
            // Save game state after player disconnection
            saveGameState(roomId, gameState).catch(err => 
              console.error(`Error saving game state on disconnect:`, err)
            );
            
            // If no users left in room, clean up the game after a delay
            if (users.length === 0) {
              console.log(`🗑️ No users left in room ${roomId}, scheduling cleanup`);
              setTimeout(async () => {
                // Double-check that room is still empty
                const currentUsers = roomUsers.get(roomId);
                if (!currentUsers || currentUsers.length === 0) {
                  console.log(`🗑️ Cleaning up empty room ${roomId}`);
                  activeGames.delete(roomId);
                  roomUsers.delete(roomId);
                  // Don't delete from database here - keep for potential future reconnections
                }
              }, 30000); // 30 second delay for potential reconnections
            } else {
              // Notify remaining players about updated state
              io.to(roomId).emit('game-updated', gameState);
              io.to(roomId).emit('player-left', { userId: user.id, username: user.username });
            }
          }
          break; // User found and handled
        }
      }
    });
  });
}

function handleStartGame(gameState, player) {
  // Only the room creator can start the game
  if (player.id !== gameState.creatorId) {
    return { error: 'Seul le créateur de la room peut démarrer la partie' };
  }
  
  // Check if we have at least 2 players
  if (gameState.players.length < 2) {
    return { error: 'Au moins 2 joueurs sont nécessaires pour commencer la partie' };
  }
  
  // Check if game is in lobby
  if (gameState.roomStatus !== 'LOBBY') {
    return { error: 'La partie a déjà commencé ou est terminée' };
  }
  
  // Start the game
  gameState.roomStatus = 'GAME_STARTED';
  gameState.gamePhase = 'BIDDING';
  
  // Initialize the first round
  gameState.currentRound = {
    number: 1,
    biddingPhase: true,
    playingPhase: false,
    completed: false,
    tricks: [], // Changed from completedTricks to tricks to match TypeScript types
    currentTrick: {
      id: 'trick_1',
      cards: [],
      winnerId: null, // Changed from winner to winnerId to match TypeScript types
      leadSuit: null
    },
    currentPlayerId: gameState.players[0].id, // First round starts with first player
    dealerId: gameState.players[0].id // Dealer rotates each round
  };
  
  // Reset player states for new round
  gameState.players.forEach(player => {
    player.bid = null;
    player.tricksWon = 0;
    player.isReady = false;
    player.cards = [];
  });
  
  // Deal cards for the first round
  dealCards(gameState);
  
  console.log(`🚀 Game started in room ${gameState.roomId} by ${player.username}`);
  console.log(`📋 Round ${gameState.currentRound.number} started, each player gets ${gameState.currentRound.number} card(s)`);
  
  return { success: true };
}

function dealCards(gameState) {
  // Create a complete Skull King deck (70 cartes)
  const suits = ['BLACK', 'GREEN', 'PURPLE', 'YELLOW'];
  const deck = [];
  
  // Add numbered cards (1-14 for each suit = 56 cards)
  for (const suit of suits) {
    for (let value = 1; value <= 14; value++) {
      deck.push({
        id: `${suit}_${value}`,
        type: 'NUMBER',
        suit: suit,
        value: value,
        name: `${value} of ${suit}`
      });
    }
  }
  
  // Add special cards (14 cards total)
  // Skull King (1 card)
  deck.push({ id: 'SKULL_KING', type: 'SKULL_KING', name: 'Skull King' });
  
  // Sirènes/Mermaids (2 cards)
  deck.push(
    { id: 'MERMAID_1', type: 'MERMAID', name: 'Sirène 1' },
    { id: 'MERMAID_2', type: 'MERMAID', name: 'Sirène 2' }
  );
  
  // Pirates (5 cards)
  for (let i = 1; i <= 5; i++) {
    deck.push({ id: `PIRATE_${i}`, type: 'PIRATE', name: `Pirate ${i}` });
  }
  
  // Tigresse (1 card)
  deck.push({ id: 'TIGRESS', type: 'TIGRESS', name: 'Tigresse' });
  
  // Fuites/Escape cards (5 cards)
  for (let i = 1; i <= 5; i++) {
    deck.push({ id: `ESCAPE_${i}`, type: 'ESCAPE', name: `Fuite ${i}` });
  }
  
  // Shuffle deck using Fisher-Yates algorithm
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  // Verify deck has exactly 70 cards
  console.log(`🃏 Deck created with ${deck.length} cards (should be 70)`);
  if (deck.length !== 70) {
    console.error(`⚠️ Deck size error: expected 70 cards, got ${deck.length}`);
  }


  
  // Deal cards to players (round number = cards per player)
  const cardsPerPlayer = gameState.currentRound.number;
  let cardIndex = 0;
  
  console.log(`🃏 Dealing ${cardsPerPlayer} card(s) to each of ${gameState.players.length} players`);
  
  for (const player of gameState.players) {
    player.cards = [];
    for (let i = 0; i < cardsPerPlayer; i++) {
      if (cardIndex < deck.length) {
        player.cards.push(deck[cardIndex++]);
      }
    }
    console.log(`📇 Player ${player.username} received ${player.cards.length} cards`);
  }
  
  console.log(`✅ Card dealing complete. Used ${cardIndex}/${deck.length} cards from deck`);
}

function handleBid(gameState, player, bid) {
  if (gameState.gamePhase !== 'BIDDING') {
    return { error: 'Vous ne pouvez miser que pendant la phase d\'enchères' };
  }
  
  if (bid < 0 || bid > gameState.currentRound.number) {
    return { error: `La mise doit être entre 0 et ${gameState.currentRound.number}` };
  }
  
  // Check if player has already bid
  if (player.bid !== null) {
    return { error: 'Vous avez déjà misé pour ce tour' };
  }
  
  player.bid = bid;
  player.isReady = true;
  
  console.log(`💰 Player ${player.username} bid ${bid} tricks for round ${gameState.currentRound.number}`);
  
  // Check if all players have bid
  const allPlayersReady = gameState.players.every(p => p.isReady);
  const bidsPlaced = gameState.players.filter(p => p.bid !== null).length;
  
  console.log(`📊 Bidding progress: ${bidsPlaced}/${gameState.players.length} players have bid`);
  
  if (allPlayersReady) {
    gameState.gamePhase = 'PLAYING';
    // Reset ready status for next phase
    gameState.players.forEach(p => p.isReady = false);
    
    // Update round phases
    gameState.currentRound.biddingPhase = false;
    gameState.currentRound.playingPhase = true;
    
    // The dealer (currentPlayerId) starts the first trick of the round
    console.log(`🎯 All bids received! Moving to PLAYING phase`);
    console.log(`📋 Final bids: ${gameState.players.map(p => `${p.username}: ${p.bid}`).join(', ')}`);
    console.log(`🎮 First player to play: ${gameState.players.find(p => p.id === gameState.currentRound.currentPlayerId)?.username}`);
  }
  
  return { success: true };
}

function handlePlayCard(gameState, player, cardId, tigressChoice = null) {
  if (gameState.gamePhase !== 'PLAYING') {
    return { error: 'Vous ne pouvez jouer des cartes que pendant la phase de jeu' };
  }
  
  // Check if it's the player's turn
  const currentPlayerId = gameState.currentRound.currentPlayerId;
  if (player.id !== currentPlayerId) {
    const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
    return { error: `Ce n'est pas votre tour. C'est au tour de ${currentPlayer?.username || 'quelqu\'un d\'autre'}.` };
  }
  
  const card = player.cards.find(c => c.id === cardId);
  if (!card) {
    return { error: 'Cette carte n\'est pas dans votre main' };
  }
  
  // Check if card has already been played in current trick
  const alreadyPlayed = gameState.currentRound.currentTrick.cards.some(
    playedCard => playedCard.playerId === player.id
  );
  if (alreadyPlayed) {
    return { error: 'Vous avez déjà joué une carte dans ce pli' };
  }
  
  // Check if Tigress choice is required but not provided
  if (card.type === 'TIGRESS' && !tigressChoice) {
    return { error: 'Vous devez choisir comment utiliser la Tigresse' };
  }
  
  // Validate Tigress choice
  if (card.type === 'TIGRESS' && tigressChoice && !['PIRATE', 'ESCAPE'].includes(tigressChoice)) {
    return { error: 'Choix invalide pour la Tigresse' };
  }
  
  // Validate if the card can be legally played
  const validation = isValidCardPlay(card, player.cards, gameState.currentRound.currentTrick);
  if (!validation.valid) {
    return { error: validation.reason };
  }
  
  console.log(`🔍 DEBUG: tigressChoice = "${tigressChoice}", card.type = "${card.type}"`);
  console.log(`🃏 ${player.username} plays ${card.name}${card.type === 'TIGRESS' ? ` as ${tigressChoice}` : ''}`);
  
  // Remove card from player's hand immediately when played
  player.cards = player.cards.filter(c => c.id !== cardId);
  
  // Add card to current trick (include Tigress choice if applicable)
  const playedCard = {
    playerId: player.id,
    card: card
  };
  
  // Store Tigress choice for trick resolution
  if (card.type === 'TIGRESS' && tigressChoice) {
    playedCard.tigressChoice = tigressChoice;
  }
  
  gameState.currentRound.currentTrick.cards.push(playedCard);
  
  // Move to next player
  const currentPlayerIndex = gameState.players.findIndex(p => p.id === currentPlayerId);
  const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
  gameState.currentRound.currentPlayerId = gameState.players[nextPlayerIndex].id;
  
  console.log(`➡️ Next player: ${gameState.players[nextPlayerIndex].username}`);
  
  // Check if trick is complete (all players have played)
  if (gameState.currentRound.currentTrick.cards.length === gameState.players.length) {
    const trickWinner = resolveTrick(gameState);
    return { success: true, trickWinner };
  }
  
  return { success: true };
}

function resolveTrick(gameState) {
  const trick = gameState.currentRound.currentTrick;
  
  console.log(`🔍 Resolving trick with ${trick.cards.length} cards:`);
  trick.cards.forEach((playedCard, index) => {
    console.log(`  ${index + 1}. ${playedCard.card.name} (${playedCard.card.type})${playedCard.tigressChoice ? ` as ${playedCard.tigressChoice}` : ''}`);
  });
  
  // Identify special cards
  const skullKingCards = trick.cards.filter(c => c.card.type === 'SKULL_KING');
  const mermaidCards = trick.cards.filter(c => c.card.type === 'MERMAID');
  const pirateCards = trick.cards.filter(c => 
    c.card.type === 'PIRATE' || 
    (c.card.type === 'TIGRESS' && c.tigressChoice === 'PIRATE')
  );
  const escapeCards = trick.cards.filter(c => 
    c.card.type === 'ESCAPE' || 
    (c.card.type === 'TIGRESS' && c.tigressChoice === 'ESCAPE')
  );
  
  console.log(`📊 Special cards: SK:${skullKingCards.length}, Mermaids:${mermaidCards.length}, Pirates:${pirateCards.length}, Escapes:${escapeCards.length}`);
  
  let winner;
  let reason;
  
  // Determine winner based on Skull King rules
  if (skullKingCards.length > 0) {
    if (mermaidCards.length > 0) {
      // Mermaids beat Skull King - first mermaid wins
      winner = mermaidCards[0];
      reason = "Mermaid beats Skull King";
    } else {
      // Skull King wins
      winner = skullKingCards[0];
      reason = "Skull King wins";
    }
  } else if (mermaidCards.length > 0) {
    if (pirateCards.length > 0) {
      // Pirates beat Mermaids - first pirate wins
      winner = pirateCards[0];
      reason = "Pirate beats Mermaid";
    } else {
      // Mermaid wins - first mermaid
      winner = mermaidCards[0];
      reason = "Mermaid wins";
    }
  } else if (pirateCards.length > 0) {
    // Pirates win - first pirate
    winner = pirateCards[0];
    reason = "Pirate wins";
  } else {
    // Only number cards and escapes remain
    const leadCard = trick.cards[0];
    const leadSuit = leadCard.card.suit;
    
    // Get all number cards (excluding escapes)
    const numberCards = trick.cards.filter(c => c.card.type === 'NUMBER');
    
    if (numberCards.length === 0) {
      // Only escape cards - first escape wins (shouldn't happen but safety)
      winner = leadCard;
      reason = "Only escapes, first card wins";
    } else {
      // Find cards that follow the lead suit
      const followingSuit = numberCards.filter(c => c.card.suit === leadSuit);
      const blackCards = numberCards.filter(c => c.card.suit === 'BLACK');
      
      if (followingSuit.length > 0 || blackCards.length > 0) {
        // Include both following suit cards and black cards in the competition
        const competingCards = [...followingSuit, ...blackCards.filter(c => c.card.suit !== leadSuit)];
        
        winner = competingCards[0];
        for (const playedCard of competingCards) {
          const currentValue = playedCard.card.value || 0;
          const winnerValue = winner.card.value || 0;
          
          if (currentValue > winnerValue) {
            // Higher value wins
            winner = playedCard;
          } else if (currentValue === winnerValue) {
            // Same value - black beats all other colors
            if (playedCard.card.suit === 'BLACK' && winner.card.suit !== 'BLACK') {
              winner = playedCard;
            }
          } else if (currentValue < winnerValue && playedCard.card.suit === 'BLACK' && winner.card.suit !== 'BLACK') {
            // Black cards beat other colors even with lower value
            winner = playedCard;
          }
        }
        
        if (winner.card.suit === 'BLACK' && winner.card.suit !== leadSuit) {
          reason = `Black card beats all other colors`;
        } else {
          reason = `Highest in leading suit ${leadSuit}${winner.card.suit === 'BLACK' ? ' - Black color advantage' : ''}`;
        }
      } else {
        // No one followed suit - find highest number card overall with black advantage
        winner = numberCards[0];
        for (const playedCard of numberCards) {
          const currentValue = playedCard.card.value || 0;
          const winnerValue = winner.card.value || 0;
          
          if (currentValue > winnerValue) {
            winner = playedCard;
          } else if (currentValue === winnerValue) {
            // Same value - black beats all other colors
            if (playedCard.card.suit === 'BLACK' && winner.card.suit !== 'BLACK') {
              winner = playedCard;
            }
          }
        }
        reason = `Highest overall${winner.card.suit === 'BLACK' ? ' - Black color advantage' : ''}`;
      }
    }
  }
  
  console.log(`🏆 Winner: ${winner.card.name} (${reason})`);
  
  // Award trick to winner
  const winningPlayer = gameState.players.find(p => p.id === winner.playerId);
  if (winningPlayer) {
    winningPlayer.tricksWon++;
  }
  
  console.log(`🏆 ${winningPlayer.username} wins the trick!`);
  
  // Move completed trick to history
  trick.winnerId = winner.playerId;
  const completedTrick = { ...trick };
  gameState.currentRound.tricks.push(completedTrick);
  
  // Return trick winner information for UI display
  const trickWinnerInfo = {
    playerId: winner.playerId,
    playerName: winningPlayer.username,
    completedTrick: completedTrick
  };
  
  // Reset current trick
  gameState.currentRound.currentTrick = {
    id: `trick_${gameState.currentRound.tricks.length + 1}`,
    cards: [],
    winnerId: null,
    leadSuit: null
  };
  
  // Winner of the trick leads the next trick
  gameState.currentRound.currentPlayerId = winner.playerId;
  
  console.log(`🃏 ${winningPlayer.username} leads the next trick`);
  
  // Check if round is complete
  const totalCardsPerPlayer = gameState.currentRound.number;
  const tricksPlayed = gameState.currentRound.tricks.length;
  
  if (tricksPlayed === totalCardsPerPlayer) {
    // Round is complete, calculate scores
    calculateRoundScores(gameState);
    
    // Check if game is complete
    if (gameState.currentRound.number >= (gameState.settings?.roundsToPlay || 10)) {
      gameState.gamePhase = 'GAME_END';
    } else {
      // Start next round
      gameState.currentRound.number++;
      gameState.gamePhase = 'BIDDING';
      
      // Calculate dealer index for this round (rotates each round)
      const dealerIndex = (gameState.currentRound.number - 1) % gameState.players.length;
      const dealerId = gameState.players[dealerIndex].id;
      
      // Reset round state
      gameState.currentRound.tricks = [];
      gameState.currentRound.currentPlayerId = dealerId; // Dealer starts the round
      gameState.currentRound.dealerId = dealerId;
      gameState.players.forEach(p => {
        p.bid = null;
        p.tricksWon = 0;
        p.isReady = false;
      });
      
      console.log(`🔄 Starting Round ${gameState.currentRound.number} - Dealer: ${gameState.players[dealerIndex].username}`);
      
      // Deal new cards
      dealCards(gameState);
      
      console.log(`🔄 Starting Round ${gameState.currentRound.number}`);
    }
  }
  
  return trickWinnerInfo;
}

function calculateRoundScores(gameState) {
  for (const player of gameState.players) {
    const bid = player.bid || 0;
    const tricksWon = player.tricksWon;
    
    if (bid === tricksWon) {
      // Exact bid: 20 points + 10 per trick
      player.score += 20 + (tricksWon * 10);
    } else {
      // Missed bid: lose 10 points per difference
      player.score -= Math.abs(bid - tricksWon) * 10;
    }
  }
}
