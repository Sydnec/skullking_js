/**
 * Utilitaire pour construire les URLs d'API
 * En développement, utilise localhost:3001
 * En production, utilise la variable d'environnement NEXT_PUBLIC_API_URL
 */

function getApiBaseUrl(): string {
  // Côté client, utiliser la variable d'environnement
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 
           (process.env.NODE_ENV === 'production' ? 'https://sk-api.simonbourlier.fr' : 'http://localhost:3001');
  }
  
  // Côté serveur (SSR), utiliser localhost en développement
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }
  
  // En production côté serveur, utiliser la variable d'environnement ou fallback
  return process.env.NEXT_PUBLIC_API_URL || 'https://sk-api.simonbourlier.fr';
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

function getTokenFromLocalStorage(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('token') || null;
  } catch {
    return null;
  }
}

type FetchOpts = { allowNotOk?: boolean };

/**
 * Wrapper pour fetch avec l'URL d'API automatiquement construite
 * @param path - Le chemin de l'API (ex: '/auth/login')
 * @param options - Options de fetch
 * @param schema - Schéma de validation Zod (optionnel)
 * @param opts - Options supplémentaires (ex: allowNotOk)
 * @returns Promise de la réponse validée ou objet {ok, status, data} si allowNotOk
 */
export async function apiFetch(path: string, options?: RequestInit, schema?: any, opts?: FetchOpts): Promise<any> {
  const url = buildApiUrl(path);
  const defaultOpts: RequestInit = { credentials: 'include' };
  const merged: RequestInit = { ...defaultOpts, ...(options || {}) };
  if (options?.headers) merged.headers = { ...(options.headers as Record<string, any>) };

  const res = await fetch(url, merged);
  const status = res.status;
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok && opts?.allowNotOk) {
    // return raw data and status for caller to handle
    let parsed = data;
    if (schema && typeof schema.parse === 'function') {
      try { parsed = schema.parse(data); } catch { /* leave parsed as-is */ }
    }
    return { ok: false, status, data: parsed };
  }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || text || res.statusText || 'Erreur API';
    throw new Error(String(message));
  }

  if (schema && typeof schema.parse === 'function') {
    try {
      return schema.parse(data);
    } catch (e:any) {
      // throw a clearer error for validation failures
      throw new Error(`Réponse API invalide pour ${path}: ${e.message || e}`);
    }
  }

  return data;
}

/**
 * Wrapper pour fetch avec token d'authentification Bearer
 * @param path - Le chemin de l'API (ex: '/auth/login')
 * @param options - Options de fetch
 * @param token - Token d'authentification (optionnel)
 * @param schema - Schéma de validation Zod (optionnel)
 * @param opts - Options supplémentaires (ex: allowNotOk)
 * @returns Promise de la réponse validée ou objet {ok, status, data} si allowNotOk
 */
export async function apiFetchWithAuth(path: string, options?: RequestInit, token?: string | undefined, schema?: any, opts?: FetchOpts): Promise<any> {
  const headers = { ...(options?.headers as Record<string, any> || {}) };
  const t = token || getTokenFromLocalStorage();
  if (t) headers.Authorization = `Bearer ${t}`;
  return apiFetch(path, { ...options, headers }, schema, opts);
}
