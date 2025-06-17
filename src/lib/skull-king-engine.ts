import { Card, Player, Round, Trick, SkullKingGameState, CaptureEvent } from '@/types/skull-king';
import { shuffleDeck, createDeck, dealCards, resolveTrick, isValidPlay, calculateRoundScores } from '../../game-logic.js';

export class SkullKingEngine {
  /**
   * Create a complete deck for Skull King (70 cards)
   */
  static createDeck(): Card[] {
    return createDeck() as Card[];
  }

  /**
   * Shuffle a deck of cards
   */
  static shuffleDeck(deck: Card[]): Card[] {
    return shuffleDeck(deck) as Card[];
  }

  /**
   * Deal cards for a specific round
   */
  static dealCards(deck: Card[], players: Player[], roundNumber: number): { players: Player[], actualCardsDealt: number } {
    return dealCards(deck, players, roundNumber);
  }

  /**
   * Determine the winner of a trick and analyze capture events
   */
  static resolveTrick(trick: Trick): { winnerId: string; captureEvents: CaptureEvent[] } {
    return resolveTrick(trick) as { winnerId: string; captureEvents: CaptureEvent[] };
  }

  /**
   * Check if a card can be legally played
   */
  static isValidPlay(card: Card, trick: Trick, playerHand: Card[]): boolean {
    return isValidPlay(card, trick, playerHand);
  }

  /**
   * Initialize a new game state
   */
  static initializeGame(roomId: string, playerIds: string[], playerUsernames: string[]): SkullKingGameState {
    const players: Player[] = playerIds.map((id, index) => ({
      id,
      username: playerUsernames[index],
      cards: [],
      bid: null,
      tricksWon: 0,
      score: 0,
      isReady: false,
      captureEvents: []
    }));

    return {
      id: `game_${roomId}`,
      roomId,
      players,
      currentRound: null,
      maxRounds: 10,
      gamePhase: 'WAITING',
      winnerId: null,
      deck: this.createDeck(),
      createdAt: new Date(),
      updatedAt: new Date(),
      creatorId: playerIds[0], // Assuming the first player is the creator
      roomStatus: 'LOBBY' // Or another default status as defined in your types
    };
  }

  /**
   * Start a new round
   */
  static startRound(gameState: SkullKingGameState, roundNumber: number): SkullKingGameState {
    const { players } = this.dealCards(gameState.deck, gameState.players, roundNumber);
    
    // Reset player states for new round
    const resetPlayers = players.map(player => ({
      ...player,
      bid: null,
      tricksWon: 0,
      isReady: false,
      captureEvents: []
    }));

    const newRound: Round = {
      number: roundNumber,
      biddingPhase: true,
      playingPhase: false,
      completed: false,
      tricks: [],
      currentTrick: null,
      currentPlayerId: resetPlayers[0].id, // Start with first player
      dealerId: resetPlayers[0].id // Rotate dealer in real implementation
    };

    return {
      ...gameState,
      players: resetPlayers,
      currentRound: newRound,
      gamePhase: 'BIDDING',
      deck: gameState.deck, // Keep the existing deck
      updatedAt: new Date()
    };
  }

  /**
   * Process a player's bid
   */
  static processBid(gameState: SkullKingGameState, playerId: string, bid: number): SkullKingGameState {
    const currentRound = gameState.currentRound;
    if (!currentRound || !currentRound.biddingPhase) {
      throw new Error('Not in bidding phase');
    }

    const maxBid = currentRound.number;
    if (bid < 0 || bid > maxBid) {
      throw new Error(`Bid must be between 0 and ${maxBid}`);
    }

    // Update player's bid
    const updatedPlayers = gameState.players.map(player => {
      if (player.id === playerId) {
        return { ...player, bid, isReady: true };
      }
      return player;
    });

    // Check if all players have bid
    const allBidsDone = updatedPlayers.every(p => p.bid !== null);

    return {
      ...gameState,
      players: updatedPlayers,
      gamePhase: allBidsDone ? 'PLAYING' : 'BIDDING',
      currentRound: {
        ...currentRound,
        biddingPhase: !allBidsDone,
        playingPhase: allBidsDone
      },
      updatedAt: new Date()
    };
  }
  /**
   * Play a card
   */
  static playCard(gameState: SkullKingGameState, playerId: string, cardId: string, tigressChoice?: 'PIRATE' | 'ESCAPE'): SkullKingGameState {
    const currentRound = gameState.currentRound;
    if (!currentRound || !currentRound.playingPhase) {
      throw new Error('Not in playing phase');
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const card = player.cards.find(c => c.id === cardId);
    if (!card) {
      throw new Error('Card not found in player hand');
    }

    // Remove card from player's hand
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          cards: p.cards.filter(c => c.id !== cardId)
        };
      }
      return p;
    });

    // Add card to current trick
    const currentTrick = currentRound.currentTrick || {
      id: `trick_${currentRound.tricks.length + 1}`,
      cards: [],
      winnerId: null
    };

    // Create card entry with optional tigressChoice
    const cardEntry: { playerId: string; card: Card; tigressChoice?: 'PIRATE' | 'ESCAPE' } = {
      playerId,
      card
    };

    // Add tigress choice if it's a tigress card and choice is provided
    if (card.type === 'TIGRESS' && tigressChoice) {
      cardEntry.tigressChoice = tigressChoice;
    }

    const updatedTrick = {
      ...currentTrick,
      cards: [...currentTrick.cards, cardEntry]
    };    // Check if trick is complete (all players played)
    const trickComplete = updatedTrick.cards.length === gameState.players.length;
    let updatedRound: Round = { ...currentRound, currentTrick: updatedTrick };
    let updatedGameState = gameState;
    
    if (trickComplete) {
      // Resolve trick
      const { winnerId, captureEvents } = this.resolveTrick(updatedTrick);
      const completedTrick = { ...updatedTrick, winnerId };

      // Update player trick count and capture events
      const playersWithTricks = updatedPlayers.map(p => {
        if (p.id === winnerId) {
          const existingCaptureEvents = p.captureEvents || [];
          
          return { 
            ...p, 
            tricksWon: p.tricksWon + 1,
            captureEvents: [...existingCaptureEvents, ...captureEvents]
          };
        }
        return p;
      });

      updatedRound = {
        ...updatedRound,
        tricks: [...updatedRound.tricks, completedTrick],
        currentTrick: null,
        currentPlayerId: winnerId
      };

      // Check if round is complete
      const roundComplete = playersWithTricks.every(p => p.cards.length === 0);
      if (roundComplete) {
        // Calculate scores and move to next round
        const playersWithScores = this.calculateRoundScores(playersWithTricks, updatedRound.number);
        const nextRoundNumber = updatedRound.number + 1;
        
        if (nextRoundNumber > gameState.maxRounds) {
          // Game complete
          const winner = this.determineGameWinner(playersWithScores);
          updatedGameState = {
            ...gameState,
            players: playersWithScores,
            currentRound: { ...updatedRound, completed: true },
            gamePhase: 'GAME_END',
            winnerId: winner.id
          };
        } else {
          // Start next round
          updatedGameState = this.startRound({
            ...gameState,
            players: playersWithScores,
            currentRound: { ...updatedRound, completed: true }
          }, nextRoundNumber);
        }
      } else {
        updatedGameState = {
          ...gameState,
          players: playersWithTricks,
          currentRound: updatedRound
        };
      }
    } else {
      // Continue trick
      updatedGameState = {
        ...gameState,
        players: updatedPlayers,
        currentRound: updatedRound
      };
    }

    return {
      ...updatedGameState,
      updatedAt: new Date()
    };
  }

  /**
   * Calculate scores for a completed round
   */
  static calculateRoundScores(players: Player[], roundNumber: number): Player[] {
    return calculateRoundScores(players, roundNumber);
  }

  /**
   * Determine game winner
   */
  private static determineGameWinner(players: Player[]): Player {
    return players.reduce((winner, player) => 
      player.score > winner.score ? player : winner
    );
  }

  /**
   * Force game to end state for testing purposes
   */
  static forceGameEnd(gameState: SkullKingGameState): SkullKingGameState {
    // Simulate final scores
    const finalPlayers = gameState.players.map(player => ({
      ...player,
      score: Math.floor(Math.random() * 200) + 50 // Random scores between 50-250
    }));
    
    const winner = finalPlayers.reduce((prev, current) => 
      (current.score > prev.score) ? current : prev
    );
    
    return {
      ...gameState,
      players: finalPlayers,
      gamePhase: 'GAME_END' as const,
      winnerId: winner.id,
      currentRound: {
        ...gameState.currentRound!,
        number: 10,
        completed: true
      },
      maxRounds: 10
    };
  }
}
