export interface GameRoom {
  id: string;
  name: string;
  host: string;
  players: string[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
}

export interface User {
  username: string;
  isConnected: boolean;
}
