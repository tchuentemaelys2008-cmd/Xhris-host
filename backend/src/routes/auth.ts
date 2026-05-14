import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'xhris-secret-key';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';

const generateToken = (user: any) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, plan: user.plan }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, referralCode } = req.body;

    if (!name || !email || !password) return sendError(res, 'Nom, email et mot de passe requis', 400);
    if (password.length < 8) return sendError(res, 'Le mot de passe doit contenir au moins 8 caractères', 400);
    if (!/\S+@\S+\.\S+/.test(email)) return sendError(res, 'Email invalide', 400);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return sendError(res, 'Cet email est déjà utilisé', 409);

    const hashedPassword = await bcrypt.hash(password, 12);
    const emailVerifyToken = uuidv4();

    // Find referrer
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (referrer) referrerId = referrer.id;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerifyToken,
        coins: 10, // Welcome bonus
        referredBy: referrerId || undefined,
      },
    });

    // Auto-promote to SUPERADMIN if email matches ADMIN_EMAIL env
    if (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
      await prisma.user.update({ where: { id: user.id }, data: { role: 'SUPERADMIN' } });
      (user as any).role = 'SUPERADMIN';
    }

    // Give referrer bonus
    if (referrerId) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: referrerId }, data: { coins: { increment: 10 } } }),
        prisma.transaction.create({
          data: { userId: referrerId, type: 'REFERRAL', description: `Parrainage de ${name}`, amount: 10 }
        }),
        prisma.referral.create({ data: { referrerId, referredId: user.id } }),
      ]);
    }

    // Welcome transaction
    await prisma.transaction.create({
      data: { userId: user.id, type: 'ADMIN_GRANT', description: 'Bonus de bienvenue', amount: 10 }
    });

    // Create default channels if first user
    const channelCount = await prisma.channel.count();
    if (channelCount === 0) {
      await prisma.channel.createMany({
        data: [
          { name: 'général', description: 'Discussion générale', type: 'TEXT', position: 0 },
          { name: 'annonces', description: 'Annonces officielles', type: 'ANNOUNCEMENT', position: 1 },
          { name: 'bots', description: 'Discussion sur les bots', type: 'TEXT', position: 2 },
          { name: 'support', description: 'Aide et support', type: 'TEXT', position: 3 },
          { name: 'suggestions', description: 'Vos suggestions', type: 'TEXT', position: 4 },
        ],
      });
    }

    // Send welcome email (simplified)
    logger.info(`New user registered: ${email}`);

    const token = generateToken(user);
    const { password: _, emailVerifyToken: __, ...safeUser } = user;

    sendSuccess(res, { user: safeUser, token }, 'Compte créé avec succès', 201);
  } catch (err: any) {
    logger.error('Register error:', err);
    sendError(res, 'Erreur lors de l\'inscription', 500);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 'Email et mot de passe requis', 400);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return sendError(res, 'Email ou mot de passe incorrect', 401);
    if (user.status === 'BANNED') return sendError(res, 'Votre compte a été suspendu', 403);
    if (user.status === 'INACTIVE') return sendError(res, 'Votre compte est inactif', 403);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await prisma.loginHistory.create({
        data: { userId: user.id, ip: req.ip, device: req.headers['user-agent'] || '', success: false }
      });
      return sendError(res, 'Email ou mot de passe incorrect', 401);
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date(), lastLoginIp: req.ip } });
    await prisma.loginHistory.create({
      data: { userId: user.id, ip: req.ip, device: req.headers['user-agent'] || '', success: true }
    });

    const token = generateToken(user);
    const { password: _, emailVerifyToken: __, twoFactorSecret: ___, ...safeUser } = user;

    sendSuccess(res, { user: safeUser, token }, 'Connexion réussie');
  } catch (err) {
    logger.error('Login error:', err);
    sendError(res, 'Erreur lors de la connexion', 500);
  }
});

// POST /api/auth/google
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { token: googleToken } = req.body;
    if (!googleToken) return sendError(res, 'Token Google manquant', 400);

    // Verify Google token
    const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${googleToken}`);
    const googleData = await googleRes.json() as any;

    if (!googleRes.ok || !googleData.email) return sendError(res, 'Token Google invalide', 401);

    let user = await prisma.user.findFirst({ where: { OR: [{ googleId: googleData.sub }, { email: googleData.email }] } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: googleData.name || googleData.email.split('@')[0],
          email: googleData.email,
          googleId: googleData.sub,
          avatar: googleData.picture,
          emailVerified: true,
          coins: 10,
        },
      });
      await prisma.transaction.create({
        data: { userId: user.id, type: 'ADMIN_GRANT', description: 'Bonus de bienvenue', amount: 10 }
      });
    } else if (!user.googleId) {
      await prisma.user.update({ where: { id: user.id }, data: { googleId: googleData.sub, emailVerified: true } });
    }

    if (user.status === 'BANNED') return sendError(res, 'Votre compte a été suspendu', 403);

    const jwtToken = generateToken(user);
    const { password: _, emailVerifyToken: __, twoFactorSecret: ___, ...safeUser } = user;
    sendSuccess(res, { user: safeUser, token: jwtToken }, 'Connexion Google réussie');
  } catch (err) {
    logger.error('Google auth error:', err);
    sendError(res, 'Erreur authentification Google', 500);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, 'Email requis', 400);

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (user) {
      const token = uuidv4();
      await prisma.user.update({ where: { id: user.id }, data: { emailVerifyToken: token } });
      // In production: send reset email
      logger.info(`Password reset requested for: ${email}, token: ${token}`);
    }
    sendSuccess(res, null, 'Si cet email existe, un lien de réinitialisation a été envoyé.');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return sendError(res, 'Token et mot de passe requis', 400);
    if (password.length < 8) return sendError(res, 'Mot de passe trop court', 400);

    const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) return sendError(res, 'Token invalide ou expiré', 400);

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed, emailVerifyToken: null } });
    sendSuccess(res, null, 'Mot de passe réinitialisé avec succès');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) return sendError(res, 'Token invalide', 400);
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, emailVerifyToken: null } });
    sendSuccess(res, null, 'Email vérifié avec succès');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, email: true, role: true, status: true, plan: true,
        planExpiry: true, coins: true, xp: true, level: true, avatar: true, banner: true,
        bio: true, whatsapp: true, location: true, language: true, timezone: true,
        currency: true, theme: true, emailVerified: true, twoFactorEnabled: true,
        referralCode: true, lastLogin: true, createdAt: true,
      },
    });
    if (!user) return sendError(res, 'Utilisateur non trouvé', 404);
    sendSuccess(res, user);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // In production: invalidate token in Redis
    sendSuccess(res, null, 'Déconnexion réussie');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Verification Flow
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/whatsapp/request — Connector requests a code (no auth)
router.post('/whatsapp/request', async (req: Request, res: Response) => {
  try {
    const { whatsappJid } = req.body;
    if (!whatsappJid) return sendError(res, 'WhatsApp JID requis', 400);

    // Cooldown: 1 minute between requests from same JID
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recent = await (prisma as any).whatsAppVerification.findFirst({
      where: { whatsappJid, createdAt: { gte: oneMinuteAgo } },
    });
    if (recent) return sendError(res, 'Attendez 1 minute avant de demander un nouveau code', 429);

    const code = String(Math.floor(100_000 + Math.random() * 900_000));
    const { randomUUID } = await import('crypto');
    const requestId = randomUUID();
    const expiresAt = new Date(Date.now() + 3 * 60_000);

    await (prisma as any).whatsAppVerification.create({
      data: { requestId, code, whatsappJid, expiresAt },
    });

    // Clean up expired codes (fire and forget)
    (prisma as any).whatsAppVerification.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});

    const frontendUrl = process.env.FRONTEND_URL || 'https://xhrishost.site';
    sendSuccess(res, {
      requestId,
      verifyLink: `${frontendUrl}/dashboard?verify=${requestId}`,
      expiresIn: 180,
    }, 'Code de vérification créé');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/auth/whatsapp/code/:requestId — Dashboard fetches the code (JWT auth required)
router.get('/whatsapp/code/:requestId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const verification = await (prisma as any).whatsAppVerification.findUnique({
      where: { requestId: req.params.requestId },
    });
    if (!verification) return sendError(res, 'Demande non trouvée', 404);
    if (verification.status !== 'PENDING') return sendError(res, 'Code déjà utilisé', 400);
    if (verification.expiresAt < new Date()) {
      await (prisma as any).whatsAppVerification.update({ where: { id: verification.id }, data: { status: 'EXPIRED' } });
      return sendError(res, 'Code expiré', 410);
    }
    // Link code to the authenticated user
    await (prisma as any).whatsAppVerification.update({
      where: { id: verification.id },
      data: { userId: req.user!.id },
    });
    sendSuccess(res, { code: verification.code, expiresAt: verification.expiresAt, whatsappJid: verification.whatsappJid });
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/auth/whatsapp/verify — Connector submits the code (no auth)
router.post('/whatsapp/verify', async (req: Request, res: Response) => {
  try {
    const { requestId, code, whatsappJid } = req.body;
    if (!requestId || !code) return sendError(res, 'RequestId et code requis', 400);

    const verification = await (prisma as any).whatsAppVerification.findUnique({ where: { requestId } });
    if (!verification) return sendError(res, 'Demande non trouvée', 404);
    if (verification.status !== 'PENDING') return sendError(res, 'Code déjà utilisé', 400);
    if (verification.expiresAt < new Date()) {
      await (prisma as any).whatsAppVerification.update({ where: { id: verification.id }, data: { status: 'EXPIRED' } });
      return sendError(res, 'Code expiré — retapez .xhrishost', 410);
    }
    if (verification.code !== code) return sendError(res, 'Code incorrect', 401);
    if (!verification.userId) return sendError(res, 'Ouvrez le lien dans votre navigateur pour valider le code', 400);

    await (prisma as any).whatsAppVerification.update({
      where: { id: verification.id },
      data: { status: 'VERIFIED', whatsappJid: whatsappJid || verification.whatsappJid },
    });

    // Get or create API key for this user
    const userId = verification.userId;
    let apiKey = await prisma.apiKey.findFirst({ where: { userId, status: 'ACTIVE' }, select: { key: true } });
    if (!apiKey) {
      const { randomBytes } = await import('crypto');
      const newKey = `xhs_live_${randomBytes(20).toString('hex')}`;
      apiKey = await prisma.apiKey.create({
        data: { userId, name: 'Clé WhatsApp auto', key: newKey, permissions: ['read', 'write', 'bots', 'servers', 'coins'] },
        select: { key: true },
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, coins: true, plan: true } });
    sendSuccess(res, { apiKey: apiKey.key, user }, 'Connexion WhatsApp réussie');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

export default router;
