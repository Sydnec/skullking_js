import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../common/authMiddleware';

export async function listGames(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.game.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getGame(req: Request, res: Response, next: NextFunction) {
  try {
    const g = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!g) return res.status(404).end();
    res.json(g);
  } catch (e) {
    next(e);
  }
}

export async function createGame(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const payload: any = { ...req.body };
    delete payload.userId;

    const g = await prisma.game.create({ data: payload });
    res.status(201).json(g);
  } catch (e) {
    next(e);
  }
}

export async function updateGame(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    const data: any = { ...req.body };
    delete data.userId;
    delete data.id;

    const g = await prisma.game.update({ where: { id: req.params.id }, data });
    res.json(g);
  } catch (e) {
    next(e);
  }
}

export async function deleteGame(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.game.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listGames, getGame, createGame, updateGame, deleteGame };
