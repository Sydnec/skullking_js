/**
 * Utilitaire pour construire les URLs d'API
 * En développement, utilise localhost:3001
 * En production, utilise la variable d'environnement NEXT_PUBLIC_API_URL
 */

function getApiBaseUrl(): string {
  // Côté client, utiliser la variable d'environnement
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 
           (process.env.NODE_ENV === 'production' ? 'https://skullking-api.duckdns.org' : 'http://localhost:3001');
  }
  
  // Côté serveur (SSR), utiliser localhost en développement
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }
  
  // En production côté serveur, utiliser la variable d'environnement ou fallback
  return process.env.NEXT_PUBLIC_API_URL || 'https://skullking-api.duckdns.org';
}

/**
 * Construit l'URL complète pour un endpoint API
 * @param path - Le chemin de l'API (ex: '/auth/login')
 * @returns L'URL complète vers l'API
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/api/v1${cleanPath}`;
}

/**
 * Wrapper pour fetch avec l'URL d'API automatiquement construite
 * @param path - Le chemin de l'API (ex: '/auth/login')
 * @param options - Options de fetch
 * @returns Promise de Response
 */
export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = buildApiUrl(path);
  const defaultOpts: RequestInit = { credentials: 'include' };
  // Merge headers carefully to avoid mutating caller object
  const merged: RequestInit = { ...defaultOpts, ...(options || {}) };
  if (options?.headers) {
    merged.headers = { ...(options.headers as Record<string, any>) };
  }
  // Allow callers to still send Authorization header when token-based auth is used,
  // but prefer cookies (HttpOnly) when backend sets them. credentials: 'include' ensures cookies are sent.
  return fetch(url, merged);
}

/**
 * Wrapper pour fetch avec token d'authentification Bearer
 * @param path - Le chemin de l'API (ex: '/auth/login')
 * @param options - Options de fetch
 * @param token - Token d'authentification (optionnel)
 * @returns Promise de Response
 */
export function apiFetchWithAuth(path: string, options?: RequestInit, token?: string | undefined): Promise<Response> {
  const headers = { ...(options?.headers as Record<string, any> || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return apiFetch(path, { ...options, headers });
}
