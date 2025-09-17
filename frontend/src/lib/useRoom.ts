import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetchWithAuth } from './api';
import { queryClient } from './queryClient';

// Hook to fetch room data and provide common mutations. This keeps fetching logic
// centralized and allows components to use react-query cache / invalidation.
export function useRoom(code?: string) {
  const key = ['room', code];

  const query = useQuery(
    key,
    async () => {
      if (!code) throw new Error('no-code');
      const res = await apiFetchWithAuth(`/rooms/${code}`);
      // Si la room n'existe plus (404), retourner null plutôt que de
      // lever une erreur : les composants doivent traiter l'absence de
      // room (par ex. rediriger ou afficher un message) sans polluer la
      // console avec une exception non gérée.
      if (res.status === 404) return null;
      return await res.json();
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
      const res = await apiFetchWithAuth(`/rooms/${code}/join`, opts, token);
      if (!res.ok) throw new Error('join-failed');
      return await res.json();
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
      const res = await apiFetchWithAuth(`/rooms/${code}/start`, opts, token);
      if (!res.ok) throw new Error('start-failed');
      return await res.json();
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
      const res = await apiFetchWithAuth(`/rooms/${code}`, opts, token);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'update-failed');
      }
      return await res.json();
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
