// Utility functions for user persistence
export const saveUserToStorage = (user: { id: string; username: string }) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lastUsername', user.username);
    localStorage.setItem('lastUserId', user.id);
  }
};

export const getUserFromStorage = () => {
  if (typeof window === 'undefined') return null;
  
  const lastUsername = localStorage.getItem('lastUsername');
  const lastUserId = localStorage.getItem('lastUserId');
  
  if (lastUsername && lastUserId) {
    return { id: lastUserId, username: lastUsername };
  }
  
  return null;
};

export const clearUserFromStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lastUsername');
    localStorage.removeItem('lastUserId');
  }
};

export const ensureUserPersistence = (user: { id: string; username: string }) => {
  // Always ensure user data is saved before any navigation/redirection
  saveUserToStorage(user);
  
  // Small delay to ensure localStorage write is completed
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 50);
  });
};
