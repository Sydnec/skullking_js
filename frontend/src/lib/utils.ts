// Utilitaires pour générer des codes de partie
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validation du code de partie
export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

// Validation du nom d'utilisateur
export function isValidUsername(username: string): boolean {
  return username.trim().length >= 2 && username.trim().length <= 20 && /^[a-zA-Z0-9_]+$/.test(username.trim());
}
