import { Server as HttpServer } from 'http';
import { NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@/generated/prisma';
import { SkullKingGameState, GameAction } from '@/types/skull-king';
import { SkullKingEngine } from './skull-king-engine';

const prisma = new PrismaClient();

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: HttpServer & {
      io: SocketIOServer;
    };
  };
};

export interface SocketUser {
  id: string;
  username: string;
  roomId?: string;
}

// Store active games in memory (in production, use Redis or database)
const activeGames = new Map<string, SkullKingGameState>();
const roomUsers = new Map<string, SocketUser[]>();

export function initializeSocketServer(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user joining
    socket.on('join', async (data: { userId: string; username: string }) => {
      const { userId, username } = data;
      
      socket.data.user = {
        id: userId,
        username,
        socketId: socket.id
      };

      console.log(`User ${username} (${userId}) joined`);
    });

    // Handle joining a room
    socket.on('join_room', async (data: { roomId: string; userId: string; username: string }) => {
      const { roomId, userId, username } = data;
      
      // Leave any previous room
      if (socket.data.user?.roomId) {
        socket.leave(socket.data.user.roomId);
        removeUserFromRoom(socket.data.user.roomId, userId);
      }

      // Join new room
      socket.join(roomId);
      socket.data.user = { ...socket.data.user, roomId };
      
      // Add user to room tracking
      addUserToRoom(roomId, { id: userId, username, roomId });

      // Get room users and game state
      const users = roomUsers.get(roomId) || [];
      let gameState = activeGames.get(roomId);

      // Initialize game if it doesn't exist and we have enough players
      if (!gameState && users.length >= 2) {
        const playerIds = users.map(u => u.id);
        const playerUsernames = users.map(u => u.username);
        gameState = SkullKingEngine.initializeGame(roomId, playerIds, playerUsernames);
        activeGames.set(roomId, gameState);
        
        // Save to database
        await saveGameState(roomId, gameState);
      }

      // Emit room state to all users in room
      io.to(roomId).emit('room_state', {
        users,
        gameState,
        canStartGame: users.length >= 2 && users.length <= 6
      });

      console.log(`User ${username} joined room ${roomId}`);
    });

    // Handle game actions
    socket.on('game_action', async (action: GameAction) => {
      const roomId = socket.data.user?.roomId;
      if (!roomId) return;

      let gameState = activeGames.get(roomId);
      if (!gameState) return;

      // Process game action
      try {
        gameState = processGameAction(gameState, action);
        activeGames.set(roomId, gameState);
        
        // Save to database
        await saveGameState(roomId, gameState);

        // Emit updated game state to all players in room
        io.to(roomId).emit('game_state_update', gameState);

        console.log(`Game action processed in room ${roomId}:`, action.type);
      } catch (error) {
        console.error('Error processing game action:', error);
        socket.emit('game_error', { message: 'Failed to process action' });
      }
    });

    // Handle starting the game
    socket.on('start_game', async (action: GameAction) => { // Modified to accept GameAction
      const roomId = socket.data.user?.roomId;
      const userId = socket.data.user?.id; // Get userId from socket data
      if (!roomId || !userId) return;

      let gameState = activeGames.get(roomId);
      // Ensure the user sending the start_game action is the creator
      if (!gameState || gameState.creatorId !== userId || gameState.roomStatus !== 'LOBBY') return;

      // Start first round by calling processGameAction with START_GAME
      try {
        gameState = processGameAction(gameState, { ...action, playerId: userId }); // Pass playerId
        activeGames.set(roomId, gameState);
        
        // Save to database
        await saveGameState(roomId, gameState);

        // Update room status in database
        await prisma.room.update({
          where: { code: roomId },
          data: { status: 'PLAYING' } // Ensure this matches your prisma schema enum if applicable
        });

        // Emit game started to all players
        io.to(roomId).emit('game_state_update', gameState); // Emit game_state_update for consistency
        console.log(`Game started in room ${roomId} by ${userId}`);
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('game_error', { message: 'Failed to start game' });
      }
    });

    // Handle leaving room
    socket.on('leave_room', () => {
      const roomId = socket.data.user?.roomId;
      const userId = socket.data.user?.id;
      
      if (roomId && userId) {
        socket.leave(roomId);
        removeUserFromRoom(roomId, userId);
        
        const users = roomUsers.get(roomId) || [];
        io.to(roomId).emit('room_state', {
          users,
          gameState: activeGames.get(roomId),
          canStartGame: users.length >= 2 && users.length <= 6
        });

        socket.data.user.roomId = undefined;
        console.log(`User ${userId} left room ${roomId}`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const user = socket.data.user;
      if (user?.roomId) {
        removeUserFromRoom(user.roomId, user.id);
        
        const users = roomUsers.get(user.roomId) || [];
        io.to(user.roomId).emit('room_state', {
          users,
          gameState: activeGames.get(user.roomId),
          canStartGame: users.length >= 2 && users.length <= 6
        });
      }
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
}

function addUserToRoom(roomId: string, user: SocketUser) {
  const users = roomUsers.get(roomId) || [];
  const existingUser = users.find(u => u.id === user.id);
  
  if (!existingUser) {
    users.push(user);
    roomUsers.set(roomId, users);
  }
}

function removeUserFromRoom(roomId: string, userId: string) {
  const users = roomUsers.get(roomId) || [];
  const filteredUsers = users.filter(u => u.id !== userId);
  
  if (filteredUsers.length === 0) {
    roomUsers.delete(roomId);
    activeGames.delete(roomId);
  } else {
    roomUsers.set(roomId, filteredUsers);
  }
}

function processGameAction(gameState: SkullKingGameState, action: GameAction): SkullKingGameState {
  switch (action.type) {
    case 'BID':
      if (action.payload?.bid !== undefined) {
        return SkullKingEngine.processBid(gameState, action.playerId, action.payload.bid);
      }
      break;

    case 'PLAY_CARD':
      if (action.payload?.cardId) {
        return SkullKingEngine.playCard(gameState, action.playerId, action.payload.cardId, action.payload.tigressChoice);
      }
      break;

    case 'START_GAME': // Added START_GAME case
      return SkullKingEngine.startRound(gameState, 1);
    case 'START_ROUND':
      const nextRound = (gameState.currentRound?.number || 0) + 1;
      return SkullKingEngine.startRound(gameState, nextRound);

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
  
  return gameState;
}

async function saveGameState(roomId: string, gameState: SkullKingGameState) {
  try {
    await prisma.gameData.upsert({
      where: { roomId },
      update: {
        currentRound: gameState.currentRound?.number || 1,
        maxRounds: gameState.maxRounds,        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gameState: gameState as any,
        updatedAt: new Date()
      },
      create: {
        roomId,
        currentRound: gameState.currentRound?.number || 1,
        maxRounds: gameState.maxRounds,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gameState: gameState as any,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}
