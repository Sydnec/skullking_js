// Simple in-memory refresh token store for development/testing.
const tokens = new Map<string, string>(); // refreshToken -> userId

export function saveRefreshToken(token: string, userId: string) {
  tokens.set(token, userId);
}

export function verifyRefreshToken(token: string) {
  return tokens.get(token) ?? null;
}

export function revokeRefreshToken(token: string) {
  tokens.delete(token);
}

export default { saveRefreshToken, verifyRefreshToken, revokeRefreshToken };
