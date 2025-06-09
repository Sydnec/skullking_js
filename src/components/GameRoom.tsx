'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/api';
import { Player, Card } from '@/types/skull-king';
import { useGameSocket } from '@/hooks/useGameSocket';
import ConfirmDialog from './ConfirmDialog';

interface GameRoomProps {
  user: User;
  roomId: string;
  onLeaveRoom: () => void;
}

export default function GameRoom({ user, roomId, onLeaveRoom }: GameRoomProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const leaveGameRef = useRef<(() => void) | null>(null);const { 
    gameState, 
    connected, 
    hasJoined,
    leaveGame, 
    deleteRoom,
    sendGameAction 
  } = useGameSocket({
    roomId,
    userId: user.id,
    username: user.username
  });// Store the leaveGame function in ref to avoid dependency issues
  leaveGameRef.current = leaveGame;

  useEffect(() => {
    // Only leave the game when component actually unmounts (page navigation)
    return () => {
      console.log('GameRoom component unmounting, leaving game...');
      if (leaveGameRef.current) {
        leaveGameRef.current();
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount
  const handleStartGame = () => {
    if (!gameState || !currentPlayer) return;
    
    // Send start game action through socket
    sendGameAction({
      type: 'START_GAME',
      payload: {}
    });
  };
  const handleDeleteRoom = () => {
    if (!gameState || !currentPlayer) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRoom = () => {
    deleteRoom();
    setShowDeleteConfirm(false);
  };

  const cancelDeleteRoom = () => {
    setShowDeleteConfirm(false);
  };

  const handleLeaveRoom = () => {
    if (!gameState || !currentPlayer) return;
    
    if (currentPlayer.id === gameState.creatorId) {
      // Creator should delete the room, not just leave
      handleDeleteRoom();
    } else {
      // Regular players can leave
      leaveGame();
      onLeaveRoom();
    }
  };

  const currentPlayer = gameState?.players.find((p: Player) => p.id === user.id);
  const currentRound = gameState?.currentRound;

  const handleBid = () => {
    if (!gameState || !currentRound || !currentPlayer) return;
    
    // Send bid action through socket
    sendGameAction({
      type: 'BID',
      payload: { bid: bidAmount }
    });
  };

  const handlePlayCard = (card: Card) => {
    if (!gameState || !currentRound || !currentPlayer) return;
    
    // Send play card action through socket
    sendGameAction({
      type: 'PLAY_CARD',
      payload: { cardId: card.id }
    });

    setSelectedCard(null);
  };
  const getCardDisplay = (card: Card) => {
    const colors = {
      'BLACK': 'bg-gray-800 text-white',
      'RED': 'bg-red-600 text-white',
      'BLUE': 'bg-blue-600 text-white',
      'YELLOW': 'bg-yellow-500 text-black',
      'NUMBER': 'bg-gray-200 text-black',
      'PIRATE': 'bg-purple-600 text-white',
      'SKULL_KING': 'bg-black text-yellow-400',
      'MERMAID': 'bg-cyan-500 text-white',
      'ESCAPE': 'bg-gray-400 text-black',
      'LOOT': 'bg-amber-600 text-white'
    };

    const colorKey = card.suit ?? card.type;
    const colorClass = colors[colorKey as keyof typeof colors] ?? 'bg-gray-200 text-black';
    
    return (
      <div
        key={card.id}
        className={`w-16 h-24 rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center text-xs font-bold cursor-pointer transition-transform hover:scale-105 ${colorClass} ${
          selectedCard?.id === card.id ? 'ring-4 ring-blue-400' : ''
        }`}
        onClick={() => setSelectedCard(card)}
      >
        <div className="text-center">
          {card.value ? card.value : card.type.slice(0, 3)}
        </div>
        {card.suit && (
          <div className="text-xs mt-1">
            {card.suit.slice(0, 1)}
          </div>
        )}
      </div>
    );
  };  if (!gameState || !currentPlayer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center max-w-md w-full mx-4">
          <div className="text-lg font-semibold mb-4">
            {!connected ? 'Connexion au serveur...' : 
             !hasJoined ? 'Entrée dans la partie...' : 
             'Chargement du jeu...'}
          </div>
          
          <div className="space-y-2 mb-4">
            <div className={`text-sm flex items-center justify-center gap-2 ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? '🟢' : '🔴'} 
              {connected ? 'Connecté au serveur' : 'Déconnecté du serveur'}
            </div>
            
            {connected && (
              <div className={`text-sm flex items-center justify-center gap-2 ${hasJoined ? 'text-green-600' : 'text-yellow-600'}`}>
                {hasJoined ? '🎮' : '⏳'} 
                {hasJoined ? `Dans la salle ${roomId}` : `Connexion à la salle ${roomId}...`}
              </div>
            )}
            
            {connected && hasJoined && !gameState && (
              <div className="text-sm text-blue-600 flex items-center justify-center gap-2">
                📥 Synchronisation du jeu...
              </div>
            )}
          </div>
          
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>          {!connected && (
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Actualiser la page
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Skull King - Room {roomId}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {gameState.roomStatus === 'LOBBY' ? (
                `Lobby - ${gameState.players.length} joueur(s) connecté(s)`
              ) : (
                `Round ${currentRound?.number || 1} - ${gameState.gamePhase}`
              )}
            </p>
          </div>          <div className="flex items-center gap-4">
            <div className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
            {currentPlayer?.id === gameState.creatorId ? (
              <button
                onClick={handleDeleteRoom}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                🗑️ Supprimer la room
              </button>
            ) : (
              <button
                onClick={handleLeaveRoom}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Quitter la room
              </button>
            )}
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Players */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Players</h2>
            <div className="space-y-2">
              {gameState.players.map((player: Player) => (
                <div
                  key={player.id}
                  className={`p-3 rounded-lg ${
                    player.id === user.id ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                >                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {player.username} {player.id === user.id && '(You)'}
                      {player.id === gameState.creatorId && ' 👑'}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {gameState.roomStatus === 'LOBBY' ? (
                        player.isOnline ? 'En ligne' : 'Hors ligne'
                      ) : (
                        `Score: ${player.score}`
                      )}
                    </span>
                  </div>
                  {gameState.roomStatus !== 'LOBBY' && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Bid: {player.bid ?? 'Not set'} | Tricks: {player.tricksWon} | Cards: {player.cards.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>          {/* Current Trick - Only show during game */}
          {gameState.roomStatus === 'GAME_STARTED' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Current Trick</h2>
              <div className="flex flex-wrap gap-2 justify-center">
                {currentRound?.currentTrick?.cards.map(({ playerId, card }: { playerId: string; card: Card }) => {
                  const player = gameState.players.find((p: Player) => p.id === playerId);
                  return (
                    <div key={`${playerId}_${card.id}`} className="text-center">
                      <div className="text-xs mb-1 text-gray-600 dark:text-gray-400">
                        {player?.username}
                      </div>
                      {getCardDisplay(card)}
                    </div>
                  );
                }) || <div className="text-gray-500 dark:text-gray-400">No cards played yet</div>}
              </div>
            </div>
          )}

          {/* Lobby Info - Only show in lobby */}
          {gameState.roomStatus === 'LOBBY' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Information du Lobby</h2>
              <div className="space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Code de la room:</span> {roomId}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Créateur:</span> {gameState.players.find(p => p.id === gameState.creatorId)?.username}
                </div>                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Joueurs connectés:</span> {gameState.players.length}/{gameState.settings?.maxPlayers || 8}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  En attente du démarrage de la partie...
                </div>
              </div>
            </div>
          )}

          {/* Game Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Actions</h2>
            
            {gameState.roomStatus === 'LOBBY' && (
              <div className="space-y-3">
                <div className="text-center text-gray-600 dark:text-gray-400 mb-4">
                  En attente dans le lobby...
                </div>
                
                {currentPlayer?.id === gameState.creatorId ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      Vous êtes le créateur de cette partie
                    </div>
                    {gameState.players.length >= 2 ? (
                      <button
                        onClick={handleStartGame}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                      >
                        🚀 Démarrer la partie ({gameState.players.length} joueurs)
                      </button>
                    ) : (
                      <div className="text-center text-orange-600 dark:text-orange-400 text-sm">
                        Il faut au moins 2 joueurs pour commencer
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-600 dark:text-gray-400">
                    En attente que {gameState.players.find(p => p.id === gameState.creatorId)?.username} démarre la partie...
                  </div>
                )}
              </div>
            )}
            
            {gameState.roomStatus === 'GAME_STARTED' && gameState.gamePhase === 'BIDDING' && !currentPlayer.isReady && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your Bid (0-{currentRound?.number || 1}):
                </label>
                <input
                  type="number"
                  min="0"
                  max={currentRound?.number || 1}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleBid}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Submit Bid
                </button>
              </div>
            )}

            {gameState.roomStatus === 'GAME_STARTED' && gameState.gamePhase === 'PLAYING' && selectedCard && (
              <button
                onClick={() => handlePlayCard(selectedCard)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Play {selectedCard.name}
              </button>
            )}

            {gameState.roomStatus === 'GAME_STARTED' && gameState.gamePhase === 'BIDDING' && currentPlayer.isReady && (
              <div className="text-center text-gray-600 dark:text-gray-400">
                Waiting for other players to bid...
              </div>
            )}
          </div>
        </div>

        {/* Player Hand */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Your Hand</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {currentPlayer.cards.map((card: Card) => getCardDisplay(card))}
          </div>
          {currentPlayer.cards.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No cards in hand
            </div>
          )}        </div>
      </div>

      {/* Confirmation Dialog for Room Deletion */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Supprimer la room"
        message="Êtes-vous sûr de vouloir supprimer cette room ? Tous les joueurs seront expulsés et la partie sera définitivement fermée."
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        onConfirm={confirmDeleteRoom}
        onCancel={cancelDeleteRoom}
      />
    </div>
  );
}
