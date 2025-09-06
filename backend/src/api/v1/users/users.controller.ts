import prisma from '../../../common/prisma';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';

export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    // retourner uniquement les champs publics
    res.json(await prisma.user.findMany({ select: { id: true, name: true, createdAt: true } }));
  } catch (e) {
    next(e);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, createdAt: true } });
    if (!user) return res.status(404).end();
    res.json(user);
  } catch (e) {
    next(e);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, passwordHash } , select: { id: true, name: true, createdAt: true } });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const updateData: any = { ...req.body };
    if (updateData.password) {
      updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
      delete updateData.password;
    }
    // ne pas autoriser la mise à jour directe de passwordHash
    delete updateData.passwordHash;
    const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData, select: { id: true, name: true, createdAt: true } });
    res.json(user);
  } catch (e) {
    next(e);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { listUsers, getUser, createUser, updateUser, deleteUser };
