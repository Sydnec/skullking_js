import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../common/authMiddleware';
import { getSocketServer } from '../../../common/socket';

export async function listMessages(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.message.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const m = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!m) return res.status(404).end();
    res.json(m);
  } catch (e) {
    next(e);
  }
}

export async function listMessagesForRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.params.code;
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) return res.status(404).json({ error: 'Salon introuvable' });
    const messages = await prisma.message.findMany({ where: { roomId: room.id }, orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true } } } });
    res.json(messages);
  } catch (e) {
    next(e);
  }
}

export async function createMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const content = req.body.content;
    if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Champ "content" requis' });

    // Allow client to send either roomId or roomCode. Resolve roomCode to roomId when needed.
    let roomId = req.body.roomId as string | undefined;
    if (!roomId && req.body.roomCode) {
      const room = await prisma.room.findUnique({ where: { code: req.body.roomCode } });
      if (!room) return res.status(404).json({ error: 'Salon introuvable' });
      roomId = room.id;
    }

    if (!roomId) return res.status(400).json({ error: 'roomId ou roomCode requis' });

    const payload: any = {
      content,
      userId,
      roomId
    };

    const m = await prisma.message.create({ data: payload, include: { user: { select: { id: true, name: true } } } });

    // broadcast new message to room
    const io = getSocketServer();
    try {
      const room = await prisma.room.findUnique({ where: { id: payload.roomId } });
      if (room) {
        // Emit the message object directly so clients receive expected fields (id, user, userId, content, createdAt)
        io?.to(room.code).emit('message-created', m);
      }
    } catch (e) { /* ignore */ }

    res.status(201).json(m);
  } catch (e) {
    next(e);
  }
}

export async function updateMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const existing = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    if (existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });
    const data: any = {};
    if (req.body.content !== undefined) data.content = req.body.content;
    const m = await prisma.message.update({ where: { id: req.params.id }, data });

    // broadcast updated message
    const io = getSocketServer();
    try {
      const room = await prisma.room.findUnique({ where: { id: m.roomId } });
      if (room) io?.to(room.code).emit('message-updated', m);
    } catch (e) { /* ignore */ }

    res.json(m);
  } catch (e) {
    next(e);
  }
}

export async function deleteMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const existing = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    if (existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });
    await prisma.message.delete({ where: { id: req.params.id } });

    // broadcast deletion
    const io = getSocketServer();
    try {
      const room = await prisma.room.findUnique({ where: { id: existing.roomId } });
      if (room) io?.to(room.code).emit('message-deleted', { id: existing.id });
    } catch (e) { /* ignore */ }

    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listMessages, getMessage, listMessagesForRoom, createMessage, updateMessage, deleteMessage };
