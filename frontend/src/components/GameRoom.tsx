'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/api';
import { Player, Card } from '@/types/skull-king';
import { useGameSocket } from '@/hooks/useGameSocket';
import { useToast } from './ToastProvider';
import { saveUserToStorage } from '@/lib/user-persistence';
import ConfirmDialog from './ConfirmDialog';
import CardImage from './CardImage';
import Scoreboard from './Scoreboard';
import Chat from './Chat';

interface GameRoomProps {
  user: User;
  roomId: string;
  onLeaveRoom: () => void;
  forceSpectator?: boolean;
}

export default function GameRoom({ user, roomId, onLeaveRoom, forceSpectator = false }: GameRoomProps) {
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [trickWinner, setTrickWinner] = useState<{ playerName: string; playerId: string } | null>(null);
  const [showTigressChoice, setShowTigressChoice] = useState<boolean>(false);
  const [pendingTigressCard, setPendingTigressCard] = useState<Card | null>(null);
  const leaveGameRef = useRef<(() => void) | null>(null);
  const { showSuccess, showInfo } = useToast();

  const { 
    gameState, 
    connected, 
    hasJoined,
    isSpectator,
    leaveGame, 
    deleteRoom,
    sendGameAction,
    sendChatMessage,
    chatMessages
  } = useGameSocket({
    roomId,
    userId: user.id,
    username: user.username,
    forceSpectator
  });// Store the leaveGame function in ref to avoid dependency issues
  leaveGameRef.current = leaveGame;

  // Function to copy room link to clipboard
  const handleCopyRoomLink = async () => {
    try {
      const roomUrl = `${window.location.origin}/${roomId}`;
      await navigator.clipboard.writeText(roomUrl);
      showSuccess('Lien de la room copié dans le presse-papiers !', 'Lien copié');
    } catch {
      // Fallback for browsers that don't support clipboard API
      const roomUrl = `${window.location.origin}/${roomId}`;
      const textArea = document.createElement('textarea');
      textArea.value = roomUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess('Lien de la room copié dans le presse-papiers !', 'Lien copié');
    }
  };

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
  }, []);  const handleStartGame = () => {
    if (!gameState || !currentPlayer) return;
    
    // Show info notification
    showInfo('Démarrage de la partie...', 'Lancement en cours');
    
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
    // S'assurer que les données utilisateur sont sauvegardées
    saveUserToStorage(user);
    
    deleteRoom();
    setShowDeleteConfirm(false);
    
    // Appeler onLeaveRoom pour déclencher la redirection
    onLeaveRoom();
  };

  const cancelDeleteRoom = () => {
    setShowDeleteConfirm(false);
  };

  const handleLeaveRoom = () => {
    if (!gameState) return;
    
    // Sauvegarder les données utilisateur avant toute action
    saveUserToStorage(user);
    
    // If user is a spectator, just leave
    if (isSpectator) {
      leaveGame();
      onLeaveRoom();
      return;
    }
    
    // If user is not a player (shouldn't happen but safety check)
    if (!currentPlayer) {
      leaveGame();
      onLeaveRoom();
      return;
    }
    
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

  const getGamePhaseText = (phase: string) => {
    switch (phase) {
      case 'WAITING': return 'En attente';
      case 'BIDDING': return 'Phase de paris';
      case 'PLAYING': return 'Phase de jeu';
      case 'ROUND_END': return 'Fin de manche';
      case 'GAME_END': return 'Partie terminée';
      default: return phase;
    }
  };
  const handleBid = () => {
    if (!gameState || !currentRound || !currentPlayer) return;
    
    // Send bid action through socket
    sendGameAction({
      type: 'BID',
      payload: { bid: bidAmount }
    });
    
    // Show success notification
    showSuccess(
      `Votre pari de ${bidAmount} pli${bidAmount > 1 ? 's' : ''} a été placé !`,
      'Pari confirmé'
    );
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
        className={`w-28 h-42 ${hasBeenPlayedInCurrentTrick ? 'opacity-50 cursor-not-allowed' : ''}`}
        isPlayable={canPlayCard && !hasBeenPlayedInCurrentTrick ? true : false}
        onClick={() => {
          if (canPlayCard && !hasBeenPlayedInCurrentTrick) {
            handlePlayCard(card);
          }
        }}
      />
    );
  };  if (!gameState || (!currentPlayer && !isSpectator)) {
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
                {hasJoined ? `Dans la room ${roomId}` : `Connexion à la room ${roomId}...`}
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
      // Sauvegarder les données utilisateur avant toute action
      saveUserToStorage(user);
      
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
    <div className="h-screen bg-gray-100 dark:bg-gray-900 p-3 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
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
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div>            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Skull King - room {roomId} {isSpectator && '👀 (Spectateur)'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSpectator && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  Mode spectateur - Vous observez cette partie 
                </span>
              )}
              {!isSpectator && gameState.roomStatus === 'LOBBY' ? (
                `Lobby - ${gameState.players.length} joueur(s) connecté(s)`
              ) : !isSpectator ? (
                `Round ${currentRound?.number || 1} - ${getGamePhaseText(gameState.gamePhase)}`
              ) : (
                `Round ${currentRound?.number || 1} - ${getGamePhaseText(gameState.gamePhase)}`
              )}
            </p>
          </div>          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={handleCopyRoomLink}
              className="px-2 md:px-3 py-1.5 text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1"
              title="Copier le lien de la room"
            >
              <span className="hidden sm:inline">📋 Copier le lien</span>
              <span className="sm:hidden">📋</span>
            </button>
            <div className={`text-xs ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? '🟢 Connecté' : '🔴 Déconnecté'}
            </div>
            {!isSpectator && currentPlayer?.id === gameState.creatorId ? (
              <button
                onClick={handleDeleteRoom}
                className="px-2 md:px-3 py-1.5 text-xs md:text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                <span className="hidden sm:inline">🗑️ Supprimer la room</span>
                <span className="sm:hidden">🗑️</span>
              </button>
            ) : (
              <button
                onClick={handleLeaveRoom}
                className="px-2 md:px-3 py-1.5 text-xs md:text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
              >
                <span className="hidden sm:inline">{isSpectator ? '👀 Arrêter d\'observer' : 'Quitter'}</span>
                <span className="sm:hidden">❌</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Game Area - Full height layout (without player hand) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 min-h-0">
          {/* Players - Fixed height */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-full flex flex-col">
            <h2 className="text-base font-semibold mb-2 text-gray-900 dark:text-white flex-shrink-0">Joueurs</h2>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {gameState.players.map((player: Player) => {
                // Check if this player has played a card in the current trick
                const hasPlayedCard = gameState.gamePhase === 'PLAYING' && 
                  gameState.currentRound?.currentTrick?.cards.some(
                    playedCard => playedCard.playerId === player.id
                  );

                return (
                  <div
                    key={player.id}
                    className={`p-2 rounded-md flex-shrink-0 ${
                      player.id === user.id 
                        ? 'bg-blue-100 dark:bg-blue-900' 
                        : gameState.gamePhase === 'BIDDING' && player.bid !== null
                          ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
                          : hasPlayedCard
                            ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
                          : 'bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`font-medium text-sm ${
                        hasPlayedCard 
                          ? 'text-green-800 dark:text-green-200' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {player.username} {player.id === user.id && '(Vous)'}
                        {player.id === gameState.creatorId && ' 👑'}
                      </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {gameState.roomStatus === 'LOBBY' ? (
                        player.isOnline ? 'En ligne' : 'Hors ligne'
                      ) : (
                        `Score: ${player.score}`
                      )}
                    </span>
                  </div>
                  {gameState.roomStatus !== 'LOBBY' && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <div>
                        Pari: {(
                          gameState.gamePhase === 'BIDDING' &&
                          gameState.players.some(p => p.bid === null)
                        ) ? '⏳' : (player.bid !== null ? `${player.bid}` : '⏳')} | 
                        Plis: {player.tricksWon}
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
              
              {/* Spectators section */}
              {gameState.spectators && gameState.spectators.length > 0 && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      👀 Spectateurs ({gameState.spectators.length})
                    </h3>
                  </div>
                  {gameState.spectators.map((spectator) => (
                    <div
                      key={spectator.id}
                      className="p-2 rounded-md bg-gray-50 dark:bg-gray-700 flex-shrink-0"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                          👀 {spectator.username} {spectator.id === user.id && '(Vous)'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {spectator.isOnline ? 'Observe' : 'Déconnecté'}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Game Center - Context-aware section - Fixed height */}
          <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg p-4 h-full flex flex-col">
            <h2 className="text-base font-semibold mb-2 text-gray-900 dark:text-white flex-shrink-0">
              {gameState.roomStatus === 'LOBBY' 
                ? 'Information du Lobby'
                : gameState.gamePhase === 'BIDDING' 
                  ? `Round ${currentRound?.number || 1} - Phase de Paris` 
                : gameState.gamePhase === 'PLAYING' 
                  ? 'Pli en Cours' 
                  : 'Actions'
              }
            </h2>
            
            <div className="flex-1 overflow-y-auto min-h-0">
            
            {/* Lobby Info */}
            {gameState.roomStatus === 'LOBBY' && (
              <div className="h-full flex flex-col justify-between">
                {/* Informations en haut */}
                <div className="space-y-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Code de la room :</span> {roomId}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Créateur :</span> {gameState.players.find(p => p.id === gameState.creatorId)?.username}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Joueurs connectés :</span> {gameState.players.length}/{gameState.settings?.maxPlayers || 8}
                  </div>
                </div>

                {/* Message d'attente au milieu */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-600 dark:text-gray-400 text-sm">
                    {currentPlayer?.id === gameState.creatorId ? (
                      <div className="space-y-2">
                        <div className="text-xs">
                          Vous êtes le créateur de cette partie
                        </div>
                        <div className="text-xs opacity-75">
                          {gameState.players.length >= 2 ? 
                            "Vous pouvez démarrer la partie quand vous voulez" : 
                            "Il faut au moins 2 joueurs pour commencer"
                          }
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs">
                          En attente dans le lobby...
                        </div>
                        <div className="text-xs opacity-75">
                          En attente que {gameState.players.find(p => p.id === gameState.creatorId)?.username} démarre la partie
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bouton en bas (uniquement pour le créateur et pas les spectateurs) */}
                {!isSpectator && currentPlayer?.id === gameState.creatorId && (
                  <div className="mt-4">
                    {gameState.players.length >= 2 ? (
                      <button
                        onClick={handleStartGame}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors text-sm shadow-md hover:shadow-lg"
                      >
                        🚀 Lancer la partie ({gameState.players.length} joueurs)
                      </button>
                    ) : (
                      <div className="w-full bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 font-medium py-3 px-4 rounded-md text-sm text-center">
                        ⏳ En attente d&apos;au moins 2 joueurs
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Current Trick - During PLAYING phase */}
            {gameState.roomStatus === 'GAME_STARTED' && gameState.gamePhase === 'PLAYING' && (
              <div>
                {/* Turn indicator */}
                {gameState.currentRound?.currentPlayerId && (
                  <div className="mb-3 text-center">
                    {(() => {
                      const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentRound?.currentPlayerId);
                      const isMyTurn = currentTurnPlayer?.id === currentPlayer?.id;
                      return (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          isMyTurn 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-2 border-green-400' 
                            : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        }`}>
                          <span className="text-sm">{isMyTurn ? '👆' : '⏳'}</span>
                          <span>
                            {isMyTurn ? 'À votre tour !' : `Tour de ${currentTurnPlayer?.username}`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-3 justify-center">
                  {currentRound?.currentTrick?.cards.map(({ playerId, card, tigressChoice }: { playerId: string; card: Card; tigressChoice?: 'PIRATE' | 'ESCAPE' }) => {
                    const player = gameState.players.find((p: Player) => p.id === playerId);
                    return (
                      <div key={`${playerId}_${card.id}`} className="text-center">
                        <div className="text-xs mb-1 text-gray-600 dark:text-gray-400">
                          {player?.username}
                        </div>
                        <CardImage 
                          card={card} 
                          className="w-32 h-48"
                          tigressChoice={tigressChoice}
                        />
                      </div>
                    );
                  }) || <div className="text-gray-500 dark:text-gray-400 py-6 text-center text-sm">Aucune carte jouée pour le moment</div>}
                </div>
              </div>
            )}

          {/* Actions - For other phases */}
          {!isSpectator && currentPlayer && gameState.roomStatus === 'GAME_STARTED' && gameState.gamePhase === 'BIDDING' && !currentPlayer.isReady && (
            <div className="flex flex-col h-full justify-between min-h-[300px]">
              {/* Section du haut - Instructions */}
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Pariez sur le nombre de plis que vous pensez remporter
                </p>
                
                {/* Information sur qui commence la manche */}
                {gameState.currentRound?.currentPlayerId && (
                  <div className="mb-4">
                    <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-200 dark:border-green-700">
                      <span className="text-sm">🎮</span>
                      <p className="text-xs font-medium text-green-800 dark:text-green-200">
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
              
              {/* Section du milieu - Pari sélectionné et boutons */}
              <div className="flex-1 flex flex-col justify-center space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-700">
                    <span className="text-base">🎲</span>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Votre pari
                      </p>
                      <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {bidAmount} pli{bidAmount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={`grid gap-0.5 p-2 ${
                  (currentRound?.number || 1) <= 8 
                    ? 'grid-cols-7 sm:grid-cols-8 md:grid-cols-9 lg:grid-cols-10' 
                    : 'grid-cols-6 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-9 xl:grid-cols-10'
                }`}>
                  {Array.from({ length: (currentRound?.number || 1) + 1 }, (_, index) => {
                    return (
                      <button
                        key={index}
                        onClick={() => setBidAmount(index)}
                        className={`aspect-square rounded-md font-bold text-sm flex items-center justify-center transition-all duration-200 ${
                          bidAmount === index
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-opacity-50 transform scale-105 shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-102 hover:shadow-sm'
                        }`}
                      >
                        {index}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Section du bas - Bouton de validation */}
              <div className="p-2">
                <button
                  onClick={handleBid}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-md transition-all duration-200 shadow-md transform active:scale-[0.99] text-sm"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>Confirmer le pari</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {!isSpectator && currentPlayer && gameState.roomStatus === 'GAME_STARTED' && gameState.gamePhase === 'BIDDING' && currentPlayer.isReady && (
            <div className="flex flex-col h-full justify-between min-h-[300px]">
              {/* Section du haut - Confirmation du pari */}
              <div className="text-center text-gray-600 dark:text-gray-400">
                <div className="mb-4 text-sm">
                  ✅ Votre pari a été placé : <span className="font-semibold">{currentPlayer.bid} pli(s)</span>
                </div>
                
                {/* Information sur qui commence la manche */}
                {gameState.currentRound?.currentPlayerId && (
                  <div className="mb-4">
                    <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-200 dark:border-green-700">
                      <span className="text-sm">🎮</span>
                      <p className="text-xs font-medium text-green-800 dark:text-green-200">
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
              
              {/* Section du milieu - État des paris des autres joueurs */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center text-gray-600 dark:text-gray-400">
                  <div className="text-xs mb-3">
                    En attente des autres joueurs...
                  </div>
                  <div className="space-y-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    {gameState.players.map((player: Player) => (
                      <div 
                        key={player.id} 
                        className={`text-xs flex justify-between items-center p-2 rounded-md transition-colors duration-200 ${
                          player.bid !== null 
                            ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700' 
                            : 'bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500'
                        }`}
                      >
                        <span className="font-medium">{player.username}:</span>
                        <span className={player.bid !== null ? 'text-green-700 dark:text-green-300' : 'text-orange-600 dark:text-orange-400'}>
                          {(
                            gameState.players.some(p => p.bid === null)
                          ) ? '⏳ En cours...' : (player.bid !== null ? `${player.bid} pli(s)` : '⏳ En cours...')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Section du bas - Placeholder pour maintenir la structure */}
              <div className="opacity-0">
                {/* Espace réservé pour maintenir l'alignement */}
              </div>
            </div>
          )}
            </div>
          </div>

          {/* Chat Section - À droite - Hidden for spectators */}
          {!isSpectator && (
            <Chat 
              user={user}
              onSendMessage={sendChatMessage}
              messages={chatMessages}
            />
          )}
        </div>

        {/* Player Hand - Full width at bottom - Only show for actual players, not spectators */}
        {!isSpectator && currentPlayer && (
          <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg p-3 flex-shrink-0">
            <div className="flex flex-wrap gap-2 justify-center">
              {(currentPlayer?.cards || []).map((card: Card) => getCardDisplay(card))}
            </div>
            {(currentPlayer?.cards?.length || 0) === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                Aucune carte en main
              </div>
            )}
          </div>
        )}
        
        {/* Spectator message - Show for spectators */}
        {isSpectator && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <div className="text-blue-800 dark:text-blue-200">
              <h3 className="font-semibold mb-2">👀 Mode Spectateur</h3>
              <p className="text-sm">
                Vous observez cette partie. Vous pouvez voir le jeu mais ne pouvez pas participer.
              </p>
            </div>
          </div>
        )}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md w-full mx-4">
            <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
              Choix de la Tigresse
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Comment voulez-vous utiliser votre Tigresse ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleTigressChoice('PIRATE')}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-3 rounded-md transition-colors text-sm"
              >
                🏴‍☠️ Comme un Pirate
                <div className="text-xs opacity-80 mt-1">
                  Bat les sirènes et cartes numérotées
                </div>
              </button>
              <button
                onClick={() => handleTigressChoice('ESCAPE')}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2.5 px-3 rounded-md transition-colors text-sm"
              >
                🏃‍♀️ Comme une Fuite
                <div className="text-xs opacity-80 mt-1">
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
