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
      <div className="w-full max-w-full px-4">
        {/* En-tête avec le gagnant */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
              🏴‍☠️ Partie Terminée !
            </h1>
            <div className="text-xl text-gray-600 dark:text-gray-400">
              Après 10 rounds épiques de Skull King
            </div>
          </div>

          {winner && (
            <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 rounded-xl p-6 shadow-2xl border-4 border-yellow-300 mb-8 animate-pulse">
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-6xl animate-bounce">👑</span>
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                    {winner.username}
                  </h2>
                  <p className="text-xl text-gray-800">
                    Vainqueur avec {winner.score} points !
                  </p>
                </div>
                <span className="text-6xl animate-bounce">👑</span>
              </div>
              <div className="text-gray-800 font-medium">
                🎉 Félicitations, capitaine ! Vous avez conquis les sept mers ! 🎉
              </div>
            </div>
          )}
        </div>

        {/* Tableau des scores */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
            <h3 className="text-xl font-bold text-white text-center">
              📊 Tableau Final des Scores
            </h3>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                const isWinner = player.id === winner?.id;

                return (
                  <div
                    key={player.id}
                    className={`rounded-lg p-4 transition-all duration-500 transform hover:scale-102 ${getRankStyle(rank)} ${
                      isWinner ? 'ring-4 ring-yellow-400 ring-opacity-50 scale-105 animate-pulse' : ''
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold w-12 text-center">
                          {getRankIcon(rank)}
                        </div>
                        <div>
                          <div className="font-bold text-lg flex items-center gap-2">
                            {player.username}
                            {isWinner && <span className="text-yellow-500">👑</span>}
                          </div>
                          <div className="text-sm opacity-75">
                            Rang #{rank}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {player.score} pts
                        </div>
                        <div className="text-sm opacity-75">
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

        {/* Statistiques de la partie */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {sortedPlayers[0]?.score || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Score le plus élevé
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">📈</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {Math.round(sortedPlayers.reduce((sum, p) => sum + p.score, 0) / sortedPlayers.length)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Score moyen
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {sortedPlayers.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Joueurs participants
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {onNewGame && (
            <button
              onClick={onNewGame}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">🔄</span>
                <span>Nouvelle Partie</span>
              </div>
            </button>
          )}
          
          {onReturnToLobby && (
            <button
              onClick={onReturnToLobby}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">🏠</span>
                <span>Retour au Lobby</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
