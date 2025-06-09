import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from './src/generated/prisma/index.js';

// Initialize Prisma client
const prisma = new PrismaClient();

// Store active games in memory (in production, use Redis or database)
const activeGames = new Map();
const roomUsers = new Map();

export function setupGameSocketHandlers(io) {
  console.log('🔧 Setting up Socket.IO game handlers...');
  
  io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);    socket.on('join-game', (data) => {
      const { roomId, userId, username } = data;
      console.log(`🎮 User ${username} (${userId}) joining room ${roomId} with socket ${socket.id}`);
      
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
          },          gamePhase: 'WAITING', // Waiting in lobby
          settings: {
            maxPlayers: 8,
            roundsToPlay: 10
          }        };
        activeGames.set(roomId, gameState);
        console.log(`🎲 Created new lobby for room ${roomId} with creator ${username}`);
        
        // Notify all clients that a new room has been created
        io.emit('room-list-updated', { 
          action: 'room-created',
          roomId: roomId 
        });
      } else {        // Update existing game state
        const gameState = activeGames.get(roomId);
        
        // Check if game has already started - prevent new players from joining
        if (gameState.roomStatus === 'GAME_STARTED') {
          console.log(`❌ Game already started in room ${roomId}, rejecting ${username}`);
          socket.emit('join-rejected', { 
            reason: 'Game has already started',
            message: 'Cette partie a déjà commencé. Vous ne pouvez plus rejoindre.'
          });
          return;
        }
        
        const existingPlayerIndex = gameState.players.findIndex(p => p.id === userId);
        
        if (existingPlayerIndex >= 0) {
          // Player reconnecting - keep their state
          console.log(`🔄 Player ${username} reconnecting, keeping game state`);
          gameState.players[existingPlayerIndex].isOnline = true; // Mark as online again
        } else {
          // Check if this user already has a player with different ID (shouldn't happen but safety check)
          const playerByUsername = gameState.players.find(p => p.username === username);
          if (playerByUsername) {
            console.log(`⚠️ Username ${username} already exists in room, updating userId`);
            playerByUsername.id = userId;
            playerByUsername.isOnline = true;
          } else {
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
      socket.on('gameAction', (data) => {
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
        if (type === 'START_GAME') {
          handleStartGame(gameState, player);
        } else if (type === 'BID') {
          handleBid(gameState, player, payload.bid);
        } else if (type === 'PLAY_CARD') {
          handlePlayCard(gameState, player, payload.cardId);
        }
        
        // Send updated game state to all players
        io.to(roomId).emit('game-updated', gameState);
      } catch (error) {
        console.error('Error handling game action:', error);
        socket.emit('error', error.message);
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
            
            // If no users left in room, clean up the game after a delay
            if (users.length === 0) {
              console.log(`🗑️ No users left in room ${roomId}, scheduling cleanup`);
              setTimeout(() => {
                // Double-check that room is still empty
                const currentUsers = roomUsers.get(roomId);
                if (!currentUsers || currentUsers.length === 0) {
                  console.log(`🗑️ Cleaning up empty room ${roomId}`);
                  activeGames.delete(roomId);
                  roomUsers.delete(roomId);
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
    throw new Error('Only the room creator can start the game');
  }
  
  // Check if we have at least 2 players
  if (gameState.players.length < 2) {
    throw new Error('At least 2 players are required to start the game');
  }
  
  // Check if game is in lobby
  if (gameState.roomStatus !== 'LOBBY') {
    throw new Error('Game has already started or ended');
  }
  
  // Start the game
  gameState.roomStatus = 'GAME_STARTED';
  gameState.gamePhase = 'BIDDING';
  
  // Deal cards for the first round
  dealCards(gameState);
  
  console.log(`🚀 Game started in room ${gameState.roomId} by ${player.username}`);
}

function dealCards(gameState) {
  // Create a deck of cards (simplified for now)
  const suits = ['BLACK', 'BLUE', 'RED', 'YELLOW'];
  const deck = [];
  
  // Add numbered cards (1-13 for each suit)
  for (const suit of suits) {
    for (let value = 1; value <= 13; value++) {
      deck.push({
        id: `${suit}_${value}`,
        type: 'NUMBER',
        suit: suit,
        value: value,
        name: `${value} of ${suit}`
      });
    }
  }
  
  // Add special cards
  deck.push(
    { id: 'SKULL_KING', type: 'SKULL_KING', name: 'Skull King' },
    { id: 'MERMAID_1', type: 'MERMAID', name: 'Mermaid' },
    { id: 'MERMAID_2', type: 'MERMAID', name: 'Mermaid' },
    { id: 'PIRATE_1', type: 'PIRATE', name: 'Pirate' },
    { id: 'PIRATE_2', type: 'PIRATE', name: 'Pirate' },
    { id: 'PIRATE_3', type: 'PIRATE', name: 'Pirate' },
    { id: 'PIRATE_4', type: 'PIRATE', name: 'Pirate' },
    { id: 'PIRATE_5', type: 'PIRATE', name: 'Pirate' },
    { id: 'ESCAPE_1', type: 'ESCAPE', name: 'Escape' },
    { id: 'ESCAPE_2', type: 'ESCAPE', name: 'Escape' },
    { id: 'ESCAPE_3', type: 'ESCAPE', name: 'Escape' },
    { id: 'ESCAPE_4', type: 'ESCAPE', name: 'Escape' },
    { id: 'ESCAPE_5', type: 'ESCAPE', name: 'Escape' }
  );
  
  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  // Deal cards to players (round number = cards per player)
  const cardsPerPlayer = gameState.currentRound.number;
  let cardIndex = 0;
  
  for (const player of gameState.players) {
    player.cards = [];
    for (let i = 0; i < cardsPerPlayer; i++) {
      if (cardIndex < deck.length) {
        player.cards.push(deck[cardIndex++]);
      }
    }
  }
}

function handleBid(gameState, player, bid) {
  if (gameState.gamePhase !== 'BIDDING') {
    throw new Error('Not in bidding phase');
  }
  
  if (bid < 0 || bid > gameState.currentRound.number) {
    throw new Error(`Bid must be between 0 and ${gameState.currentRound.number}`);
  }
  
  player.bid = bid;
  player.isReady = true;
  
  // Check if all players have bid
  const allPlayersReady = gameState.players.every(p => p.isReady);
  if (allPlayersReady) {
    gameState.gamePhase = 'PLAYING';
    // Reset ready status for next phase
    gameState.players.forEach(p => p.isReady = false);
  }
}

function handlePlayCard(gameState, player, cardId) {
  if (gameState.gamePhase !== 'PLAYING') {
    throw new Error('Not in playing phase');
  }
  
  const card = player.cards.find(c => c.id === cardId);
  if (!card) {
    throw new Error('Card not found in player hand');
  }
  
  // Remove card from player's hand
  player.cards = player.cards.filter(c => c.id !== cardId);
  
  // Add card to current trick
  gameState.currentRound.currentTrick.cards.push({
    playerId: player.id,
    card: card
  });
  
  // Check if trick is complete (all players have played)
  if (gameState.currentRound.currentTrick.cards.length === gameState.players.length) {
    resolveTrick(gameState);
  }
}

function resolveTrick(gameState) {
  const trick = gameState.currentRound.currentTrick;
  
  // Simple trick resolution (highest card wins for now)
  let winner = trick.cards[0];
  for (const playedCard of trick.cards) {
    if (getCardPower(playedCard.card) > getCardPower(winner.card)) {
      winner = playedCard;
    }
  }
  
  // Award trick to winner
  const winningPlayer = gameState.players.find(p => p.id === winner.playerId);
  if (winningPlayer) {
    winningPlayer.tricksWon++;
  }
  
  // Move completed trick to history
  trick.winner = winner.playerId;
  gameState.currentRound.completedTricks.push({ ...trick });
  
  // Reset current trick
  gameState.currentRound.currentTrick = {
    cards: [],
    winner: null,
    leadSuit: null
  };
  
  // Check if round is complete
  const totalCardsPerPlayer = gameState.currentRound.number;
  const tricksPlayed = gameState.currentRound.completedTricks.length;
  
  if (tricksPlayed === totalCardsPerPlayer) {
    // Round is complete, calculate scores
    calculateRoundScores(gameState);
    
    // Check if game is complete
    if (gameState.currentRound.number >= gameState.settings.roundsToPlay) {
      gameState.gamePhase = 'GAME_END';
    } else {
      // Start next round
      gameState.currentRound.number++;
      gameState.gamePhase = 'BIDDING';
      
      // Reset round state
      gameState.currentRound.completedTricks = [];
      gameState.players.forEach(p => {
        p.bid = null;
        p.tricksWon = 0;
        p.isReady = false;
      });
      
      // Deal new cards
      dealCards(gameState);
    }
  }
}

function getCardPower(card) {
  // Simple power calculation for trick resolution
  if (card.type === 'SKULL_KING') return 100;
  if (card.type === 'PIRATE') return 90;
  if (card.type === 'MERMAID') return 80;
  if (card.type === 'NUMBER') return card.value || 0;
  return 0; // ESCAPE cards
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
