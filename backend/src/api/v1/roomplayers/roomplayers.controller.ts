import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../common/authMiddleware';
import { getSocketServer } from '../../../common/socket';

export async function listRoomPlayers(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.roomPlayer.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getRoomPlayer(req: Request, res: Response, next: NextFunction) {
  try {
    const rp = await prisma.roomPlayer.findUnique({ where: { id: req.params.id } });
    if (!rp) return res.status(404).end();
    res.json(rp);
  } catch (e) {
    next(e);
  }
}

export async function createRoomPlayer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const payload: any = {
      userId,
      roomId: req.body.roomId,
      userName: req.body.userName || undefined,
      seat: req.body.seat ?? null
    };
    const rp = await prisma.roomPlayer.create({ data: payload, include: { user: { select: { id: true, name: true } } } });

    // broadcast to room and global listeners
    const io = getSocketServer();
    try {
      // need room code to broadcast to room; fetch it
      const room = await prisma.room.findUnique({ where: { id: rp.roomId } });
      if (room) {
        io?.to(room.code).emit('player-joined', { player: rp });
      }
      io?.emit('room-list-updated');
    } catch (e) { /* ignore socket errors */ }

    res.status(201).json(rp);
  } catch (e) {
    next(e);
  }
}

export async function updateRoomPlayer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const existing = await prisma.roomPlayer.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    if (existing.userId !== userId) {
      const room = await prisma.room.findUnique({ where: { id: existing.roomId } });
      if (!room || room.ownerId !== userId) return res.status(403).json({ error: 'Accès refusé' });
    }
    const data: any = {};
    if (req.body.userName !== undefined) data.userName = req.body.userName;
    if (req.body.seat !== undefined) data.seat = req.body.seat;
    const rp = await prisma.roomPlayer.update({ where: { id: req.params.id }, data });

    // broadcast
    const io = getSocketServer();
    try {
      const room = await prisma.room.findUnique({ where: { id: rp.roomId } });
      if (room) io?.to(room.code).emit('room-updated', { room: await prisma.room.findUnique({ where: { id: room.id }, include: { owner: { select: { id: true, name: true } }, players: { include: { user: { select: { id: true, name: true } } } } } }) });
      io?.emit('room-list-updated');
    } catch (e) { /* ignore socket errors */ }

    res.json(rp);
  } catch (e) {
    next(e);
  }
}

export async function deleteRoomPlayer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const existing = await prisma.roomPlayer.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    if (existing.userId === userId) {
      await prisma.roomPlayer.delete({ where: { id: req.params.id } });
      // broadcast
      const io = getSocketServer();
      try {
        const room = await prisma.room.findUnique({ where: { id: existing.roomId } });
        if (room) io?.to(room.code).emit('room-updated', { room: await prisma.room.findUnique({ where: { id: room.id }, include: { owner: { select: { id: true, name: true } }, players: { include: { user: { select: { id: true, name: true } } } } } }) });
        io?.emit('room-list-updated');
      } catch (e) { /* ignore socket errors */ }
      return res.status(204).end();
    }
    const room = await prisma.room.findUnique({ where: { id: existing.roomId } });
    if (room && room.ownerId === userId) {
      await prisma.roomPlayer.delete({ where: { id: req.params.id } });
      // broadcast
      const io = getSocketServer();
      try {
        io?.to(room.code).emit('room-updated', { room: await prisma.room.findUnique({ where: { id: room.id }, include: { owner: { select: { id: true, name: true } }, players: { include: { user: { select: { id: true, name: true } } } } } }) });
        io?.emit('room-list-updated');
      } catch (e) { /* ignore socket errors */ }
      return res.status(204).end();
    }
    return res.status(403).json({ error: 'Accès refusé' });
  } catch (e) {
    next(e);
  }
}

export default { listRoomPlayers, getRoomPlayer, createRoomPlayer, updateRoomPlayer, deleteRoomPlayer };
