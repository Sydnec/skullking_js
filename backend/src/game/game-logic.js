import { prisma } from '../database/prisma.js';
import { logger } from '../utils/logger.js';

// Store active games in memory (with database persistence)
const activeGames = new Map();
const roomUsers = new Map();
const roomChatMessages = new Map(); // Store chat messages by room

// Constants for game configuration
const GAME_CONFIG = {
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 2,
  DEFAULT_ROUNDS: 10,
  CARD_DECK_SIZE: 70,
  SAVE_INTERVAL: 60000, // 1 minute
  CLEANUP_DELAY: 600000, // 10 minutes
  RECONNECTION_TIMEOUT: 1800000, // 30 minutes
  TRICK_DISPLAY_DELAY: 30000 // 30 seconds - Fallback timeout if player doesn't collect trick
};

// Scoring constants
const SCORING = {
  TRICK_POINTS: 20,
  ZERO_BID_POINTS: 10,
  FAIL_PENALTY: -10,
  BLACK_14_BONUS: 20,
  COLORED_14_BONUS: 10,
  MERMAID_CAPTURED_BY_PIRATE_BONUS: 20,
  PIRATE_CAPTURED_BY_SKULL_KING_BONUS: 30,
  SKULL_KING_CAPTURED_BY_MERMAID_BONUS: 40
};

/**
 * Create a complete deck for Skull King (70 cards)
 */
function createDeck() {
  const deck = [];
  
  // Number cards (1-14 in each of 4 suits = 56 cards)
  const suits = ['BLACK', 'GREEN', 'PURPLE', 'YELLOW'];
  suits.forEach(suit => {
    for (let value = 1; value <= 14; value++) {
      deck.push({
        id: `${suit}_${value}`,
        type: 'NUMBER',
        suit,
        value,
        name: `${value} of ${suit}`
      });
    }
  });

  // Special cards (14 cards total)
  // Pirates (5 cards)
  for (let i = 1; i <= 5; i++) {
    deck.push({
      id: `PIRATE_${i}`,
      type: 'PIRATE',
      name: `Pirate ${i}`
    });
  }

  // Sirènes/Mermaids (2 cards)
  for (let i = 1; i <= 2; i++) {
    deck.push({
      id: `MERMAID_${i}`,
      type: 'MERMAID',
      name: `Sirène ${i}`
    });
  }

  // Skull King (1 card)
  deck.push({
    id: 'SKULL_KING',
    type: 'SKULL_KING',
    name: 'Skull King'
  });

  // Tigresse (1 card)
  deck.push({
    id: 'TIGRESS',
    type: 'TIGRESS',
    name: 'Tigresse'
  });

  // Fuites/Escape cards (5 cards)
  for (let i = 1; i <= 5; i++) {
    deck.push({
      id: `ESCAPE_${i}`,
      type: 'ESCAPE',
      name: `Fuite ${i}`
    });
  }

  return deck;
}

/**
 * Shuffle a deck of cards
 */
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal cards for a specific round
 */
function dealCards(deck, players, roundNumber) {
  const shuffled = shuffleDeck(deck);
  const updatedPlayers = [...players];
  
  // Calculate the maximum number of cards we can distribute equally
  const maxCardsPerPlayer = Math.floor(shuffled.length / players.length);
  
  // Use the minimum between the requested round number and what's actually possible
  const cardsPerPlayer = Math.min(roundNumber, maxCardsPerPlayer);
  
  logger.game(`Card distribution: ${cardsPerPlayer} cards per player (requested: ${roundNumber}, possible: ${maxCardsPerPlayer}, players: ${players.length}, deck: ${shuffled.length} cards)`);
  
  let cardIndex = 0;
  
  // Deal cards to each player
  updatedPlayers.forEach(player => {
    player.cards = shuffled.slice(cardIndex, cardIndex + cardsPerPlayer);
    cardIndex += cardsPerPlayer;
  });
  
  return {
    players: updatedPlayers,
    actualCardsDealt: cardsPerPlayer
  };
}

/**
 * Determine the winner of a trick and analyze capture events
 */
function resolveTrick(trick) {
  if (trick.cards.length === 0) return { winnerId: '', captureEvents: [] };
  
  const captureEvents = [];
  let winnerId = '';
  
  // Special case: If Skull King is played, it wins unless there's a Mermaid
  const skullKingCard = trick.cards.find(c => c.card.type === 'SKULL_KING');
  const mermaidCards = trick.cards.filter(c => c.card.type === 'MERMAID');
  const pirateCards = trick.cards.filter(c => 
      c.card.type === 'PIRATE' || 
      (c.card.type === 'TIGRESS' && c.tigressChoice === 'PIRATE')
    );
  
  if (skullKingCard && mermaidCards.length === 0) {
    winnerId = skullKingCard.playerId;
    
    for (let i = 0; i < pirateCards.length; i++) {
      captureEvents.push({
        capturerType: 'SKULL_KING',
        capturedType: 'PIRATE',
        winnerId: skullKingCard.playerId
      });
    }
  }
  // If there are mermaids and Skull King, mermaid wins
  else if (skullKingCard && mermaidCards.length > 0) {
    winnerId = mermaidCards[0].playerId; // First mermaid played wins
    // Mermaid captured Skull King
    captureEvents.push({
      capturerType: 'MERMAID',
      capturedType: 'SKULL_KING',
      winnerId: mermaidCards[0].playerId
    });
  }
  // If only mermaids are played (no Skull King), check for pirates
  else if (mermaidCards.length > 0 && !skullKingCard) {
    if (pirateCards.length > 0) {
      // Mermaid loses to pirates/tigress acting as pirate
      winnerId = pirateCards[0].playerId;
      // Pirates captured mermaids
      for (let i = 0; i < mermaidCards.length; i++) {
          captureEvents.push({
          capturerType: 'PIRATE',
          capturedType: 'MERMAID',
          winnerId: pirateCards[0].playerId
        });
      }
    } else {
      // No pirates, mermaid wins
      winnerId = mermaidCards[0].playerId;
    }
  }
  // Regular resolution: Pirates/Tigress-as-Pirate beat number cards, highest number in leading suit wins
  else {
    const leadCard = trick.cards[0];
    const leadSuit = leadCard.card.suit;
    
    if (pirateCards.length > 0) {
      winnerId = pirateCards[0].playerId; // First pirate/tigress-as-pirate played wins
    } else {
      // Check for cards following suit
      const suitCards = trick.cards.filter(c => 
        c.card.suit === leadSuit && c.card.type === 'NUMBER'
      );
      
      if (suitCards.length > 0) {
        // Find highest value in leading suit
        let highest = suitCards[0];
        suitCards.forEach(card => {
          if ((card.card.value || 0) > (highest.card.value || 0)) {
            highest = card;
          }
        });
        winnerId = highest.playerId;
      } else {
        // If no one followed suit, first card wins
        winnerId = leadCard.playerId;
      }
    }
  }
  
  return { winnerId, captureEvents };
}

/**
 * Check if a card can be legally played
 */
function isValidPlay(card, trick, playerHand) {
  // First card of trick can always be played
  if (trick.cards.length === 0) return true;
  
  const leadCard = trick.cards[0].card;
  const leadSuit = leadCard.suit;
  
  // Special cards can always be played
  if (card.type !== 'NUMBER') return true;
  
  // If leading suit is defined and player has cards of that suit, must follow suit
  if (leadSuit && card.suit !== leadSuit) {
    const hasLeadSuit = playerHand.some(c => c.suit === leadSuit && c.type === 'NUMBER');
    return !hasLeadSuit; // Can only play off-suit if no cards of leading suit
  }
  
  return true;
}

// Enhanced logging - supprimé car remplacé par le logger centralisé

// Database persistence functions
async function saveGameState(roomCode, gameState) {
  try {
    // First, find the room by its code to get the internal ID
    const room = await prisma.room.findUnique({
      where: { code: roomCode }
    });

    if (!room) {
      logger.warn(`Room ${roomCode} not found in database, skipping save`);
      return;
    }

    const gameData = {
      round: gameState.currentRound?.number || 1,
      phase: gameState.gamePhase || 'LOBBY',
      state: JSON.stringify(gameState)
    };

    await prisma.gameState.upsert({
      where: { roomId: room.id }, // Use the internal room ID
      update: {
        round: gameData.round,
        phase: gameData.phase,
        state: gameData.state,
        updatedAt: new Date()
      },
      create: {
        roomId: room.id, // Use the internal room ID
        round: gameData.round,
        phase: gameData.phase,
        state: gameData.state
      }
    });

    logger.success(`Game state saved for room ${roomCode}`, {
      round: gameData.round,
      players: gameState.players?.length || 0
    });
  } catch (error) {
    logger.error(`Error saving game state for room ${roomCode}`, { error: error.message });
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
      logger.warn(`Room ${roomCode} not found in database`);
      return null;
    }

    const gameData = await prisma.gameState.findFirst({
      where: { roomId: room.id },
      orderBy: { updatedAt: 'desc' }
    });

    if (gameData && gameData.state) {
      const savedState = JSON.parse(gameData.state);
      logger.database(`Loaded game state for room ${roomCode} (Round ${gameData.round})`);
      return savedState;
    }

    return null;
  } catch (error) {
    logger.error(`Error loading game state for room ${roomCode}`, { error: error.message });
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
      logger.warn(`Room ${roomCode} not found in database`);
      return;
    }

    await prisma.gameState.deleteMany({
      where: { roomId: room.id }
    });
    logger.success(`Game state deleted for room ${roomCode}`);
  } catch (error) {
    if (error.code !== 'P2025') { // P2025 = Record not found
      logger.error(`Error deleting game state for room ${roomCode}`, { error: error.message });
    }
  }
}

// Periodic auto-save for all active games
function startPeriodicSave() {
  setInterval(async () => {
    if (activeGames.size === 0) return;
    
    logger.info(`Starting periodic save for ${activeGames.size} active games`);
    const savePromises = [];
    
    for (const [roomId, gameState] of activeGames.entries()) {
      savePromises.push(
        saveGameState(roomId, gameState).catch(error => 
          logger.error(`Periodic save failed for room ${roomId}`, { error: error.message })
        )
      );
    }
    
    await Promise.allSettled(savePromises);
  }, GAME_CONFIG.SAVE_INTERVAL);
}

// Validation function for card play legality
/**
 * Determine the leading suit for a trick, skipping escape cards
 * Returns null if no suit-defining card has been played yet
 */
function getLeadingSuit(currentTrick) {
  if (!currentTrick || currentTrick.cards.length === 0) {
    return null;
  }
  
  // Look through the cards in order to find the first non-escape card with a suit
  for (const cardPlay of currentTrick.cards) {
    const card = cardPlay.card;
    
    // Skip escape cards
    if (card.type === 'ESCAPE') {
      continue;
    }
    
    // Skip tigress played as escape
    if (card.type === 'TIGRESS' && cardPlay.tigressChoice === 'ESCAPE') {
      continue;
    }
    
    // If it's a number card, return its suit
    if (card.type === 'NUMBER') {
      return card.suit;
    }
    
    // If it's any other special card (PIRATE, MERMAID, SKULL_KING, or TIGRESS as PIRATE), 
    // there's no suit requirement
    return null;
  }
  
  // All cards played so far are escapes, no suit requirement yet
  return null;
}

function isValidCardPlay(card, playerHand, currentTrick) {
  // First card of trick can always be played
  if (!currentTrick || currentTrick.cards.length === 0) {
    return { valid: true };
  }
  
  // Special cards can always be played
  if (card.type !== 'NUMBER') {
    return { valid: true };
  }
  
  // Get the leading suit (skipping escape cards)
  const leadSuit = getLeadingSuit(currentTrick);
  
  // If no suit has been established yet (all cards so far are escapes), any card can be played
  if (!leadSuit) {
    return { valid: true };
  }
  
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

// Scoring functions
/**
 * Calculate bonus points for a player (14 cards + capture events)
 */
function calculateBonusPoints(player) {
  let bonusPoints = 0;
  
  // Bonus for 14s
  for (const card of player.cards) {
    if (card.type === 'NUMBER' && card.value === 14) {
      if (card.suit === 'BLACK') {
        bonusPoints += SCORING.BLACK_14_BONUS; // 20 points for black 14
      } else if (card.suit && ['GREEN', 'PURPLE', 'YELLOW'].includes(card.suit)) {
        bonusPoints += SCORING.COLORED_14_BONUS; // 10 points for colored 14
      }
    }
  }
  
  // Bonus for capture events
  if (player.captureEvents) {
    for (const event of player.captureEvents) {
      if (event.winnerId === player.id) {
        bonusPoints += getCaptureBonus(event.capturerType, event.capturedType);
      }
    }
  }
  
  return bonusPoints;
}

/**
 * Get bonus points for a specific capture combination
 */
function getCaptureBonus(capturerType, capturedType) {
  if (capturerType === 'PIRATE' && capturedType === 'MERMAID') {
    return SCORING.MERMAID_CAPTURED_BY_PIRATE_BONUS; // 20 points
  }
  if (capturerType === 'SKULL_KING' && capturedType === 'PIRATE') {
    return SCORING.PIRATE_CAPTURED_BY_SKULL_KING_BONUS; // 30 points
  }
  if (capturerType === 'MERMAID' && capturedType === 'SKULL_KING') {
    return SCORING.SKULL_KING_CAPTURED_BY_MERMAID_BONUS; // 40 points
  }
  return 0;
}

/**
 * Calculate scores for a completed round
 */
function calculateRoundScores(players, roundNumber) {
  return players.map(player => {
    const bid = player.bid || 0;
    const tricks = player.tricksWon;
    let roundScore = 0;

    if (bid === 0) {
      // Bid 0: 10 points per round number
      if (tricks === 0) {
        roundScore = SCORING.ZERO_BID_POINTS * roundNumber;
      } else {
        roundScore = SCORING.FAIL_PENALTY * roundNumber; 
      }
    } else {
      // Normal bid: 20 points per trick if exact, -10 per difference
      if (tricks === bid) {
        roundScore = SCORING.TRICK_POINTS * bid;
        
        // Add bonus points (only if bid is successful)
        roundScore += calculateBonusPoints(player);
      } else {
        roundScore = SCORING.FAIL_PENALTY * Math.abs(tricks - bid);
      }
    }

    return {
      ...player,
      score: player.score + roundScore,
      bid: null, // Reset for next round
      tricksWon: 0,
      isReady: false,
      captureEvents: [] // Reset capture events for next round
    };
  });
}

// Socket.IO game handlers
function setupGameSocketHandlers(io) {
  logger.info('Setting up Socket.IO game handlers...');
  
  // Start periodic save
  startPeriodicSave();
  
  io.on('connection', (socket) => {
    logger.socket(`User connected: ${socket.id}`);
    
    // Enhanced error handling wrapper
    const handleSocketAction = (eventName, handler) => {
      socket.on(eventName, async (...args) => {
        try {
          await handler(...args);
        } catch (error) {
          logger.error(`Socket ${eventName} error`, {
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
      const { roomId, userId, username, forceSpectator = false } = data;
      logger.socket(`User ${username} (${userId}) joining room ${roomId}${forceSpectator ? ' as spectator' : ''}`, { socketId: socket.id });
      
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
        logger.socket(`Updated socket ID for existing user ${username}`);
      } else {
        // Add new user
        users.push({ id: userId, username, socketId: socket.id });
        logger.socket(`Added new user ${username} to room ${roomId}`);
      }        // Create or update game state
      if (!activeGames.has(roomId)) {
        // Try to load existing game state from database
        const savedGameState = await loadGameState(roomId);
        
        if (savedGameState) {
          // Restore game from database
          logger.game(`Restoring game state for room ${roomId}`);
          
          // Update player online status for reconnected users
          savedGameState.players.forEach(player => {
            // Try to match by userId first, then by username
            const userById = users.find(u => u.id === player.id);
            const userByName = users.find(u => u.username === player.username);
            
            if (userById) {
              player.isOnline = true;
              logger.socket(`Player ${player.username} matched by userId: ${player.id}`);
            } else if (userByName) {
              // Update player's userId if they reconnected with different userId
              logger.socket(`Player ${player.username} matched by username, updating userId from ${player.id} to ${userByName.id}`);
              player.id = userByName.id;
              player.isOnline = true;
            } else {
              player.isOnline = false;
              logger.socket(`Player ${player.username} not online`);
            }
          });
          
          // Add any completely new players that joined while game was saved
          users.forEach(user => {
            const existingPlayerById = savedGameState.players.find(p => p.id === user.id);
            const existingPlayerByName = savedGameState.players.find(p => p.username === user.username);
            const existingSpectatorById = savedGameState.spectators?.find(s => s.id === user.id);
            const existingSpectatorByName = savedGameState.spectators?.find(s => s.username === user.username);
            
            if (!existingPlayerById && !existingPlayerByName && !existingSpectatorById && !existingSpectatorByName) {
              if (savedGameState.roomStatus === 'LOBBY' && !forceSpectator) {
                // Only allow new players to join if game is still in lobby and not forcing spectator
                logger.game(`Adding completely new player ${user.username} to restored game`);
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
              } else {
                // Game already started or user wants to be spectator, add as spectator
                const reason = forceSpectator ? 'user requested spectator mode' : 'game already started';
                logger.game(`Adding ${user.username} as spectator to restored game (${reason})`);
                if (!savedGameState.spectators) {
                  savedGameState.spectators = [];
                }
                savedGameState.spectators.push({
                  id: user.id,
                  username: user.username,
                  isOnline: true,
                  joinedAt: new Date()
                });
              }
            } else if (existingSpectatorById) {
              existingSpectatorById.isOnline = true;
            } else if (existingSpectatorByName) {
              existingSpectatorByName.id = user.id;
              existingSpectatorByName.isOnline = true;
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
              isOnline: true,
              captureEvents: []
            })),
            spectators: [], // Initialize spectators array
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
            deck: createDeck(), // Initialize with a fresh deck
            settings: {
              maxPlayers: 8,
              roundsToPlay: 10
            }
          };
          activeGames.set(roomId, gameState);
        }
        
        // Only log and emit if it's actually a new game
        if (!savedGameState) {
          logger.game(`Created new lobby for room ${roomId} with creator ${username}`);
          // Notify all clients that a new room has been created
          io.emit('room-list-updated', { 
            action: 'room-created',
            roomId: roomId 
          });
        } else {
          logger.game(`Restored existing game for room ${roomId}`);
        }
      } else {        // Update existing game state
        const gameState = activeGames.get(roomId);
        
        logger.debug(`Checking if ${username} (${userId}) is an existing player in active game...`);
        logger.debug(`Current players in game: ${gameState.players.map(p => `${p.username}(${p.id}, online:${p.isOnline})`).join(', ')}`);
        
        // Check if this player was already in the game (by userId or username)
        const existingPlayerIndex = gameState.players.findIndex(p => p.id === userId);
        const existingPlayerByUsername = gameState.players.find(p => p.username === username);
        
        logger.debug(`Looking for player: userId=${userId}, username=${username}`);
        logger.debug(`Existing players: ${gameState.players.map(p => `${p.username}(id:${p.id})`).join(', ')}`);
        logger.debug(`Found by ID: ${existingPlayerIndex >= 0}, Found by username: ${!!existingPlayerByUsername}`);
        
        if (existingPlayerIndex >= 0) {
          // Player reconnecting with same userId - allow reconnection
          logger.socket(`Player ${username} reconnecting to room ${roomId} (same userId)`);
          gameState.players[existingPlayerIndex].isOnline = true;
        } else if (existingPlayerByUsername) {
          // Player reconnecting with different userId but same username - update userId
          logger.socket(`Player ${username} reconnecting to room ${roomId} (updating userId from ${existingPlayerByUsername.id} to ${userId})`);
          existingPlayerByUsername.id = userId;
          existingPlayerByUsername.isOnline = true;
        } else {
          // This is a completely new player
          logger.debug(`${username} not found in existing players list`);
          
          // Check if user wants to force spectator mode or if game has already started
          if (forceSpectator || gameState.roomStatus === 'GAME_STARTED') {
            const reason = forceSpectator ? 'user requested spectator mode' : 'game already started';
            logger.game(`Adding ${username} as spectator to room ${roomId} (${reason})`);
            
            // Initialize spectators array if it doesn't exist
            if (!gameState.spectators) {
              gameState.spectators = [];
            }
            
            // Check if user is already a spectator
            const existingSpectator = gameState.spectators.find(s => s.id === userId || s.username === username);
            if (!existingSpectator) {
              gameState.spectators.push({
                id: userId,
                username: username,
                isOnline: true,
                joinedAt: new Date()
              });
              logger.game(`Added ${username} as spectator to room ${roomId}`);
            } else {
              existingSpectator.isOnline = true;
              logger.socket(`Spectator ${username} reconnected to room ${roomId}`);
            }
            
            // Send spectator join confirmation
            socket.emit('join-success', { 
              gameState,
              isSpectator: true,
              spectatorId: userId
            });
            
            // Notify all players about the new spectator
            io.to(roomId).emit('spectator-joined', { userId, username });
            io.to(roomId).emit('game-updated', gameState);
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
              isOnline: true,
              captureEvents: []
            });
            logger.game(`Added new player ${username} to lobby ${roomId}`);
          } else {
            logger.warn(`Cannot add new player to game in progress`);
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
      logger.socket(`Sending game state to room ${roomId}`, {
        playersCount: gameState.players.length,
        gamePhase: gameState.gamePhase
      });
      
      // Send chat history to the joining user FIRST
      const chatHistory = roomChatMessages.get(roomId) || [];
      logger.socket(`Sending chat history to ${username}: ${chatHistory.length} messages`);
      socket.emit('chat_history', chatHistory);
      
      // Send join confirmation to the joining user
      socket.emit('join-success', { gameState });
      
      // Notify all players in room about the updated state
      io.to(roomId).emit('game-updated', gameState);
      io.to(roomId).emit('player-joined', { userId, username });
    });    socket.on('leave-game', (data) => {
      const { roomId, userId } = data;
      logger.socket(`User ${userId} leaving room ${roomId}`);
      
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
            logger.socket(`Player ${gameState.players[playerIndex].username} marked as offline`);
          }
          
          // Also check if user was a spectator
          const spectatorIndex = gameState.spectators?.findIndex(s => s.id === userId);
          if (spectatorIndex !== undefined && spectatorIndex >= 0) {
            // Mark spectator as offline
            gameState.spectators[spectatorIndex].isOnline = false;
            logger.socket(`Spectator ${gameState.spectators[spectatorIndex].username} marked as offline`);
            
            // Notify room about spectator leaving
            io.to(roomId).emit('spectator-left', { userId, username: gameState.spectators[spectatorIndex].username });
          }
          
          // If no online players left, clean up the game
          const onlinePlayers = gameState.players.filter(p => p.isOnline);
          if (onlinePlayers.length === 0) {
            logger.game(`No online players left in room ${roomId}, cleaning up`);
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
      logger.socket(`User ${userId} attempting to delete room ${roomId}`);
      
      if (activeGames.has(roomId)) {
        const gameState = activeGames.get(roomId);
        
        // Only the room creator can delete the room
        if (gameState.creatorId !== userId) {
          socket.emit('error', 'Only the room creator can delete the room');
          return;
        }
        
        logger.game(`Room ${roomId} being deleted by creator`);
        
        try {
          // Delete from database first
          await prisma.room.delete({
            where: { code: roomId }
          });
          logger.database(`Room ${roomId} deleted from database`);
          
          // Delete game state from database
          await deleteGameState(roomId);
        } catch (error) {
          logger.error(`Error deleting room ${roomId} from database`, { error: error.message });
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
        
        logger.success(`Room ${roomId} successfully deleted`);
      } else {
        logger.warn(`Room ${roomId} not found in active games, trying database deletion only`);
        
        try {
          // Try to delete from database even if not in memory
          const room = await prisma.room.findUnique({
            where: { code: roomId }
          });
          
          if (room && room.hostId === userId) {            await prisma.room.delete({
              where: { code: roomId }
            });
            logger.database(`Room ${roomId} deleted from database (not in memory)`);
            
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
          logger.error(`Error deleting room ${roomId}`, { error: error.message });
          socket.emit('error', 'Error deleting room');
        }
      }
    });
      socket.on('gameAction', async (data) => {
      const { type, payload, playerId, roomId } = data;
      logger.game(`Game action: ${type} from player ${playerId} in room ${roomId}`, payload);
      
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
          actionResult = handleStartGame(gameState, player, io, roomId);
        } else if (type === 'BID') {
          actionResult = handleBid(gameState, player, payload.bid);
        } else if (type === 'PLAY_CARD') {
          logger.debug(`gameAction payload:`, payload);
          actionResult = handlePlayCard(gameState, player, payload.cardId, payload.tigressChoice);
        } else if (type === 'COLLECT_TRICK') {
          actionResult = handleCollectTrick(gameState, player);
        }        // Check if action returned an error (for validation errors)
        if (actionResult && actionResult.error) {
          logger.warn(`Action ${type} validation error: ${actionResult.error}`);
          
          // Send toast notification only to the player who made the error
          socket.emit('toast-notification', {
            type: 'error',
            message: actionResult.error,
            title: 'Erreur de jeu'
          });
          return;
        }
        
        // Send updated game state to all players
        logger.game(`Game state after ${type}`, {
          gamePhase: gameState.gamePhase,
          currentPlayerId: gameState.currentRound?.currentPlayerId,
          playingPhase: gameState.currentRound?.playingPhase,
          currentPlayerName: gameState.players.find(p => p.id === gameState.currentRound?.currentPlayerId)?.username
        });
        
        // Save game state to database after each action
        await saveGameState(roomId, gameState);
        
        // If this was a card play that completed a trick, handle special display logic
        if (type === 'PLAY_CARD' && actionResult && actionResult.trickWinner) {
          logger.game(`Trick completed by ${actionResult.trickWinner.playerName}, showing complete trick for display delay...`);
          
          // First, send the game state with the complete trick visible
          io.to(roomId).emit('game-updated', gameState);
          
          // Emit the trick completion event to show winner notification
          io.to(roomId).emit('trick-completed', {
            winner: {
              playerId: actionResult.trickWinner.playerId,
              playerName: actionResult.trickWinner.playerName
            },
            completedTrick: actionResult.trickWinner.completedTrick
          });

          // Change game phase to waiting for trick collection
          gameState.gamePhase = 'TRICK_WAITING';
          
          // Send updated game state immediately to show the "Collect Trick" button
          await saveGameState(roomId, gameState);
          io.to(roomId).emit('game-updated', gameState);
          
          // Set a fallback timeout in case the player doesn't collect the trick
          setTimeout(async () => {
            // Check if the game is still waiting for trick collection
            if (gameState.gamePhase === 'TRICK_WAITING') {
              logger.game(`Fallback timeout: automatically collecting trick for ${actionResult.trickWinner.playerName}`);
              
              // Find the trick winner
              const trickWinner = gameState.players.find(p => p.id === actionResult.trickWinner.playerId);
              if (trickWinner) {
                // Automatically collect the trick
                const collectionResult = processTrickCollection(gameState);
                if (collectionResult.success) {
                  await saveGameState(roomId, gameState);
                  io.to(roomId).emit('game-updated', gameState);
                  
                  // Send notification about automatic collection
                  sendToastNotification(io, roomId, 'info', 
                    `${actionResult.trickWinner.playerName} a automatiquement ramassé le pli`, 
                    '⏰ Temps écoulé'
                  );
                }
              }
            }
          }, GAME_CONFIG.TRICK_DISPLAY_DELAY); // Fallback timeout
        } else if (type === 'COLLECT_TRICK' && actionResult && actionResult.success && actionResult.collected) {
          // Trick was manually collected by the winner
          logger.game(`Trick manually collected by ${player.username}`);
          
          // Send updated game state immediately
          io.to(roomId).emit('game-updated', gameState);
          
          // Send notification about manual collection
          sendToastNotification(io, roomId, 'success', 
            `${player.username} a ramassé le pli !`, 
            '✅ Pli ramassé'
          );
        } else {
          // For other actions, send updated game state immediately
          io.to(roomId).emit('game-updated', gameState);
        }
      } catch (error) {
        logger.error('Error handling game action', { error: error.message, type, playerId, roomId });
        socket.emit('game-error', { 
          type: 'SERVER_ERROR',
          message: 'Une erreur serveur est survenue. Veuillez réessayer.',
          action: type
        });
      }
    });

    // Handle chat messages
    handleSocketAction('chat-message', async (data) => {
      const { roomId, userId, username, message } = data;
      
      logger.socket(`Chat message received from ${username} in room ${roomId}: "${message}"`);
      
      if (roomId && userId && username && message) {
        const chatMessage = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: userId,
          username: username,
          roomId,
          message: message,
          timestamp: new Date(),
          type: 'USER'
        };

        // Save message to room's chat history
        const messages = roomChatMessages.get(roomId) || [];
        messages.push(chatMessage);
        roomChatMessages.set(roomId, messages);

        logger.socket(`Broadcasting message to room ${roomId}, now has ${messages.length} messages`);

        // Emit message to all users in room
        io.to(roomId).emit('chat-message', chatMessage);

        logger.socket(`Message from ${username} in room ${roomId}: ${message}`);
      } else {
        logger.warn(`Invalid chat message data`, data);
      }
    });
      socket.on('disconnect', () => {
      logger.socket(`User disconnected: ${socket.id}`);
      
      // Find and handle cleanup for disconnected users
      for (const [roomId, users] of roomUsers.entries()) {
        const userIndex = users.findIndex(u => u.socketId === socket.id);
        if (userIndex >= 0) {
          const user = users[userIndex];
          logger.socket(`Cleaning up disconnected user ${user.username} (${user.id}) from room ${roomId}`);
          
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
            
            // Also check spectators
            const spectator = gameState.spectators?.find(s => s.id === user.id);
            if (spectator) {
              spectator.isOnline = false;
            }
            
            // Save game state after player disconnection
            saveGameState(roomId, gameState).catch(err => 
              logger.error(`Error saving game state on disconnect`, { error: err.message, roomId })
            );
            
            // If no users left in room, clean up the game after a delay
            if (users.length === 0) {
              logger.game(`No users left in room ${roomId}, scheduling cleanup`);
              setTimeout(async () => {
                // Double-check that room is still empty
                const currentUsers = roomUsers.get(roomId);
                if (!currentUsers || currentUsers.length === 0) {
                  logger.game(`Cleaning up empty room ${roomId}`);
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

// Function to send toast notifications to users
function sendToastNotification(io, roomId, type, message, title, excludeUserId = null, duration = 5000) {
  const toastData = {
    type, // 'success', 'error', 'warning', 'info'
    message,
    title,
    duration
  };

  if (excludeUserId) {
    // Send to all sockets in room except the excluded user
    const users = roomUsers.get(roomId) || [];
    users.forEach(user => {
      if (user.id !== excludeUserId) {
        io.to(user.socketId).emit('toast-notification', toastData);
      }
    });
  } else {
    // Send to all users in room
    io.to(roomId).emit('toast-notification', toastData);
  }
}

async function handleStartGame(gameState, player, io, roomId) {
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
  
  // Update room status in database
  try {
    await prisma.room.update({
      where: { code: roomId },
      data: { status: 'PLAYING' }
    });
    logger.database(`Room ${roomId} status updated to PLAYING in database`);
  } catch (error) {
    logger.error(`Error updating room status for ${roomId}`, { error: error.message });
  }
  
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
    player.capturedCards = [];
  });
  
  // Create a fresh new deck for the game
  gameState.deck = createDeck();
  
  // Deal cards for the first round
  const dealResult = dealCards(gameState.deck, gameState.players, gameState.currentRound.number);
  gameState.players = dealResult.players;
  
  // Check if we had to adjust the number of cards dealt
  if (dealResult.actualCardsDealt < gameState.currentRound.number) {
    logger.warn(`Adjusted cards per player from ${gameState.currentRound.number} to ${dealResult.actualCardsDealt} due to deck limitations`);
    
    // Send warning notification to all players
    sendToastNotification(io, roomId, 'warning', 
      `Nombre de cartes ajusté à ${dealResult.actualCardsDealt} par joueur (paquet insuffisant pour ${gameState.currentRound.number} cartes)`, 
      '⚠️ Ajustement automatique'
    );
  }
  
  logger.game(`Game started in room ${gameState.roomId} by ${player.username}`);
  logger.game(`Round ${gameState.currentRound.number} started, each player gets ${dealResult.actualCardsDealt} card(s)`);
  
  // Send toast notification to all players about game start
  sendToastNotification(io, roomId, 'success', 
    `La partie commence ! ${gameState.players.length} joueurs participent.`, 
    '🎮 Partie lancée'
  );
  
  return { success: true };
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
  
  logger.game(`Player ${player.username} bid ${bid} tricks for round ${gameState.currentRound.number}`);
  
  // Check if all players have bid
  const allPlayersReady = gameState.players.every(p => p.isReady);
  const bidsPlaced = gameState.players.filter(p => p.bid !== null).length;
  
  logger.game(`Bidding progress: ${bidsPlaced}/${gameState.players.length} players have bid`);
  
  if (allPlayersReady) {
    gameState.gamePhase = 'PLAYING';
    // Reset ready status for next phase
    gameState.players.forEach(p => p.isReady = false);
    
    // Update round phases
    gameState.currentRound.biddingPhase = false;
    gameState.currentRound.playingPhase = true;
    
    // The dealer (currentPlayerId) starts the first trick of the round
    logger.game(`All bids received! Moving to PLAYING phase`);
    logger.game(`Final bids: ${gameState.players.map(p => `${p.username}: ${p.bid}`).join(', ')}`);
    logger.game(`First player to play: ${gameState.players.find(p => p.id === gameState.currentRound.currentPlayerId)?.username}`);
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
  
  logger.debug(`tigressChoice = "${tigressChoice}", card.type = "${card.type}"`);
  logger.game(`${player.username} plays ${card.name}${card.type === 'TIGRESS' ? ` as ${tigressChoice}` : ''}`);
  
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
  
  logger.game(`Next player: ${gameState.players[nextPlayerIndex].username}`);
  
  // Check if trick is complete (all players have played)
  if (gameState.currentRound.currentTrick.cards.length === gameState.players.length) {
    // Save the complete trick before resolving it (for display purposes)
    const completeTrick = { ...gameState.currentRound.currentTrick };
    
    const trickWinner = resolveTrickInGameState(gameState);
    
    // Add the complete trick to the result for display
    trickWinner.completeTrick = completeTrick;
    
    return { success: true, trickWinner };
  }
  
  return { success: true };
}

function handleCollectTrick(gameState, player) {
  // Verify that we're in the correct phase
  if (gameState.gamePhase !== 'TRICK_WAITING') {
    return { error: 'Aucun pli à ramasser pour le moment' };
  }
  
  // Verify that the current trick has a winner
  if (!gameState.currentRound.currentTrick.winnerId) {
    return { error: 'Le pli n\'a pas encore été résolu' };
  }
  
  // Verify that the player is the trick winner
  if (gameState.currentRound.currentTrick.winnerId !== player.id) {
    const winnerName = gameState.players.find(p => p.id === gameState.currentRound.currentTrick.winnerId)?.username;
    return { error: `Seul ${winnerName} peut ramasser ce pli` };
  }
  
  logger.game(`${player.username} collects the trick`);
  
  // Process the trick collection
  return processTrickCollection(gameState);
}

function processTrickCollection(gameState) {
  // Move the completed trick to history
  const completedTrick = { ...gameState.currentRound.currentTrick };
  gameState.currentRound.tricks.push(completedTrick);
  
  // Check if round is complete
  const totalCardsPerPlayer = gameState.currentRound.number;
  const tricksPlayed = gameState.currentRound.tricks.length;
  
  if (tricksPlayed === totalCardsPerPlayer) {
    // Round is complete, calculate scores
    calculateRoundScoresInGameState(gameState);
    
    // Check if game is complete
    if (gameState.currentRound.number >= (gameState.settings?.roundsToPlay || 10)) {
      gameState.gamePhase = 'GAME_END';
    } else {
      // Start next round
      gameState.currentRound.number++;
      gameState.gamePhase = 'BIDDING';
      
      // Calculate dealer index for next round (rotates each round)
      const dealerIndex = (gameState.currentRound.number - 1) % gameState.players.length;
      const dealerId = gameState.players[dealerIndex].id;
      
      // Reset round state
      gameState.currentRound.tricks = [];
      gameState.currentRound.currentPlayerId = dealerId;
      gameState.currentRound.dealerId = dealerId;
      gameState.players.forEach(p => {
        p.bid = null;
        p.tricksWon = 0;
        p.isReady = false;
        p.capturedCards = [];
      });
      
      logger.game(`Starting Round ${gameState.currentRound.number} - Dealer: ${gameState.players[dealerIndex].username}`);
      
      // Create a fresh new deck for each round
      gameState.deck = createDeck();
      
      // Deal new cards
      const dealResult = dealCards(gameState.deck, gameState.players, gameState.currentRound.number);
      gameState.players = dealResult.players;
    }
    
    // Reset current trick
    gameState.currentRound.currentTrick = {
      id: 'trick_1',
      cards: [],
      winnerId: null,
      leadSuit: null
    };
  } else {
    // Continue with next trick
    gameState.gamePhase = 'PLAYING';
    
    // Reset the current trick for the next one
    const nextTrickId = `trick_${gameState.currentRound.tricks.length + 1}`;
    gameState.currentRound.currentTrick = {
      id: nextTrickId,
      cards: [],
      winnerId: null,
      leadSuit: null
    };
    
    logger.game(`Starting next trick: ${nextTrickId}`);
  }
  
  return { success: true, collected: true };
}

function resolveTrickInGameState(gameState) {
  const trick = gameState.currentRound.currentTrick;
  
  logger.game(`Resolving trick with ${trick.cards.length} cards:`);
  trick.cards.forEach((playedCard, index) => {
    logger.game(`  ${index + 1}. ${playedCard.card.name} (${playedCard.card.type})${playedCard.tigressChoice ? ` as ${playedCard.tigressChoice}` : ''}`);
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
  
  logger.game(`Special cards: SK:${skullKingCards.length}, Mermaids:${mermaidCards.length}, Pirates:${pirateCards.length}, Escapes:${escapeCards.length}`);
  
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
  
  logger.game(`Winner: ${winner.card.name} (${reason})`);
  
  // Record capture events for bonus scoring
  const captureEvents = [];
  
  // Check for special capture combinations
  if (skullKingCards.length > 0 && mermaidCards.length > 0) {
    // Mermaid captured Skull King
    captureEvents.push({
      capturerType: 'MERMAID',
      capturedType: 'SKULL_KING',
      winnerId: mermaidCards[0].playerId
    });
  } else if (skullKingCards.length > 0 && pirateCards.length > 0) {
    // Skull King captured Pirates (one event per pirate)
    for (let i = 0; i < pirateCards.length; i++) {
      captureEvents.push({
        capturerType: 'SKULL_KING',
        capturedType: 'PIRATE',
        winnerId: skullKingCards[0].playerId
      });
    }
  } else if (mermaidCards.length > 0 && pirateCards.length > 0) {
    // Pirates captured Mermaids (one event per mermaid)
    for (let i = 0; i < mermaidCards.length; i++) {
      captureEvents.push({
        capturerType: 'PIRATE',
        capturedType: 'MERMAID',
        winnerId: pirateCards[0].playerId
      });
    }
  }
  
  // Award trick to winner
  const winningPlayer = gameState.players.find(p => p.id === winner.playerId);
  if (winningPlayer) {
    winningPlayer.tricksWon++;
    
    // Collect all cards from the trick for the winner (for bonus calculation)
    if (!winningPlayer.capturedCards) {
      winningPlayer.capturedCards = [];
    }
    
    // Add all cards from this trick to the winner's captured cards
    const trickCards = trick.cards.map(entry => entry.card);
    winningPlayer.capturedCards.push(...trickCards);
    
    // Initialize captureEvents array if not exists
    if (!winningPlayer.captureEvents) {
      winningPlayer.captureEvents = [];
    }
    
    // Add capture events to the winning player
    winningPlayer.captureEvents.push(...captureEvents);
    
    logger.game(`${winningPlayer.username} captured ${trickCards.length} cards: ${trickCards.map(c => c.name).join(', ')}`);
    
    if (captureEvents.length > 0) {
      logger.game(`Capture events recorded for ${winningPlayer.username}:`);
      captureEvents.forEach(event => {
        logger.game(`  ${event.capturerType} captured ${event.capturedType}`);
      });
    }
  }
  
  logger.game(`${winningPlayer.username} wins the trick!`);
  
  // Set the winner for the current trick but DON'T move it to history yet
  // It will be moved after the display delay
  trick.winnerId = winner.playerId;
  const completedTrick = { ...trick };
  
  // Return trick winner information for UI display
  const trickWinnerInfo = {
    playerId: winner.playerId,
    playerName: winningPlayer.username,
    completedTrick: completedTrick
  };
  
  // DON'T move trick to history or reset current trick here - it will be done after display delay
  // This allows the complete trick to be visible for 1 second
  
  // Winner of the trick leads the next trick
  gameState.currentRound.currentPlayerId = winner.playerId;
  
  logger.game(`${winningPlayer.username} leads the next trick`);
  
  // Round completion logic is now handled in the setTimeout after display delay
  
  return trickWinnerInfo;
}

// Enhanced round scoring with bonus logic and per-round calculation
function calculateRoundScoresInGameState(gameState) {
  const SCORING = {
    ZERO_BID_POINTS: 10,
    TRICK_POINTS: 20,
    FAIL_PENALTY: -10
  };

  // Bonus points calculation (stub, expand as needed)
  function calculateBonusPoints(player) {
    let bonusPoints = 0;

    // Bonus for 14s
    if (player.capturedCards && Array.isArray(player.capturedCards)) {
      for (const card of player.capturedCards) {
        if (card.type === 'NUMBER' && card.value === 14) {
          if (card.suit === 'BLACK') {
            bonusPoints += 20; // 20 points for black 14
          } else if (card.suit && ['GREEN', 'PURPLE', 'YELLOW'].includes(card.suit)) {
            bonusPoints += 10; // 10 points for colored 14
          }
        }
      }
    }

    // Bonus for capture events
    if (player.captureEvents && Array.isArray(player.captureEvents)) {
      for (const event of player.captureEvents) {
        if (event.winnerId === player.id) {
          bonusPoints += getCaptureBonus(event.capturerType, event.capturedType);
        }
      }
    }

    return bonusPoints;
  }

  // Helper for capture event bonus
  function getCaptureBonus(capturerType, capturedType) {
    if (capturerType === 'MERMAID' && capturedType === 'SKULL_KING') return 40;
    if (capturerType === 'SKULL_KING' && capturedType === 'PIRATE') return 30;
    if (capturerType === 'PIRATE' && capturedType === 'MERMAID') return 20;
    return 0;
  }

  const roundNumber = gameState.currentRound.number;

  gameState.players = gameState.players.map(player => {
    const bid = player.bid || 0;
    const tricks = player.tricksWon;
    let roundScore = 0;

    if (bid === 0) {
      // Bid 0: 10 points per round number if successful, penalty if failed
      if (tricks === 0) {
        roundScore = SCORING.ZERO_BID_POINTS * roundNumber;
      } else {
        roundScore = SCORING.FAIL_PENALTY * roundNumber;
      }
    } else {
      // Normal bid: 20 points per trick if exact, penalty if failed
      if (tricks === bid) {
        roundScore = SCORING.TRICK_POINTS * bid;
        roundScore += calculateBonusPoints(player);
      } else {
        roundScore = SCORING.FAIL_PENALTY * Math.abs(tricks - bid);
      }
    }

    return {
      ...player,
      score: (player.score || 0) + roundScore,
      bid: null, // Reset for next round
      tricksWon: 0,
      isReady: false,
      captureEvents: [], // Reset for next round
      capturedCards: [] // Reset captured cards for next round
    };
  });
}

// Export the setup function for use in server.js
export { setupGameSocketHandlers };
export {
  createDeck,
  shuffleDeck,
  dealCards,
  resolveTrick,
  isValidPlay,
  calculateRoundScores
};