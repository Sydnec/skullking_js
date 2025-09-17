import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { getSocketServer } from '../../../common/socket';
import { AuthRequest } from '../../../common/authMiddleware';

const ROOM_INCLUDE = {
  owner: { select: { id: true, name: true } },
  players: { include: { user: { select: { id: true, name: true } } } },
};

export async function listRooms(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.room.findMany({ include: ROOM_INCLUDE }));
  } catch (e) {
    next(e);
  }
}

export async function getRoom(req: Request, res: Response, next: NextFunction) {
  try {
    // now lookup by public code (/:code)
    const room = await prisma.room.findUnique({ where: { code: req.params.code }, include: ROOM_INCLUDE });
    if (!room) return res.status(404).end();
    res.json(room);
  } catch (e) {
    next(e);
  }
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    // owner will be the authenticated user
    const authReq = req as AuthRequest;
    const ownerId = authReq.user?.sub;
    if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

    // Prepare payload: include owner and ensure the owner is also added as a player
    const body = req.body || {};
    const data: any = { ...body, ownerId };

    // If client didn't explicitly include players, ensure owner is created as a roomPlayer
    // Use nested create to keep operation atomic
    if (!data.players) {
      data.players = { create: { userId: ownerId } };
    }

    const room = await prisma.room.create({ data, include: ROOM_INCLUDE });

    // Broadcast creation so lobby updates for everyone
    const io = getSocketServer();
    try {
      io?.emit('room-list-updated');
      io?.to(room.code).emit('room-created', { room });
    } catch (e) { /* ignore socket errors */ }

    res.status(201).json(room);
  } catch (e) {
    next(e);
  }
}

export async function updateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    // authorize via authenticated user
    const authReq = req as AuthRequest;
    const userId = authReq.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // find room by code to check owner
    const roomBefore = await prisma.room.findUnique({ where: { code: req.params.code } });
    if (!roomBefore) return res.status(404).json({ error: 'Room not found' });
    if (roomBefore.ownerId !== userId) return res.status(403).json({ error: 'Only owner can update room settings' });

    // perform update (only allowed fields should be sent by client)
    const { userId: _discard, ...updateData } = req.body || {};
    const room = await prisma.room.update({ where: { code: req.params.code }, data: updateData, include: ROOM_INCLUDE });

    // emit socket events so clients update (room-scoped + global)
    const io = getSocketServer();
    try {
      io?.to(req.params.code).emit('room-updated', { room });
      io?.emit('room-list-updated');
    } catch (e) { /* ignore socket errors */ }

    res.json(room);
  } catch (e) {
    next(e);
  }
}

export async function deleteRoom(req: Request, res: Response, next: NextFunction) {
  try {
    // authorize: only owner can delete
    const authReq = req as AuthRequest;
    const userId = authReq.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // ensure room exists and owner matches
    const room = await prisma.room.findUnique({ where: { code: req.params.code } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== userId) return res.status(403).json({ error: 'Only owner can delete room' });

    // Delete dependent records first to avoid foreign key constraint errors
    try {
      await prisma.message.deleteMany({ where: { roomId: room.id } });
      await prisma.roomPlayer.deleteMany({ where: { roomId: room.id } });
    } catch (e) {
      // ignore deletion errors here and continue to attempt delete room
    }

    await prisma.room.delete({ where: { code: req.params.code } });

    // broadcast
    const io = getSocketServer();
    try {
      io?.emit('room-list-updated');
      io?.to(req.params.code).emit('room-deleted', { message: 'Room deleted by owner' });
    } catch (e) { /* ignore socket errors */ }

    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export async function joinRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.params.code;
    const authReq = req as AuthRequest;
    const userId = authReq.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // if already joined, return existing wrapped in { player }
    const existing = await prisma.roomPlayer.findFirst({ where: { roomId: room.id, userId } });
    if (existing) return res.status(200).json({ player: existing });

    const rp = await prisma.roomPlayer.create({
      data: { roomId: room.id, userId, seat: null },
      include: { user: { select: { id: true, name: true } } },
    });

    const io = getSocketServer();
    try {
      io?.to(code).emit('player-joined', { player: rp });
      io?.emit('room-list-updated');
    } catch (e) { /* ignore socket errors */ }

    return res.status(201).json({ player: rp });
  } catch (e) {
    next(e);
  }
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function startRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.params.code;
    const authReq = req as AuthRequest;
    const userId = authReq.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const room = await prisma.room.findUnique({ where: { code }, include: ROOM_INCLUDE });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.ownerId !== userId) return res.status(403).json({ error: 'Only owner can start the game' });

    const players = room.players || [];
    const shuffled = shuffle([...players]);

    // assign seats (0..n-1)
    await Promise.all(shuffled.map((p: any, i: number) => prisma.roomPlayer.update({ where: { id: p.id }, data: { seat: i } })));

    // update room status to RUNNING
    const updated = await prisma.room.update({ where: { id: room.id }, data: { status: 'RUNNING' }, include: ROOM_INCLUDE });

    const io = getSocketServer();
    try {
      io?.to(code).emit('room-updated', { room: updated });
      io?.emit('room-list-updated');
    } catch (e) { /* ignore socket errors */ }

    res.json({ room: updated });
  } catch (e) {
    next(e);
  }
}

export default { listRooms, getRoom, createRoom, updateRoom, deleteRoom, joinRoom, startRoom };
