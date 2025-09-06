import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../common/authMiddleware';

export async function listHands(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.hand.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getHand(req: Request, res: Response, next: NextFunction) {
  try {
    const h = await prisma.hand.findUnique({ where: { id: req.params.id } });
    if (!h) return res.status(404).end();
    res.json(h);
  } catch (e) {
    next(e);
  }
}

export async function createHand(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const payload: any = { ...req.body };
    delete payload.userId;

    const h = await prisma.hand.create({ data: payload });
    res.status(201).json(h);
  } catch (e) {
    next(e);
  }
}

export async function updateHand(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.hand.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    const data: any = { ...req.body };
    delete data.userId;
    delete data.id;

    const h = await prisma.hand.update({ where: { id: req.params.id }, data });
    res.json(h);
  } catch (e) {
    next(e);
  }
}

export async function deleteHand(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.hand.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.hand.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listHands, getHand, createHand, updateHand, deleteHand };
