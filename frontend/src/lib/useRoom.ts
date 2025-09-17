import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetchWithAuth } from './api';
import { queryClient } from './queryClient';
import { roomSchema } from './schemas';

// Hook to fetch room data and provide common mutations. This keeps fetching logic
// centralized and allows components to use react-query cache / invalidation.
export function useRoom(code?: string) {
  const key = ['room', code];

  const query = useQuery(
    key,
    async () => {
      if (!code) throw new Error('no-code');
      // Demande typée : on veut que la réponse soit validée par roomSchema.
      // En cas de 404 on souhaite retourner null plutôt que lever une exception.
      const fetched = await apiFetchWithAuth(`/rooms/${code}`, undefined, undefined, roomSchema, { allowNotOk: true });

      // Si l'API a renvoyé un objet { ok: false, status, data }
      if (fetched && typeof fetched === 'object' && 'ok' in fetched && fetched.ok === false) {
        if (fetched.status === 404) return null;
        const errMsg = (fetched.data && (fetched.data.message || fetched.data.error)) || `fetch-room-failed (${fetched.status})`;
        throw new Error(String(errMsg));
      }

      // Sinon fetched est la room déjà parsée par Zod (roomSchema)
      return fetched;
    },
    {
      enabled: !!code,
      retry: false,
    }
  );

  const invalidate = async () => queryClient.invalidateQueries({ queryKey: key });

  const joinMutation = useMutation(
    async ({ token }: { token?: string } = {}) => {
      if (!code) throw new Error('no-code');
      const opts: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) };
      // allowNotOk pour que l'appel ne throw pas automatiquement sur status non OK
      const res = await apiFetchWithAuth(`/rooms/${code}/join`, opts, token, undefined, { allowNotOk: true });
      if (res && typeof res === 'object' && 'ok' in res && res.ok === false) {
        throw new Error(res.data?.error || res.data?.message || 'join-failed');
      }
      return res;
    },
    {
      // optimistic: append a placeholder player locally
      onMutate: async (_vars: any) => {
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData(key);
        try {
          if (previous) {
            const prevAny: any = previous;
            const placeholder = { id: `local_join_${Date.now()}`, userId: null, userName: 'Vous', seat: null };
            const next = { ...prevAny, players: [ ...(prevAny.players || []), placeholder ] };
            queryClient.setQueryData(key, next);
          }
        } catch { /* ignore optimistic set errors */ }
        return { previous };
      },
      onError: (_err, _vars, context: any) => {
        try {
          const prev = context?.previous;
          if (prev !== undefined) queryClient.setQueryData(key, prev);
        } catch { /* ignore rollback errors */ }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: key });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
      },
    }
  );

  const startMutation = useMutation(
    async ({ token }: { token?: string } = {}) => {
      if (!code) throw new Error('no-code');
      const opts: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) };
      const res = await apiFetchWithAuth(`/rooms/${code}/start`, opts, token, undefined, { allowNotOk: true });
      if (res && typeof res === 'object' && 'ok' in res && res.ok === false) {
        throw new Error(res.data?.error || res.data?.message || 'start-failed');
      }
      return res;
    },
    {
      // optimistic: mark room as RUNNING locally
      onMutate: async (_vars: any) => {
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData(key);
        try {
          if (previous) {
            const prevAny: any = previous;
            const next = { ...prevAny, status: 'RUNNING' };
            queryClient.setQueryData(key, next);
          }
        } catch { /* ignore optimistic set errors */ }
        return { previous };
      },
      onError: (_err, _vars, context: any) => {
        try {
          const prev = context?.previous;
          if (prev !== undefined) queryClient.setQueryData(key, prev);
        } catch { /* ignore rollback errors */ }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: key });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
      },
    }
  );

  const updateMutation = useMutation(
    async ({ body, token }: { body: any; token?: string }) => {
      if (!code) throw new Error('no-code');
      const opts: RequestInit = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      // On veut la room mise à jour validée par roomSchema. allowNotOk pour récupérer erreur éventuelle.
      const res = await apiFetchWithAuth(`/rooms/${code}`, opts, token, roomSchema, { allowNotOk: true });
      if (res && typeof res === 'object' && 'ok' in res && res.ok === false) {
        const err = res.data || {};
        throw new Error(err?.error || err?.message || 'update-failed');
      }
      return res;
    },
    {
      // optimistic: merge body into cached room
      onMutate: async ({ body }: { body: any }) => {
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData(key);
        try {
          if (previous) {
            const prevAny: any = previous;
            const next = { ...prevAny, ...(body || {}) };
            queryClient.setQueryData(key, next);
          }
        } catch { /* ignore optimistic set errors */ }
        return { previous };
      },
      onError: (_err, _vars, context: any) => {
        try {
          const prev = context?.previous;
          if (prev !== undefined) queryClient.setQueryData(key, prev);
        } catch { /* ignore rollback errors */ }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: key });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
      },
    }
  );

  return {
    ...query,
    refetch: query.refetch,
    joinRoom: async (opts?: { token?: string }) => joinMutation.mutateAsync(opts || {}),
    startRoom: async (opts?: { token?: string }) => startMutation.mutateAsync(opts || {}),
    updateRoom: async (body: any, opts?: { token?: string }) => updateMutation.mutateAsync({ body, ...(opts || {}) }),
    invalidate,
  };
}
