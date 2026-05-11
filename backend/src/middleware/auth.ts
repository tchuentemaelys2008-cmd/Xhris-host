import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; plan: string };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  // API key auth
  if (apiKey) {
    // Validate API key from DB (simplified - in production query DB)
    if (apiKey.startsWith('xhs_live_') || apiKey.startsWith('xhs_test_')) {
      req.user = { id: 'api-user', email: 'api@xhris.host', role: 'USER', plan: 'FREE' };
      return next();
    }
    return sendError(res, 'Clé API invalide', 401);
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Token d\'authentification manquant', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'xhris-secret-key') as any;
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role, plan: decoded.plan };
    next();
  } catch (err) {
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
