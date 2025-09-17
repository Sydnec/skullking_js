import { z } from 'zod';

// Schéma basique pour un utilisateur tel qu'attendu depuis l'API
export const userSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

// Message (chat)
export const messageSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  // Back-end includes the related user object when requested; keep it optional so parsing preserves user.name
  user: userSchema.optional(),
  content: z.string().optional(),
  text: z.string().optional(),
  createdAt: z.string().optional(),
});

// Paramètres optionnels d'une room
export const roomSettingsSchema = z.object({
  kraken: z.boolean().optional(),
  whale: z.boolean().optional(),
  loot: z.boolean().optional(),
  piratePowers: z.boolean().optional(),
  scoreMethod: z.string().optional(),
  gameFormat: z.string().optional(),
});

// Player (participant) dans la room
export const playerSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  user: userSchema.optional(),
});

// Room
export const roomSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().nullable().optional(),
  owner: userSchema.optional(),
  ownerId: z.string().nullable().optional(),
  players: z.array(playerSchema).optional(),
  maxPlayers: z.number().optional(),
  settings: roomSettingsSchema.optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
});

// Collections
export const roomsArraySchema = z.array(roomSchema);
export const messagesArraySchema = z.array(messageSchema);

// Types exportés pour usage TypeScript
export type User = z.infer<typeof userSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Player = z.infer<typeof playerSchema>;
export type Room = z.infer<typeof roomSchema>;
export type RoomSettings = z.infer<typeof roomSettingsSchema>;

export default {
  userSchema,
  messageSchema,
  roomSchema,
  roomsArraySchema,
  messagesArraySchema,
  roomSettingsSchema,
  playerSchema,
};
