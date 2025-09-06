import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../common/authMiddleware';

export async function listCards(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.card.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getCard(req: Request, res: Response, next: NextFunction) {
  try {
    const c = await prisma.card.findUnique({ where: { id: req.params.id } });
    if (!c) return res.status(404).end();
    res.json(c);
  } catch (e) {
    next(e);
  }
}

export async function createCard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const payload: any = { ...req.body };
    delete payload.userId;

    const c = await prisma.card.create({ data: payload });
    res.status(201).json(c);
  } catch (e) {
    next(e);
  }
}

export async function updateCard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.card.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    const data: any = { ...req.body };
    delete data.userId;
    delete data.id;

    const c = await prisma.card.update({ where: { id: req.params.id }, data });
    res.json(c);
  } catch (e) {
    next(e);
  }
}

export async function deleteCard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.card.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.card.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listCards, getCard, createCard, updateCard, deleteCard };
