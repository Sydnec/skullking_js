import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../common/authMiddleware';

export async function listPredictions(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await prisma.prediction.findMany());
  } catch (e) {
    next(e);
  }
}

export async function getPrediction(req: Request, res: Response, next: NextFunction) {
  try {
    const p = await prisma.prediction.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).end();
    res.json(p);
  } catch (e) {
    next(e);
  }
}

export async function createPrediction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const payload: any = { ...req.body };
    delete payload.userId;

    const p = await prisma.prediction.create({ data: payload });
    res.status(201).json(p);
  } catch (e) {
    next(e);
  }
}

export async function updatePrediction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.prediction.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    const data: any = { ...req.body };
    delete data.userId;
    delete data.id;

    const p = await prisma.prediction.update({ where: { id: req.params.id }, data });
    res.json(p);
  } catch (e) {
    next(e);
  }
}

export async function deletePrediction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await prisma.prediction.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).end();
    // @ts-ignore
    if (existing.userId && existing.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.prediction.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listPredictions, getPrediction, createPrediction, updatePrediction, deletePrediction };
