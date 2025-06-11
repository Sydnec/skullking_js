import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SkullKingGameState, GameAction } from '@/types/skull-king';

interface UseGameSocketProps {
  roomId: string;
  userId: string;
  username: string;
}

interface UseGameSocketReturn {
  socket: Socket | null;
  gameState: SkullKingGameState | null;
  connected: boolean;
  hasJoined: boolean;
  joinGame: () => void;
  leaveGame: () => void;
  deleteRoom: () => void;
  sendGameAction: (action: Omit<GameAction, 'playerId'>) => void;
}

export function useGameSocket({ roomId, userId, username }: UseGameSocketProps): UseGameSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<SkullKingGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const joinAttemptRef = useRef(false);
  const currentRoomRef = useRef<string | null>(null);

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only initialize socket on client side
    if (!isMounted) return;
    
    // Determine socket URL based on environment
    // In production, use relative URL (same origin)
    // In development, use localhost with port
    const socketUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? '' // Use relative URL in production (same origin)
      : `http://localhost:${process.env.PORT || 3000}`;
    
    console.log('Connecting to socket at:', socketUrl || 'same origin');
    
    // Initialize socket connection
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });    socketInstance.on('connect', () => {
      console.log('Connected to socket server with ID:', socketInstance.id);
      setConnected(true);
      setHasJoined(false); // Reset join status on new connection
      joinAttemptRef.current = false; // Reset join attempt flag
    });

    socketInstance.on('disconnect', (reason: string) => {
      console.log('Disconnected from socket server, reason:', reason);
      setConnected(false);
      setHasJoined(false); // Reset join status on disconnect
      joinAttemptRef.current = false; // Reset join attempt flag
    });

    socketInstance.on('game-updated', (newGameState: SkullKingGameState) => {
      console.log('Game state updated:', newGameState);
      setGameState(newGameState);
    });    socketInstance.on('player-joined', (data: { userId: string; username: string }) => {
      console.log('Player joined:', data);
      // Set hasJoined to true if this is our user joining
      if (data.userId === userId) {
        console.log('Confirmed: We have successfully joined the game');
        setHasJoined(true);
      }
    });

    socketInstance.on('player-left', (data: { userId: string; username: string }) => {
      console.log('Player left:', data);
    });    socketInstance.on('join-success', (data: { gameState: SkullKingGameState }) => {
      console.log('Join success confirmed:', data);
      setHasJoined(true);
      joinAttemptRef.current = false; // Reset for potential future rejoins
      setGameState(data.gameState);
    });    socketInstance.on('join-rejected', (data: { reason: string; message: string }) => {
      console.log('Join rejected:', data);
      alert(data.message); // Show error to user
      // Optionally redirect back to lobby
      window.location.href = '/';
    });

    socketInstance.on('room-deleted', (data: { message: string }) => {
      console.log('Room deleted:', data);
      alert(data.message);
      // Redirect back to home
      window.location.href = '/';
    });

    socketInstance.on('game-error', (data: { type: string; message: string; action: string }) => {
      console.log('Game error received:', data);
      // Display error message to user
      alert(`Erreur de jeu: ${data.message}`);
    });

    socketInstance.on('trick-completed', (data: { winner: { playerId: string; playerName: string }; completedTrick: unknown }) => {
      console.log('Trick completed:', data);
      // Emit a custom event that the GameRoom component can listen to
      window.dispatchEvent(new CustomEvent('trickCompleted', { detail: data }));
    });

    socketInstance.on('error', (error: string) => {
      console.error('Socket error:', error);
    });

    setSocket(socketInstance);    return () => {
      socketInstance.close();
    };
  }, [userId, isMounted]);// Auto-join when connected and not yet joined
  useEffect(() => {
    // Reset join attempt when room changes
    if (currentRoomRef.current !== roomId) {
      currentRoomRef.current = roomId;
      joinAttemptRef.current = false;
      setHasJoined(false);
    }

    if (socket && connected && !hasJoined && !joinAttemptRef.current && roomId && userId && username) {
      console.log(`Auto-joining game room: ${roomId} as ${username} (${userId})`);
      joinAttemptRef.current = true; // Prevent multiple join attempts
      
      // Add a small delay to prevent immediate rejoin after disconnect
      const joinTimer = setTimeout(() => {
        if (socket && connected && !hasJoined && joinAttemptRef.current) {
          socket.emit('join-game', { roomId, userId, username });
        }
      }, 100);
      
      return () => clearTimeout(joinTimer);
    }
  }, [socket, connected, hasJoined, roomId, userId, username]);
  const joinGame = useCallback(() => {
    if (socket && connected && !hasJoined && !joinAttemptRef.current) {
      console.log(`Manually joining game room: ${roomId} as ${username}`);
      joinAttemptRef.current = true;
      socket.emit('join-game', { roomId, userId, username });
    }
  }, [socket, connected, hasJoined, roomId, userId, username]);

  const leaveGame = useCallback(() => {
    if (socket && connected && hasJoined) {
      console.log(`Leaving game room: ${roomId}`);
      socket.emit('leave-game', { roomId, userId });
      setHasJoined(false);
    }
  }, [socket, connected, hasJoined, roomId, userId]);
  const sendGameAction = useCallback((action: Omit<GameAction, 'playerId'>) => {
    if (socket && connected) {
      socket.emit('gameAction', {
        ...action,
        playerId: userId,
        roomId
      });
    }
  }, [socket, connected, userId, roomId]);

  const deleteRoom = useCallback(() => {
    if (socket && connected) {
      console.log(`Deleting room: ${roomId}`);
      socket.emit('delete-room', { roomId, userId });
      setHasJoined(false);
    }
  }, [socket, connected, roomId, userId]);

  return {
    socket,
    gameState,
    connected,
    hasJoined,
    joinGame,
    leaveGame,
    deleteRoom,
    sendGameAction
  };
}
