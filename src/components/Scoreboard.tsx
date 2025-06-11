'use client';

import { Player } from '@/types/skull-king';

interface ScoreboardProps {
  players: Player[];
  winner: Player | null;
  onNewGame?: () => void;
  onReturnToLobby?: () => void;
}

export default function Scoreboard({ players, winner, onNewGame, onReturnToLobby }: ScoreboardProps) {
  // Trier les joueurs par score décroissant
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}`;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg border-2 border-yellow-300';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900 shadow-md border-2 border-gray-200';
      case 3: return 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md border-2 border-amber-500';
      default: return 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
              🏴‍☠️ Partie Terminée !
            </h1>
          </div>
        </div>

        {/* Tableau des scores */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
            <h3 className="text-xl font-bold text-white text-center">
              Tableau des Scores
            </h3>
          </div>

          <div className="p-4 sm:p-6">
            <div className="space-y-3 p-4">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                const isWinner = player.id === winner?.id;

                return (
                  <div
                    key={player.id}
                    className={`rounded-lg p-3 sm:p-4 transition-all duration-500 transform hover:scale-102 ${getRankStyle(rank)} ${
                      isWinner ? 'ring-4 ring-yellow-400 ring-opacity-50 scale-105 animate-pulse' : ''
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="text-xl sm:text-2xl font-bold w-8 sm:w-12 text-center flex-shrink-0">
                          {getRankIcon(rank)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm sm:text-lg flex items-center gap-2">
                            <span className="truncate">{player.username}</span>
                            {isWinner && <span className="text-yellow-500 flex-shrink-0">👑</span>}
                          </div>
                          <div className="text-xs sm:text-sm opacity-75">
                            Rang #{rank}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg sm:text-2xl font-bold">
                          {player.score} pts
                        </div>
                        <div className="text-xs sm:text-sm opacity-75">
                          Score final
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">          
          {onReturnToLobby && (
            <button
              onClick={onReturnToLobby}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">🏠</span>
                <span>Retour</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}