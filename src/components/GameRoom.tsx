'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/api';
import { Player, Card } from '@/types/skull-king';
import { useGameSocket } from '@/hooks/useGameSocket';
import ConfirmDialog from './ConfirmDialog';
import CardImage from './CardImage';
import Scoreboard from './Scoreboard';

interface GameRoomProps {
  user: User;
  roomId: string;
  onLeaveRoom: () => void;
}

export default function GameRoom({ user, roomId, onLeaveRoom }: GameRoomProps) {
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [trickWinner, setTrickWinner] = useState<{ playerName: string; playerId: string } | null>(null);
  const [showTigressChoice, setShowTigressChoice] = useState<boolean>(false);
  const [pendingTigressCard, setPendingTigressCard] = useState<Card | null>(null);
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
      if (leaveGameRef.current) {
        leaveGameRef.current();
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Listen for trick completion events
  useEffect(() => {
    const handleTrickCompleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { winner } = customEvent.detail;
      
      // Show winner notification
      setTrickWinner(winner);
      
      // Hide after 3 seconds
      setTimeout(() => {
        setTrickWinner(null);
      }, 3000);
    };

    window.addEventListener('trickCompleted', handleTrickCompleted);
    
    return () => {
      window.removeEventListener('trickCompleted', handleTrickCompleted);
    };
  }, []);
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
    
    // Check if it's a Tigress card - ask player to choose behavior
    if (card.type === 'TIGRESS') {
      setPendingTigressCard(card);
      setShowTigressChoice(true);
      return;
    }
    
    // Send play card action through socket
    sendGameAction({
      type: 'PLAY_CARD',
      payload: { cardId: card.id }
    });
  };

  const handleTigressChoice = (choice: 'PIRATE' | 'ESCAPE') => {
    if (!pendingTigressCard) return;
    
    // Send play card action with Tigress choice
    sendGameAction({
      type: 'PLAY_CARD',
      payload: { 
        cardId: pendingTigressCard.id,
        tigressChoice: choice 
      }
    });
    
    // Reset states
    setShowTigressChoice(false);
    setPendingTigressCard(null);
  };
  const getCardDisplay = (card: Card) => {
    // Check if it's the player's turn and in playing phase
    const isMyTurn = gameState?.gamePhase === 'PLAYING' && 
                    gameState?.currentRound && 
                    currentPlayer && 
                    gameState.currentRound.currentPlayerId === currentPlayer.id;
    
    const canPlayCard = isMyTurn && gameState?.roomStatus === 'GAME_STARTED';
    
    // Check if this card has been played in the current trick
    const hasBeenPlayedInCurrentTrick = gameState?.currentRound?.currentTrick?.cards.some(
      playedCard => playedCard.playerId === currentPlayer?.id && playedCard.card.id === card.id
    ) || false;
    
    // Debug logging when it's my turn
    // Removed debug logging for better performance
    
    return (
      <CardImage
        key={card.id}
        card={card}
        className={`w-16 h-24 ${hasBeenPlayedInCurrentTrick ? 'opacity-50 cursor-not-allowed' : ''}`}
        isPlayable={canPlayCard && !hasBeenPlayedInCurrentTrick ? true : false}
        onClick={() => {
          if (canPlayCard && !hasBeenPlayedInCurrentTrick) {
            handlePlayCard(card);
          }
        }}
      />
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

  // Si le jeu est terminé, afficher le scoreboard
  if (gameState?.gamePhase === 'GAME_END') {
    const winner = gameState.players.reduce((prev, current) => 
      (current.score > prev.score) ? current : prev
    );
    
    const handleReturnToLobby = () => {
      // Si l'utilisateur est le créateur de la room, supprimer la room
      // Sinon, juste quitter la room
      if (currentPlayer?.id === gameState.creatorId) {
        deleteRoom();
      } else {
        leaveGame();
      }
      onLeaveRoom();
    };
    
    return (
      <Scoreboard
        players={gameState.players}
        winner={winner}
        onReturnToLobby={handleReturnToLobby}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Trick Winner Notification */}
        {trickWinner && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <span className="font-semibold">
                {trickWinner.playerName === user.username ? 'Vous avez' : `${trickWinner.playerName} a`} remporté le pli !
              </span>
            </div>
          </div>
        )}

        {/* Header */}
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
                      <div>
                        Pari: {player.bid !== null ? `${player.bid} pli(s)` : '⏳ En attente'} | 
                        Plis remportés: {player.tricksWon} | 
                        Cartes: {player.cards.length}
                      </div>
                      {gameState.gamePhase === 'BIDDING' && player.bid !== null && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✅ Pari placé
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>          {/* Current Trick - Only show during game */}
          {gameState.roomStatus === 'GAME_STARTED' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Current Trick</h2>
              
              {/* Turn indicator for PLAYING phase */}
              {gameState.gamePhase === 'PLAYING' && gameState.currentRound?.currentPlayerId && (
                <div className="mb-4 text-center">
                  {(() => {
                    const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentRound?.currentPlayerId);
                    const isMyTurn = currentTurnPlayer?.id === currentPlayer?.id;
                    return (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                        isMyTurn 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-2 border-green-400' 
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}>
                        <span className="text-lg">{isMyTurn ? '👆' : '⏳'}</span>
                        <span>
                          {isMyTurn ? 'À votre tour !' : `Tour de ${currentTurnPlayer?.username}`}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 justify-center">
                {currentRound?.currentTrick?.cards.map(({ playerId, card, tigressChoice }: { playerId: string; card: Card; tigressChoice?: 'PIRATE' | 'ESCAPE' }) => {
                  const player = gameState.players.find((p: Player) => p.id === playerId);
                  return (
                    <div key={`${playerId}_${card.id}`} className="text-center">
                      <div className="text-xs mb-1 text-gray-600 dark:text-gray-400">
                        {player?.username}
                      </div>
                      <CardImage 
                        card={card} 
                        className="w-16 h-24"
                        tigressChoice={tigressChoice}
                      />
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
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-full mb-3">
                    <span className="text-lg">🎯</span>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      Round {currentRound?.number || 1} - Phase de Paris
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pariez sur le nombre de plis que vous pensez remporter
                  </p>
                  
                  {/* Information sur qui commence la manche */}
                  {gameState.currentRound?.currentPlayerId && (
                    <div className="mt-3 text-center">
                      <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-700">
                        <span className="text-lg">🎮</span>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          {(() => {
                            const startingPlayer = gameState.players.find(p => p.id === gameState.currentRound?.currentPlayerId);
                            return startingPlayer?.id === currentPlayer?.id 
                              ? "Vous commencerez cette manche !" 
                              : `${startingPlayer?.username} commencera cette manche`;
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-700">
                    <span className="text-xl">🎲</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Votre pari sélectionné
                      </p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {bidAmount} pli{bidAmount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={`grid gap-2 ${
                  (currentRound?.number || 1) <= 8 
                    ? 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6' 
                    : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
                }`}>
                  {Array.from({ length: (currentRound?.number || 1) + 1 }, (_, index) => {
                    return (
                      <button
                        key={index}
                        onClick={() => setBidAmount(index)}
                        className={`py-3 px-3 rounded-lg font-bold text-xl transition-all duration-200 ${
                          bidAmount === index
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-opacity-50 transform scale-105 shadow-lg'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-102 hover:shadow-md'
                        }`}
                      >
                        {index}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={handleBid}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">🎯</span>
                    <span>Confirmer le pari de {bidAmount} pli{bidAmount > 1 ? 's' : ''}</span>
                  </div>
                </button>
              </div>
            )}

            {gameState.roomStatus === 'GAME_STARTED' && gameState.gamePhase === 'BIDDING' && currentPlayer.isReady && (
              <div className="text-center text-gray-600 dark:text-gray-400">
                <div className="mb-2">
                  ✅ Votre pari a été placé : <span className="font-semibold">{currentPlayer.bid} pli(s)</span>
                </div>
                
                {/* Information sur qui commence la manche */}
                {gameState.currentRound?.currentPlayerId && (
                  <div className="mb-3">
                    <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-700">
                      <span className="text-lg">🎮</span>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        {(() => {
                          const startingPlayer = gameState.players.find(p => p.id === gameState.currentRound?.currentPlayerId);
                          return startingPlayer?.id === currentPlayer?.id 
                            ? "Vous commencerez cette manche !" 
                            : `${startingPlayer?.username} commencera cette manche`;
                        })()}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="text-sm">
                  En attente des autres joueurs...
                  <div className="mt-2">
                    {gameState.players.map((player: Player) => (
                      <div key={player.id} className="text-xs flex justify-between items-center">
                        <span>{player.username}:</span>
                        <span>{player.bid !== null ? `${player.bid} pli(s) ✅` : '⏳ En cours...'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player Hand */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Your Hand</h2>
                    
          <div className="flex flex-wrap gap-2 justify-center">
            {(currentPlayer?.cards || []).map((card: Card) => getCardDisplay(card))}
          </div>
          {(currentPlayer?.cards?.length || 0) === 0 && (
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

      {/* Tigress Choice Dialog */}
      {showTigressChoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Choix de la Tigresse
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Comment voulez-vous utiliser votre Tigresse ?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleTigressChoice('PIRATE')}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                🏴‍☠️ Comme un Pirate
                <div className="text-sm opacity-80 mt-1">
                  Bat les sirènes et cartes numérotées
                </div>
              </button>
              <button
                onClick={() => handleTigressChoice('ESCAPE')}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                🏃‍♀️ Comme une Fuite
                <div className="text-sm opacity-80 mt-1">
                  Ne peut jamais remporter un pli
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
