'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RoomService, Room, User } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

interface GameLobbyProps {
  user: User;
  onLogout: () => void;
}

export default function GameLobby({ user, onLogout }: GameLobbyProps) {
  const [gameCode, setGameCode] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const router = useRouter();
  const isMountedRef = useRef(true);  // Load rooms on component mount and set up auto-refresh
  useEffect(() => {
    isMountedRef.current = true;
    loadRooms();
    
    // Set up auto-refresh every 5 seconds
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        loadRooms();
      }
    }, 5000);
    
    // Cleanup interval on unmount
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // Set up socket connection for real-time room updates
  useEffect(() => {
    const socketInstance = io(`http://localhost:${process.env.PORT || 3000}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    socketInstance.on('connect', () => {
      console.log('GameLobby: Connected to socket server');
    });

    socketInstance.on('room-list-updated', (data: { action: string; roomId: string }) => {
      console.log('GameLobby: Room list updated:', data);
      // Immediately refresh the room list when notified
      if (isMountedRef.current) {
        loadRooms();
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);const loadRooms = async () => {
    // Only proceed if component is still mounted
    if (!isMountedRef.current) return;
    
    try {
      setIsLoadingRooms(true);
      const response = await RoomService.getRooms();
      
      // Check again if component is still mounted before updating state
      if (isMountedRef.current) {
        setRooms(response.rooms);
        // Clear any previous errors on successful load
        setError('');
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      // Only show error if component is still mounted and it's not a network error during unmount
      if (isMountedRef.current && error instanceof Error && !error.message.includes('AbortError')) {
        setError('Erreur lors du chargement des rooms');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingRooms(false);
      }
    }
  };const handleCreateGame = async () => {
    setIsCreatingGame(true);
    try {
      console.log('Creating room for user:', user);
      
      // Ensure user session is saved before navigation
      localStorage.setItem('lastUsername', user.username);
      localStorage.setItem('lastUserId', user.id);
      
      const response = await RoomService.createRoom(user.id);
      console.log('Room created:', response.room);
      
      // Navigate to the room page
      router.push(`/${response.room.id}`);
    } catch (error) {
      setError('Erreur lors de la création de la partie');
      console.error('Error creating room:', error);
    } finally {
      setIsCreatingGame(false);
    }
  };const handleJoinGame = async () => {
    if (!gameCode.trim() || gameCode.length !== 6) {
      setError('Veuillez entrer un code de partie valide (6 caractères)');
      return;
    }

    // Check if user is already in this room
    const existingRoom = rooms.find(r => r.id === gameCode);
    if (existingRoom && existingRoom.players.includes(user.username)) {
      setError('Vous êtes déjà dans cette partie');
      return;
    }    setIsJoiningGame(true);
    try {
      console.log('Joining room for user:', user);
      
      // Ensure user session is saved before navigation
      localStorage.setItem('lastUsername', user.username);
      localStorage.setItem('lastUserId', user.id);
      
      const response = await RoomService.joinRoom(gameCode, user.id);
      console.log('Joined room:', response.room);
      
      // Navigate to the room page
      router.push(`/${response.room.id}`);
      setGameCode('');
    } catch (error) {
      setError('Erreur lors de la connexion à la partie');
      console.error('Error joining room:', error);
    } finally {
      setIsJoiningGame(false);
    }
  };  const handleJoinRoom = async (roomCode: string) => {
    // Check if user is already in this room
    const room = rooms.find(r => r.id === roomCode);
    if (room && room.players.includes(user.username)) {
      setError('Vous êtes déjà dans cette partie');
      return;
    }    try {
      console.log('Joining room directly for user:', user);
      
      // Ensure user session is saved before navigation
      localStorage.setItem('lastUsername', user.username);
      localStorage.setItem('lastUserId', user.id);
      
      const response = await RoomService.joinRoom(roomCode, user.id);
      console.log('Joined room directly:', response.room);
      
      // Navigate to the room page
      router.push(`/${response.room.id}`);
    } catch (error) {
      setError('Erreur lors de la connexion à la partie');
      console.error('Error joining room:', error);
    }
  };
  // Helper function to check if user is already in a room
  const isUserInRoom = (room: Room): boolean => {
    return room.players.includes(user.username);
  };

  const getStatusBadge = (status: Room['status']) => {
    const colors = {
      waiting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      playing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      finished: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };

    const labels = {
      waiting: 'En attente',
      playing: 'En cours',
      finished: 'Terminée',
    };    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Skull King Online</h1>
          <p className="text-gray-600 dark:text-gray-400">Bienvenue, {user.username}!</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Jeu de 2 à 8 joueurs</p>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Se déconnecter
        </button>      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button 
            onClick={() => setError('')}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Actions Panel */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Actions</h2>            {/* Create Game */}
            <div className="mb-6">
              <button
                onClick={handleCreateGame}
                disabled={isCreatingGame}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                {isCreatingGame ? 'Création...' : 'Créer une partie'}
              </button>
            </div>

            {/* Join Game */}
            <div className="space-y-3">
              <label htmlFor="gameCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rejoindre une partie
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  id="gameCode"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center font-mono"
                />
                <button
                  onClick={handleJoinGame}
                  disabled={isJoiningGame}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {isJoiningGame ? '...' : 'Rejoindre'}
                </button>
              </div>
            </div>
          </div>
        </div>        {/* Rooms List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Parties disponibles</h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isLoadingRooms ? 'Actualisation...' : 'Actualisation automatique'}
            </div>
          </div>
          
          <div className="space-y-3">
            {isLoadingRooms ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Chargement...
              </p>
            ) : rooms.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Aucune partie disponible
              </p>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Partie {room.id}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Hôte: {room.host} • Code: {room.id}
                      </p>
                    </div>
                    {getStatusBadge(room.status)}
                  </div>
                    <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {room.players.length}/{room.maxPlayers} joueurs
                    </span>
                      {room.status === 'waiting' && (                      isUserInRoom(room) ? (
                        <button
                          onClick={() => {
                            // Ensure user session is saved before navigation
                            localStorage.setItem('lastUsername', user.username);
                            localStorage.setItem('lastUserId', user.id);
                            router.push(`/${room.id}`);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-1 px-3 rounded transition-colors duration-200"
                        >
                          Rejoindre la partie
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-3 rounded transition-colors duration-200"
                        >
                          Rejoindre
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
