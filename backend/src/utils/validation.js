/**
 * Valide un nom d'utilisateur
 */
export function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length >= 2 && trimmed.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Valide un code de room
 */
export function isValidRoomCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Génère un code de room aléatoire
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
