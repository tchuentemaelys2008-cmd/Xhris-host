import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
    coins: number;
    plan: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token manquant' });
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, name: true, coins: true, plan: true, status: true },
    });
    if (!user) return res.status(401).json({ success: false, message: 'Utilisateur non trouvé' });
    if (user.status === 'BANNED') return res.status(403).json({ success: false, message: 'Compte banni' });
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name, coins: user.coins, plan: user.plan };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Non authentifié' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    next();
  };
};

export const requireAdmin = requireRole('ADMIN', 'SUPERADMIN');
export const requireModerator = requireRole('MODERATOR', 'ADMIN', 'SUPERADMIN');

// Optional auth - doesn't fail if no token
export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, name: true, coins: true, plan: true, status: true },
    });
    if (user && user.status !== 'BANNED') {
      req.user = { id: user.id, email: user.email, role: user.role, name: user.name, coins: user.coins, plan: user.plan };
    }
  } catch { /* ignore */ }
  next();
};

// API Key auth for external integrations
export const apiKeyAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) return res.status(401).json({ success: false, message: 'Clé API manquante' });
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: { select: { id: true, email: true, role: true, name: true, coins: true, plan: true, status: true } } },
    });
    if (!key || key.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Clé API invalide ou révoquée' });
    }
    if (key.user.status === 'BANNED') {
      return res.status(403).json({ success: false, message: 'Compte banni' });
    }
    // Update last used and request count
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsed: new Date(), requestCount: { increment: 1 } },
    });
    req.user = key.user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Erreur d\'authentification API' });
  }
};
