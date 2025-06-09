'use client';

import { useState, useEffect } from 'react';
import UsernameForm from '@/components/UsernameForm';
import GameLobby from '@/components/GameLobby';
import { User, UserService } from '@/lib/api';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before accessing localStorage
  useEffect(() => {
    setMounted(true);
  }, []);

  // Charger automatiquement la session au démarrage
  useEffect(() => {
    if (!mounted) return;
    
    const restoreSession = async () => {
      try {
        // Récupérer le dernier nom d'utilisateur depuis le localStorage
        const lastUsername = localStorage.getItem('lastUsername');
        const lastUserId = localStorage.getItem('lastUserId');
        
        if (lastUsername && lastUserId) {
          console.log(`Tentative de restauration de session pour: ${lastUsername}`);
          
          // Vérifier si l'utilisateur existe encore dans la base de données
          try {
            const existingUser = await UserService.getUserById(lastUserId);
            if (existingUser && existingUser.username === lastUsername) {
              // Utilisateur trouvé, restaurer la session
              console.log('Session restaurée avec succès');
              await UserService.updateUserStatus(lastUserId, true);
              setUser(existingUser);
            } else {
              // Utilisateur n'existe plus, nettoyer le localStorage
              console.log('Utilisateur non trouvé, nettoyage du localStorage');
              localStorage.removeItem('lastUsername');
              localStorage.removeItem('lastUserId');
            }
          } catch {
            console.log('Utilisateur non trouvé ou erreur, nouvelle connexion requise');
            localStorage.removeItem('lastUsername');
            localStorage.removeItem('lastUserId');
          }
        }
      } catch (error) {
        console.error('Erreur lors de la restauration de session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [mounted]);

  const handleUsernameSubmit = async (newUser: User) => {
    // Sauvegarder les informations de session
    localStorage.setItem('lastUsername', newUser.username);
    localStorage.setItem('lastUserId', newUser.id);
    setUser(newUser);
  };

  const handleLogout = async () => {
    if (user) {
      try {
        // Déconnecter l'utilisateur et nettoyer les rooms vides
        await UserService.disconnectUser(user.id);
        console.log('Utilisateur déconnecté et nettoyage effectué');
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        // On continue la déconnexion même en cas d'erreur
      }
    }
    
    // Nettoyer le localStorage
    localStorage.removeItem('lastUsername');
    localStorage.removeItem('lastUserId');
    
    setUser(null);
  };

  // Gérer la déconnexion automatique quand l'utilisateur ferme l'onglet
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        // Utiliser navigator.sendBeacon pour une requête asynchrone fiable
        const data = JSON.stringify({ userId: user.id });
        navigator.sendBeacon('/api/users/disconnect', data);
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && user) {
        try {
          await UserService.updateUserStatus(user.id, false);
        } catch (error) {
          console.error('Erreur lors de la mise à jour du statut:', error);
        }
      } else if (document.visibilityState === 'visible' && user) {
        try {
          await UserService.updateUserStatus(user.id, true);
        } catch (error) {
          console.error('Erreur lors de la mise à jour du statut:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {!mounted ? (
        // Prevent hydration mismatch by not rendering anything until mounted
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Initialisation...</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Restoration de la session...</p>
          </div>
        </div>
      ) : !user ? (
        <div className="flex items-center justify-center min-h-screen p-4">
          <UsernameForm onUsernameSubmit={handleUsernameSubmit} />
        </div>
      ) : (
        <GameLobby user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
