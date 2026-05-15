import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; plan: string };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
  const authHeader = req.headers.authorization || (queryToken ? `Bearer ${queryToken}` : undefined);
  const apiKey = req.headers['x-api-key'] as string;

  // API key auth — query DB for real validation
  if (apiKey) {
    try {
      const keyRecord = await prisma.apiKey.findFirst({
        where: { key: apiKey, status: 'ACTIVE' },
        include: { user: { select: { id: true, email: true, role: true, plan: true, status: true } } },
      });
      if (!keyRecord) return sendError(res, 'Clé API invalide', 401);
      if ((keyRecord.user as any).status === 'BANNED') return sendError(res, 'Compte suspendu', 403);
      // Update usage stats (fire and forget)
      prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsed: new Date(), requestCount: { increment: 1 } },
      }).catch(() => {});
      req.user = {
        id: keyRecord.user.id,
        email: keyRecord.user.email,
        role: keyRecord.user.role,
        plan: keyRecord.user.plan || 'FREE',
      };
      return next();
    } catch {
      return sendError(res, 'Clé API invalide', 401);
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Token d\'authentification manquant', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'xhris-secret-key') as any;
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role, plan: decoded.plan };
    next();
  } catch {
    return sendError(res, 'Token invalide ou expiré', 401);
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
    return sendError(res, 'Accès administrateur requis', 403);
  }
  next();
};

export const premiumMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.plan === 'FREE') {
    return sendError(res, 'Abonnement Premium requis', 403);
  }
  next();
};
