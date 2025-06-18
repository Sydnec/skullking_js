'use client';

import { useState } from 'react';
import { UserService, User } from '@/lib/api';

interface UsernameFormProps {
  onUsernameSubmit: (user: User) => void;
}

export default function UsernameForm({ onUsernameSubmit }: UsernameFormProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateUsername = (name: string): string | null => {
    if (!name.trim()) return "Le nom d'utilisateur est requis";
    if (name.length < 3) return "Le nom d'utilisateur doit faire au moins 3 caractères";
    if (name.length > 16) return "Le nom d'utilisateur ne doit pas dépasser 16 caractères";
    if (!/^[a-zA-Z0-9_\-]+$/.test(name)) return "Le nom d'utilisateur ne doit contenir que des lettres, chiffres, tirets ou underscores";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // Vérifier la disponibilité du nom d'utilisateur
      const checkResult = await UserService.checkUsername(username.trim());
      
      if (!checkResult.available) {
        setError('Ce nom d\'utilisateur est déjà pris');
        setIsLoading(false);
        return;
      }

      // Créer l'utilisateur
      const createResult = await UserService.createUser(username.trim());
      onUsernameSubmit(createResult.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la connexion');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
        Skull King Online
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nom d&apos;utilisateur
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Entrez votre nom d'utilisateur"
            disabled={isLoading}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
        >
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
