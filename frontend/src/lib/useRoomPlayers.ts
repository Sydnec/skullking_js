import { useMutation } from '@tanstack/react-query';
import { apiFetchWithAuth } from './api';
import { queryClient } from './queryClient';

export function useRoomPlayers() {
  const deletePlayer = useMutation(
    async ({ id, token }: { id: string; token?: string }) => {
      // Utilise allowNotOk pour récupérer les erreurs de l'API sans throw automatique
      const res = await apiFetchWithAuth(`/roomplayers/${id}`, { method: 'DELETE' }, token, undefined, { allowNotOk: true });
      if (res && typeof res === 'object' && 'ok' in res && res.ok === false) {
        const err = res.data || {};
        throw new Error(err?.error || err?.message || 'delete-player-failed');
      }
      return true;
    },
    {
      // optimistic update: remove player from any cached room.players where present
      onMutate: async ({ id }: { id: string }) => {
        await queryClient.cancelQueries({ queryKey: ['room'] });
        const previous = queryClient.getQueriesData(['room']);
        // update all room caches by removing the player if found
        previous.forEach(([key, data]: any) => {
          try {
            if (data && data.players) {
              const had = data.players.some((p:any) => p.id === id);
              if (had) {
                const next = { ...data, players: data.players.filter((p:any) => p.id !== id) };
                queryClient.setQueryData(key, next);
              }
            }
          } catch { /* ignore per-entry errors */ }
        });
        return { previous }; // rollback snapshot
      },
      onError: (_err, _variables, context: any) => {
        // rollback to previous snapshots
        try {
          const prev = context?.previous || [];
          prev.forEach(([key, data]: any) => {
            queryClient.setQueryData(key, data);
          });
        } catch { /* ignore rollback errors */ }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['room'] });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
      }
    }
  );

  return { deletePlayer: deletePlayer.mutateAsync };
}
