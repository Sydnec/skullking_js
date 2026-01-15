import { useQuery } from '@tanstack/react-query';
import { apiFetchWithAuth } from './api';

export function useGame(code?: string, enabled = false, token?: string | null) {
  const key = ['game', code, token];

  const query = useQuery(
    key,
    async () => {
      if (!code) throw new Error('no-code');
      // Extra safety: if token is explicitly required but missing, throw or return null
      if (!token) {
          // If enabled is true but token is missing, that's weird, but let's try reading from storage as fallback
          // or just fail early to avoid 401
          const stored = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          if (!stored) throw new Error('no-token-available');
      }

      const res = await apiFetchWithAuth(`/rooms/${code}/game`, undefined, token || undefined, undefined, { allowNotOk: true });
      
       if (res && typeof res === 'object' && 'ok' in res && res.ok === false) {
        if (res.status === 404) return null;
        console.error('Fetch game error:', JSON.stringify(res, null, 2));
        const msg = res.data?.error || res.data?.message || res.statusText || 'Unknown error';
        throw new Error(`fetch-game-failed: ${res.status} - ${msg}`);
      }
      return res;
    },
    {
      enabled: !!code && enabled && !!token,
      refetchOnWindowFocus: false,
      staleTime: 5000 
    }
  );
  
  return { ...query, game: query.data };
}
