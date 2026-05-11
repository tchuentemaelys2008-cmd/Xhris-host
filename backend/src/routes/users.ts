import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// GET /api/users/me
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, email: true, role: true, status: true, plan: true,
        planExpiry: true, coins: true, xp: true, level: true, avatar: true, banner: true,
        bio: true, whatsapp: true, location: true, language: true, timezone: true,
        currency: true, theme: true, emailVerified: true, twoFactorEnabled: true,
        referralCode: true, lastLogin: true, createdAt: true,
        _count: { select: { bots: true, servers: true } },
      },
    });
    if (!user) return sendError(res, 'Utilisateur non trouvé', 404);
    sendSuccess(res, user);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// PATCH /api/users/me
router.patch('/me', async (req: AuthRequest, res: Response) => {
  try {
    const { name, bio, whatsapp, location, language, timezone, currency, theme } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, bio, whatsapp, location, language, timezone, currency, theme },
      select: { id: true, name: true, bio: true, whatsapp: true, location: true, language: true, timezone: true, currency: true, theme: true },
    });
    sendSuccess(res, updated, 'Profil mis à jour');
  } catch (err) {
    sendError(res, 'Erreur mise à jour', 500);
  }
});

// PATCH /api/users/me/password
router.patch('/me/password', async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return sendError(res, 'Ancien et nouveau mot de passe requis', 400);
    if (newPassword.length < 8) return sendError(res, 'Nouveau mot de passe trop court', 400);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.password) return sendError(res, 'Impossible de changer le mot de passe', 400);

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return sendError(res, 'Ancien mot de passe incorrect', 400);

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user!.id }, data: { password: hashed } });
    sendSuccess(res, null, 'Mot de passe mis à jour');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/users/me/stats
router.get('/me/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const [user, botsCount, serversCount, txTotal, txToday] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { coins: true, plan: true, planExpiry: true } }),
      prisma.bot.count({ where: { userId, status: 'RUNNING' } }),
      prisma.server.count({ where: { userId, status: 'ONLINE' } }),
      prisma.transaction.aggregate({ where: { userId, amount: { gt: 0 } }, _sum: { amount: true } }),
      prisma.transaction.findFirst({ where: { userId, type: 'DAILY_BONUS', createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    ]);

    const deployedToday = await prisma.transaction.count({
      where: { userId, type: 'DEPLOY_BOT', createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }
    });

    sendSuccess(res, {
      coins: user?.coins || 0,
      plan: user?.plan || 'FREE',
      planExpiry: user?.planExpiry,
      activeBots: botsCount,
      activeServers: serversCount,
      totalEarned: txTotal._sum.amount || 0,
      deploymentsToday: deployedToday,
      deploymentsLimit: 10,
      dailyBonusClaimed: !!txToday,
    });
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/users/me/sessions
router.get('/me/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, sessions);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// DELETE /api/users/me/sessions/:id
router.delete('/me/sessions/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.session.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    sendSuccess(res, null, 'Session révoquée');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// DELETE /api/users/me
router.delete('/me', async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (user?.password) {
      if (!password) return sendError(res, 'Mot de passe requis', 400);
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return sendError(res, 'Mot de passe incorrect', 400);
    }
    await prisma.user.delete({ where: { id: req.user!.id } });
    sendSuccess(res, null, 'Compte supprimé');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});


// GET /api/users/lookup/:id  — recherche publique (nom + avatar uniquement)
router.get('/lookup/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, avatar: true },
    });
    if (!user) return sendError(res, 'Utilisateur non trouvé', 404);
    sendSuccess(res, user);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

export default router;
