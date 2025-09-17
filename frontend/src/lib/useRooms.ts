import { useQuery } from '@tanstack/react-query';
import { apiFetchWithAuth } from './api';

export function useRooms(token?: string | undefined) {
  return useQuery(['rooms'], async () => {
    const res = await apiFetchWithAuth('/rooms', undefined, token);
    if (!res.ok) throw new Error('Erreur fetch rooms');
    return await res.json();
  }, { refetchOnWindowFocus: false });
}
