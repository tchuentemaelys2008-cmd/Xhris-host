import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { generateTokens, verifyRefreshToken, generateEmailToken, generatePasswordResetToken, verifyEmailToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../utils/email';
import { createNotification } from '../notifications/notifications.service';

// ============ REGISTER ============
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, referralCode } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Tous les champs sont requis' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Un compte existe déjà avec cet email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verifyToken = generateEmailToken('temp');

    // Handle referral
    let referrer = null;
    if (referralCode) {
      referrer = await prisma.user.findUnique({ where: { referralCode } });
    }

    const user = await prisma.$transaction(async (tx) => {
      // Create user with 10 welcome coins
      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase(),
          password: hashedPassword,
          coins: 10,
          referredBy: referrer?.id,
        },
      });

      // Welcome bonus transaction
      await tx.transaction.create({
        data: {
          userId: newUser.id,
          type: 'ADMIN_GRANT',
          description: 'Bonus de bienvenue',
          amount: 10,
          status: 'COMPLETED',
        },
      });

      // Referral bonus
      if (referrer) {
        await tx.user.update({ where: { id: referrer.id }, data: { coins: { increment: 10 } } });
        await tx.transaction.create({
          data: {
            userId: referrer.id,
            type: 'REFERRAL',
            description: `Parrainage de ${newUser.name}`,
            amount: 10,
            status: 'COMPLETED',
          },
        });
        await tx.referral.create({
          data: { referrerId: referrer.id, referredId: newUser.id, coinsEarned: 10 },
        });
      }

      // Welcome notification
      await tx.notification.create({
        data: {
          userId: newUser.id,
          title: 'Bienvenue sur XHRIS Host ! 🎉',
          message: 'Votre compte a été créé avec succès. Vous avez reçu 10 coins de bienvenue.',
          type: 'SUCCESS',
        },
      });

      return newUser;
    });

    // Send verification email
    try { await sendVerificationEmail(user.email, user.name, verifyToken); } catch { /* don't fail registration */ }
    try { await sendWelcomeEmail(user.email, user.name); } catch { /* don't fail registration */ }

    const { accessToken, refreshToken, sessionId } = generateTokens({
      userId: user.id, email: user.email, role: user.role,
    });

    // Save session
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        token: accessToken,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info(`New user registered: ${user.email}`);

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, coins: user.coins, plan: user.plan },
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de l\'inscription' });
  }
};

// ============ LOGIN ============
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }
    if (user.status === 'BANNED') {
      return res.status(403).json({ success: false, message: `Compte banni. Raison: ${user.bannedReason || 'Non spécifiée'}` });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await prisma.loginHistory.create({ data: { userId: user.id, ip: req.ip, success: false } });
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }

    const { accessToken, refreshToken, sessionId } = generateTokens({
      userId: user.id, email: user.email, role: user.role,
    });

    await prisma.$transaction([
      prisma.session.create({
        data: { id: sessionId, userId: user.id, token: accessToken, ip: req.ip, userAgent: req.headers['user-agent'], expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }),
      prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date(), lastLoginIp: req.ip } }),
      prisma.loginHistory.create({ data: { userId: user.id, ip: req.ip, success: true, device: req.headers['user-agent'] } }),
    ]);

    logger.info(`User logged in: ${user.email}`);
    return res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, coins: user.coins, avatar: user.avatar, emailVerified: user.emailVerified },
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Erreur de connexion' });
  }
};

// ============ LOGOUT ============
export const logout = async (req: any, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    }
    return res.json({ success: true, message: 'Déconnexion réussie' });
  } catch {
    return res.json({ success: true, message: 'Déconnexion réussie' });
  }
};

// ============ REFRESH TOKEN ============
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token de rafraîchissement requis' });

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, name: true, status: true },
    });
    if (!user || user.status === 'BANNED') {
      return res.status(401).json({ success: false, message: 'Token invalide' });
    }

    const { accessToken, refreshToken: newRefresh, sessionId } = generateTokens({ userId: user.id, email: user.email, role: user.role });
    await prisma.session.create({
      data: { id: sessionId, userId: user.id, token: accessToken, ip: req.ip, userAgent: req.headers['user-agent'], expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    return res.json({ success: true, data: { token: accessToken, refreshToken: newRefresh } });
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

// ============ FORGOT PASSWORD ============
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email requis' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return success for security
    if (!user) return res.json({ success: true, message: 'Si cet email existe, vous recevrez un lien de réinitialisation.' });

    const resetToken = generatePasswordResetToken(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifyToken: resetToken } });
    await sendPasswordResetEmail(user.email, user.name, resetToken).catch(() => {});

    return res.json({ success: true, message: 'Si cet email existe, vous recevrez un lien de réinitialisation.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur lors de la demande de réinitialisation' });
  }
};

// ============ RESET PASSWORD ============
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token et mot de passe requis' });
    if (password.length < 8) return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });

    const payload = verifyEmailToken(token);
    if (payload.type !== 'password_reset') return res.status(400).json({ success: false, message: 'Token invalide' });

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { password: hashedPassword, emailVerifyToken: null },
    });
    // Revoke all sessions
    await prisma.session.deleteMany({ where: { userId: payload.userId } });

    return res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch {
    return res.status(400).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

// ============ VERIFY EMAIL ============
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token requis' });

    const payload = verifyEmailToken(token);
    if (payload.type !== 'email_verify') return res.status(400).json({ success: false, message: 'Token invalide' });

    await prisma.user.update({
      where: { id: payload.userId },
      data: { emailVerified: true, emailVerifyToken: null },
    });

    return res.json({ success: true, message: 'Email vérifié avec succès' });
  } catch {
    return res.status(400).json({ success: false, message: 'Token invalide ou expiré' });
  }
};

// ============ GOOGLE AUTH ============
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { token: googleToken } = req.body;
    if (!googleToken) return res.status(400).json({ success: false, message: 'Token Google requis' });

    // Verify Google token
    const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${googleToken}`);
    if (!googleRes.ok) return res.status(401).json({ success: false, message: 'Token Google invalide' });
    const googleData: any = await googleRes.json();

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: googleData.sub }, { email: googleData.email }] },
    });

    if (!user) {
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: googleData.name || googleData.email.split('@')[0],
            email: googleData.email,
            googleId: googleData.sub,
            avatar: googleData.picture,
            emailVerified: true,
            coins: 10,
          },
        });
        await tx.transaction.create({
          data: { userId: newUser.id, type: 'ADMIN_GRANT', description: 'Bonus de bienvenue', amount: 10, status: 'COMPLETED' },
        });
        return newUser;
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: googleData.sub, emailVerified: true } });
    }

    if (user.status === 'BANNED') return res.status(403).json({ success: false, message: 'Compte banni' });

    const { accessToken, refreshToken, sessionId } = generateTokens({ userId: user.id, email: user.email, role: user.role });
    await prisma.session.create({
      data: { id: sessionId, userId: user.id, token: accessToken, ip: req.ip, userAgent: req.headers['user-agent'], expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    return res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, coins: user.coins, avatar: user.avatar },
        token: accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Google auth error:', error);
    return res.status(500).json({ success: false, message: 'Erreur d\'authentification Google' });
  }
};

// ============ GET ME ============
export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true, plan: true, planExpiry: true,
        coins: true, xp: true, level: true, avatar: true, banner: true, bio: true,
        whatsapp: true, location: true, language: true, timezone: true, currency: true, theme: true,
        emailVerified: true, twoFactorEnabled: true, referralCode: true, lastLogin: true, createdAt: true,
        _count: { select: { bots: true, servers: true } },
        subscription: true,
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    return res.json({ success: true, data: user });
  } catch (error) {
    logger.error('GetMe error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
