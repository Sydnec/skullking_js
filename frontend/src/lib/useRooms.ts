import { useQuery } from '@tanstack/react-query';
import { apiFetchWithAuth } from './api';
import { roomsArraySchema, Room as RoomSchemaType } from './schemas';

export function useRooms(token?: string | undefined) {
  return useQuery<RoomSchemaType[], Error>(['rooms'], async () => {
    // apiFetchWithAuth now validates the response when a zod schema is provided
    const data = await apiFetchWithAuth('/rooms', undefined, token, roomsArraySchema);
    return data as RoomSchemaType[];
  }, { refetchOnWindowFocus: false });
}
