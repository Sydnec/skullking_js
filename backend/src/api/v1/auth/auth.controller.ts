import { Request, Response, NextFunction } from 'express';
import prisma from '../../../common/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import tokenStore from '../../../common/tokenStore';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_BYTES = 48;

function genRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Pseudo et mot de passe requis' });

    const existing = await prisma.user.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: "Nom d'utilisateur déjà pris" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, passwordHash } });
    const token = jwt.sign({ sub: user.id, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = genRefreshToken();
    tokenStore.saveRefreshToken(refreshToken, user.id);
    res.status(201).json({ user: { id: user.id, name: user.name }, token, refreshToken });
  } catch (e) {
    next(e);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Pseudo et mot de passe requis' });

    const user = await prisma.user.findUnique({ where: { name } });
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

    const token = jwt.sign({ sub: user.id, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = genRefreshToken();
    tokenStore.saveRefreshToken(refreshToken, user.id);
    res.json({ user: { id: user.id, name: user.name }, token, refreshToken });
  } catch (e) {
    next(e);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Jeton de rafraîchissement requis' });
    const userId = tokenStore.verifyRefreshToken(refreshToken);
    if (!userId) return res.status(401).json({ error: 'Jeton de rafraîchissement invalide' });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
    const token = jwt.sign({ sub: user.id, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token });
  } catch (e) {
    next(e);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) tokenStore.revokeRefreshToken(refreshToken);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export default { register, login, refresh, logout };
