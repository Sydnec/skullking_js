export type Message = { id: string; userId: string | null; userName: string; text: string; createdAt: string };

export type RoomPlayer = { id: string; userId?: string | null; user?: { id?: string; name?: string }; userName?: string };

export type Room = {
  id: string;
  code: string;
  name?: string | null;
  ownerId?: string | null;
  owner?: { id?: string; name?: string } | null;
  players?: RoomPlayer[];
  maxPlayers?: number;
  status?: 'LOBBY' | 'RUNNING' | 'FINISHED' | string;
  settings?: Record<string, any>;
  __presentUserIds?: string[];
};
