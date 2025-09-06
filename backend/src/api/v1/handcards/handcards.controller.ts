import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../common/authMiddleware';

export async function listHandCards(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.handCard.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getHandCard(req: Request, res: Response, next: NextFunction) {
  try {
    const hc = await prisma.handCard.findUnique({ where: { id: req.params.id } });
    if (!hc) return res.status(404).end();
    res.json(hc);
  } catch (e) {
    next(e);
  }
}

export async function createHandCard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const payload: any = { ...req.body };
    delete payload.userId;

    const hc = await prisma.handCard.create({ data: payload });
    res.status(201).json(hc);
  } catch (e) {
    next(e);
  }
}

export async function updateHandCard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.handCard.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    const data: any = { ...req.body };
    delete data.userId;
    delete data.id;

    const hc = await prisma.handCard.update({ where: { id: req.params.id }, data });
    res.json(hc);
  } catch (e) {
    next(e);
  }
}

export async function deleteHandCard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.handCard.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.handCard.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listHandCards, getHandCard, createHandCard, updateHandCard, deleteHandCard };
