'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Room, User } from '@/lib/api';
import { saveUserToStorage } from '@/lib/user-persistence';
import GameRoom from './GameRoom';
import UsernameForm from './UsernameForm';

interface GameRoomPageProps {
  roomData: Room;
}

export default function GameRoomPage({ roomData }: GameRoomPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user wants to join as spectator
  const forceSpectator = searchParams.get('mode') === 'spectator';

  // Ensure component is mounted before accessing localStorage
  useEffect(() => {
    setMounted(true);
  }, []);  // Load user from session storage
  useEffect(() => {
    if (!mounted) return;
    
    // Use the same localStorage keys as the main app
    const lastUsername = localStorage.getItem('lastUsername');
    const lastUserId = localStorage.getItem('lastUserId');
    
    if (lastUsername && lastUserId) {
      const userData = {
        id: lastUserId,
        username: lastUsername,
        isOnline: true
      };
      setUser(userData);
    }
    
    setLoading(false);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const checkAndRestoreUser = async () => {
      const lastUsername = localStorage.getItem('lastUsername');
      const lastUserId = localStorage.getItem('lastUserId');
      if (lastUsername && lastUserId) {
        try {
          // Vérifier si l'utilisateur existe côté serveur
          const response = await fetch(`/api/users/${lastUserId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.user && data.user.username === lastUsername) {
              setUser({ id: lastUserId, username: lastUsername, isOnline: true });
              setLoading(false);
              return;
            }
          }
          // Si l'utilisateur n'existe plus, nettoyer le localStorage
          localStorage.removeItem('lastUsername');
          localStorage.removeItem('lastUserId');
        } catch {
          localStorage.removeItem('lastUsername');
          localStorage.removeItem('lastUserId');
        }
      }
      setLoading(false);
    };
    checkAndRestoreUser();
  }, [mounted]);

  // No automatic redirect - allow user to login directly from room page

  const handleLogin = (userData: User) => {
    setUser(userData);
    // Use the same localStorage keys as the main app
    localStorage.setItem('lastUsername', userData.username);
    localStorage.setItem('lastUserId', userData.id);
  };


  const handleLeaveRoom = () => {
    // S'assurer que les données utilisateur sont bien sauvegardées avant la redirection
    if (user) {
      saveUserToStorage(user);
    }
    router.push('/');
  };
  // If not mounted yet, show loading to prevent hydration mismatch
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // If no user, show login form
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Rejoindre la partie {roomData.id}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Connectez-vous pour rejoindre cette partie Skull King
            </p>
          </div>
          <UsernameForm onUsernameSubmit={handleLogin} />
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GameRoom
      user={user}
      roomId={roomData.id}
      onLeaveRoom={handleLeaveRoom}
      forceSpectator={forceSpectator}
    />
  );
}
