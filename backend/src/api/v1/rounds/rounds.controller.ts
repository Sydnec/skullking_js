import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../common/authMiddleware';

export async function listRounds(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.round.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getRound(req: Request, res: Response, next: NextFunction) {
  try {
    const r = await prisma.round.findUnique({ where: { id: req.params.id } });
    if (!r) return res.status(404).end();
    res.json(r);
  } catch (e) {
    next(e);
  }
}

export async function createRound(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const payload: any = { ...req.body };
    delete payload.userId;

    const r = await prisma.round.create({ data: payload });
    res.status(201).json(r);
  } catch (e) {
    next(e);
  }
}

export async function updateRound(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.round.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    const data: any = { ...req.body };
    delete data.userId;
    delete data.id;

    const r = await prisma.round.update({ where: { id: req.params.id }, data });
    res.json(r);
  } catch (e) {
    next(e);
  }
}

export async function deleteRound(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.round.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.round.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listRounds, getRound, createRound, updateRound, deleteRound };
