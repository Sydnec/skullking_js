import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../common/authMiddleware';

export async function listTricks(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.trick.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getTrick(req: Request, res: Response, next: NextFunction) {
  try {
    const t = await prisma.trick.findUnique({ where: { id: req.params.id } });
    if (!t) return res.status(404).end();
    res.json(t);
  } catch (e) {
    next(e);
  }
}

export async function createTrick(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const payload: any = { ...req.body };
    delete payload.userId;

    const t = await prisma.trick.create({ data: payload });
    res.status(201).json(t);
  } catch (e) {
    next(e);
  }
}

export async function updateTrick(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.trick.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    const data: any = { ...req.body };
    delete data.userId;
    delete data.id;

    const t = await prisma.trick.update({ where: { id: req.params.id }, data });
    res.json(t);
  } catch (e) {
    next(e);
  }
}

export async function deleteTrick(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.trick.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.trick.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listTricks, getTrick, createTrick, updateTrick, deleteTrick };
