import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../common/authMiddleware';

export async function listPlays(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.play.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getPlay(req: Request, res: Response, next: NextFunction) {
  try {
    const p = await prisma.play.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).end();
    res.json(p);
  } catch (e) {
    next(e);
  }
}

export async function createPlay(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    // prevent client from forcing userId
    const payload: any = { ...req.body };
    delete payload.userId;

    const p = await prisma.play.create({ data: payload });
    res.status(201).json(p);
  } catch (e) {
    next(e);
  }
}

export async function updatePlay(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.play.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // if resource has an owner field, enforce ownership
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    const data: any = { ...req.body };
    delete data.userId;
    delete data.id;

    const p = await prisma.play.update({ where: { id: req.params.id }, data });
    res.json(p);
  } catch (e) {
    next(e);
  }
}

export async function deletePlay(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.play.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // if resource has an owner field, enforce ownership
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.play.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listPlays, getPlay, createPlay, updatePlay, deletePlay };
