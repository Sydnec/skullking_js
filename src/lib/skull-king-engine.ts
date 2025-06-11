import { Card, CardSuit, CardType, Player, Round, Trick, SkullKingGameState, SCORING, CaptureEvent } from '@/types/skull-king';

export class SkullKingEngine {
  /**
   * Create a complete deck for Skull King (70 cards)
   */
  static createDeck(): Card[] {
    const deck: Card[] = [];
    
    // Number cards (1-14 in each of 4 suits = 56 cards)
    const suits: CardSuit[] = ['BLACK', 'GREEN', 'PURPLE', 'YELLOW'];
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
  static shuffleDeck(deck: Card[]): Card[] {
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
  static dealCards(deck: Card[], players: Player[], roundNumber: number): { players: Player[], remainingDeck: Card[] } {
    const cardsPerPlayer = roundNumber;
    const shuffled = this.shuffleDeck(deck);
    const updatedPlayers = [...players];
    
    let cardIndex = 0;
    
    // Deal cards to each player
    updatedPlayers.forEach(player => {
      player.cards = shuffled.slice(cardIndex, cardIndex + cardsPerPlayer);
      cardIndex += cardsPerPlayer;
    });
    
    return {
      players: updatedPlayers,
      remainingDeck: shuffled.slice(cardIndex)
    };
  }

  /**
   * Determine the winner of a trick and analyze capture events
   */
  static resolveTrick(trick: Trick): { winnerId: string; captureEvents: CaptureEvent[] } {
    if (trick.cards.length === 0) return { winnerId: '', captureEvents: [] };
    
    const captureEvents: CaptureEvent[] = [];
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
      
      for (const pirate of pirateCards) {
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
        for (const mermaid of mermaidCards) {
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
   * Calculate score for a player in a round
   */
  static calculateRoundScore(player: Player, roundNumber: number): number {
    const bid = player.bid || 0;
    const tricksWon = player.tricksWon;
    
    if (bid === 0) {
      // Zero bid: 10 points per round if successful
      if (tricksWon === 0) {
        return SCORING.ZERO_BID_POINTS * roundNumber;
      } else {
        return SCORING.FAIL_PENALTY * tricksWon;
      }
    } else {
      // Regular bid
      if (tricksWon === bid) {
        // Made exact bid: 20 per trick + bonus points
        let score = tricksWon * SCORING.TRICK_POINTS;
        
        // Add bonus points (only if bid is successful)
        score += this.calculateBonusPoints(player);
        
        return score;
      } else {
        // Failed bid: -10 per trick difference (no bonus points)
        return SCORING.FAIL_PENALTY * Math.abs(tricksWon - bid);
      }
    }
  }

  /**
   * Calculate bonus points for a player (14 cards + capture events)
   */
  private static calculateBonusPoints(player: Player): number {
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
          bonusPoints += this.getCaptureBonus(event.capturerType, event.capturedType);
        }
      }
    }
    
    return bonusPoints;
  }

  /**
   * Get bonus points for a specific capture combination
   */
  private static getCaptureBonus(capturerType: CardType, capturedType: CardType): number {
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
   * Check if a card can be legally played
   */
  static isValidPlay(card: Card, trick: Trick, playerHand: Card[]): boolean {
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
    const { players, remainingDeck } = this.dealCards(gameState.deck, gameState.players, roundNumber);
    
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
      deck: remainingDeck,
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
        const playersWithScores = this.calculateRoundScores(playersWithTricks);
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
  static calculateRoundScores(players: Player[]): Player[] {
    return players.map(player => {
      const bid = player.bid || 0;
      const tricks = player.tricksWon;
      let roundScore = 0;

      if (bid === 0) {
        // Bid 0: 10 points per player + 10 if successful
        if (tricks === 0) {
          roundScore = 10 * players.length + 10;
        } else {
          roundScore = -10 * tricks;
        }
      } else {
        // Normal bid: 20 points per trick if exact, -10 per difference
        if (tricks === bid) {
          roundScore = SCORING.TRICK_POINTS * bid;
          
          // Add bonus points (only if bid is successful)
          roundScore += this.calculateBonusPoints(player);
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
