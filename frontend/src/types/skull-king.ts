// Skull King Game Types

export type CardSuit = 'BLACK' | 'GREEN' | 'PURPLE' | 'YELLOW';
export type CardType = 'NUMBER' | 'SKULL_KING' | 'PIRATE' | 'MERMAID' | 'TIGRESS' | 'ESCAPE';

export interface Card {
  id: string;
  type: CardType;
  suit?: CardSuit; // Only for number cards
  value?: number; // 1-14 for number cards, undefined for special cards
  name: string;
}

export interface Player {
  id: string;
  username: string;
  cards: Card[];
  bid: number | null; // Player's bid for current round
  tricksWon: number;
  score: number;
  isReady: boolean;
  isOnline?: boolean; // Optional field for online status
  captureEvents?: CaptureEvent[]; // Capture events for bonus calculation
}

// Spectator interface for users watching the game
export interface Spectator {
  id: string;
  username: string;
  isOnline: boolean;
  joinedAt: Date;
}

// Capture event for bonus calculation
export interface CaptureEvent {
  capturerType: CardType; // What captured
  capturedType: CardType; // What was captured
  winnerId: string; // Who won the trick
}

export interface Trick {
  id: string;
  cards: { playerId: string; card: Card; tigressChoice?: 'PIRATE' | 'ESCAPE' }[];
  winnerId: string | null;
  leadSuit?: CardSuit;
}

export interface Round {
  number: number;
  biddingPhase: boolean;
  playingPhase: boolean;
  completed: boolean;
  tricks: Trick[];
  currentTrick: Trick | null;
  currentPlayerId: string | null;
  dealerId: string;
}

// Chat system types
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'USER' | 'SYSTEM';
  roomId: string;
}

export interface SkullKingGameState {
  id: string;
  roomId: string;
  players: Player[];
  spectators?: Spectator[]; // Spectators watching the game
  creatorId: string; // ID du créateur de la room
  roomStatus: 'LOBBY' | 'GAME_STARTED' | 'GAME_ENDED'; // Statut de la room
  currentRound: Round | null;
  maxRounds: number;
  gamePhase: 'WAITING' | 'BIDDING' | 'PLAYING' | 'ROUND_END' | 'GAME_END';
  winnerId: string | null;
  deck: Card[];
  settings?: {
    maxPlayers: number;
    roundsToPlay: number;
  };
  createdAt: Date;
  updatedAt: Date;
  // Chat messages for the room
  chatMessages?: ChatMessage[];
}

export interface GameAction {
  type: 'BID' | 'PLAY_CARD' | 'START_GAME' | 'START_ROUND' | 'END_ROUND' | 'SEND_CHAT_MESSAGE';
  playerId: string;
  payload?: {
    bid?: number;
    cardId?: string;
    tigressChoice?: 'PIRATE' | 'ESCAPE';
    message?: string; // For chat messages
  };
}

// Scoring constants
export const SCORING = {
  TRICK_POINTS: 20, // Points per trick when bid is successful
  FAIL_PENALTY: -10, // Penalty per trick difference when failing bid
  ZERO_BID_POINTS: 10, // Bonus per round for successful zero bid
  
  // Bonus points (only when bid is successful)
  COLORED_14_BONUS: 10, // Bonus per colored 14 (Green, Purple, Yellow) in hand at end of round
  BLACK_14_BONUS: 20, // Bonus for black 14 (Pirate Flag) in hand at end of round
  MERMAID_CAPTURED_BY_PIRATE_BONUS: 20, // Bonus for mermaid captured by pirate
  PIRATE_CAPTURED_BY_SKULL_KING_BONUS: 30, // Bonus for pirate captured by Skull King
  SKULL_KING_CAPTURED_BY_MERMAID_BONUS: 40, // Bonus for Skull King captured by mermaid
} as const;

// Card hierarchy for trick resolution
export const CARD_POWER = {
  ESCAPE: 0,
  NUMBER: 1,
  PIRATE: 2,
  SKULL_KING: 3,
  MERMAID: 4,
} as const;
