"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'xhris-secret-key';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';
const generateToken = (user) => jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, plan: user.plan }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, referralCode } = req.body;
        if (!name || !email || !password)
            return (0, response_1.sendError)(res, 'Nom, email et mot de passe requis', 400);
        if (password.length < 8)
            return (0, response_1.sendError)(res, 'Le mot de passe doit contenir au moins 8 caractères', 400);
        if (!/\S+@\S+\.\S+/.test(email))
            return (0, response_1.sendError)(res, 'Email invalide', 400);
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            return (0, response_1.sendError)(res, 'Cet email est déjà utilisé', 409);
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const emailVerifyToken = (0, uuid_1.v4)();
        let referrerId = null;
        if (referralCode) {
            const referrer = await prisma_1.prisma.user.findUnique({ where: { referralCode } });
            if (referrer)
                referrerId = referrer.id;
        }
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                emailVerifyToken,
                coins: 10,
                referredBy: referrerId || undefined,
            },
        });
        if (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
            await prisma_1.prisma.user.update({ where: { id: user.id }, data: { role: 'SUPERADMIN' } });
            user.role = 'SUPERADMIN';
        }
        if (referrerId) {
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.user.update({ where: { id: referrerId }, data: { coins: { increment: 10 } } }),
                prisma_1.prisma.transaction.create({
                    data: { userId: referrerId, type: 'REFERRAL', description: `Parrainage de ${name}`, amount: 10 }
                }),
                prisma_1.prisma.referral.create({ data: { referrerId, referredId: user.id } }),
            ]);
        }
        await prisma_1.prisma.transaction.create({
            data: { userId: user.id, type: 'ADMIN_GRANT', description: 'Bonus de bienvenue', amount: 10 }
        });
        const channelCount = await prisma_1.prisma.channel.count();
        if (channelCount === 0) {
            await prisma_1.prisma.channel.createMany({
                data: [
                    { name: 'général', description: 'Discussion générale', type: 'TEXT', position: 0 },
                    { name: 'annonces', description: 'Annonces officielles', type: 'ANNOUNCEMENT', position: 1 },
                    { name: 'bots', description: 'Discussion sur les bots', type: 'TEXT', position: 2 },
                    { name: 'support', description: 'Aide et support', type: 'TEXT', position: 3 },
                    { name: 'suggestions', description: 'Vos suggestions', type: 'TEXT', position: 4 },
                ],
            });
        }
        logger_1.logger.info(`New user registered: ${email}`);
        const token = generateToken(user);
        const { password: _, emailVerifyToken: __, ...safeUser } = user;
        (0, response_1.sendSuccess)(res, { user: safeUser, token }, 'Compte créé avec succès', 201);
    }
    catch (err) {
        logger_1.logger.error('Register error:', err);
        (0, response_1.sendError)(res, 'Erreur lors de l\'inscription', 500);
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return (0, response_1.sendError)(res, 'Email et mot de passe requis', 400);
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user || !user.password)
            return (0, response_1.sendError)(res, 'Email ou mot de passe incorrect', 401);
        if (user.status === 'BANNED')
            return (0, response_1.sendError)(res, 'Votre compte a été suspendu', 403);
        if (user.status === 'INACTIVE')
            return (0, response_1.sendError)(res, 'Votre compte est inactif', 403);
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            await prisma_1.prisma.loginHistory.create({
                data: { userId: user.id, ip: req.ip, device: req.headers['user-agent'] || '', success: false }
            });
            return (0, response_1.sendError)(res, 'Email ou mot de passe incorrect', 401);
        }
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date(), lastLoginIp: req.ip } });
        await prisma_1.prisma.loginHistory.create({
            data: { userId: user.id, ip: req.ip, device: req.headers['user-agent'] || '', success: true }
        });
        const token = generateToken(user);
        const { password: _, emailVerifyToken: __, twoFactorSecret: ___, ...safeUser } = user;
        (0, response_1.sendSuccess)(res, { user: safeUser, token }, 'Connexion réussie');
    }
    catch (err) {
        logger_1.logger.error('Login error:', err);
        (0, response_1.sendError)(res, 'Erreur lors de la connexion', 500);
    }
});
router.post('/google', async (req, res) => {
    try {
        const { token: googleToken } = req.body;
        if (!googleToken)
            return (0, response_1.sendError)(res, 'Token Google manquant', 400);
        const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${googleToken}`);
        const googleData = await googleRes.json();
        if (!googleRes.ok || !googleData.email)
            return (0, response_1.sendError)(res, 'Token Google invalide', 401);
        let user = await prisma_1.prisma.user.findFirst({ where: { OR: [{ googleId: googleData.sub }, { email: googleData.email }] } });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    name: googleData.name || googleData.email.split('@')[0],
                    email: googleData.email,
                    googleId: googleData.sub,
                    avatar: googleData.picture,
                    emailVerified: true,
                    coins: 10,
                },
            });
            await prisma_1.prisma.transaction.create({
                data: { userId: user.id, type: 'ADMIN_GRANT', description: 'Bonus de bienvenue', amount: 10 }
            });
        }
        else if (!user.googleId) {
            await prisma_1.prisma.user.update({ where: { id: user.id }, data: { googleId: googleData.sub, emailVerified: true } });
        }
        if (user.status === 'BANNED')
            return (0, response_1.sendError)(res, 'Votre compte a été suspendu', 403);
        const jwtToken = generateToken(user);
        const { password: _, emailVerifyToken: __, twoFactorSecret: ___, ...safeUser } = user;
        (0, response_1.sendSuccess)(res, { user: safeUser, token: jwtToken }, 'Connexion Google réussie');
    }
    catch (err) {
        logger_1.logger.error('Google auth error:', err);
        (0, response_1.sendError)(res, 'Erreur authentification Google', 500);
    }
});
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return (0, response_1.sendError)(res, 'Email requis', 400);
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (user) {
            const token = (0, uuid_1.v4)();
            await prisma_1.prisma.user.update({ where: { id: user.id }, data: { emailVerifyToken: token } });
            logger_1.logger.info(`Password reset requested for: ${email}, token: ${token}`);
        }
        (0, response_1.sendSuccess)(res, null, 'Si cet email existe, un lien de réinitialisation a été envoyé.');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password)
            return (0, response_1.sendError)(res, 'Token et mot de passe requis', 400);
        if (password.length < 8)
            return (0, response_1.sendError)(res, 'Mot de passe trop court', 400);
        const user = await prisma_1.prisma.user.findFirst({ where: { emailVerifyToken: token } });
        if (!user)
            return (0, response_1.sendError)(res, 'Token invalide ou expiré', 400);
        const hashed = await bcryptjs_1.default.hash(password, 12);
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { password: hashed, emailVerifyToken: null } });
        (0, response_1.sendSuccess)(res, null, 'Mot de passe réinitialisé avec succès');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        const user = await prisma_1.prisma.user.findFirst({ where: { emailVerifyToken: token } });
        if (!user)
            return (0, response_1.sendError)(res, 'Token invalide', 400);
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, emailVerifyToken: null } });
        (0, response_1.sendSuccess)(res, null, 'Email vérifié avec succès');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/me', auth_1.authMiddleware, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, name: true, email: true, role: true, status: true, plan: true,
                planExpiry: true, coins: true, xp: true, level: true, avatar: true, banner: true,
                bio: true, whatsapp: true, location: true, language: true, timezone: true,
                currency: true, theme: true, emailVerified: true, twoFactorEnabled: true,
                referralCode: true, lastLogin: true, createdAt: true,
            },
        });
        if (!user)
            return (0, response_1.sendError)(res, 'Utilisateur non trouvé', 404);
        (0, response_1.sendSuccess)(res, user);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/logout', auth_1.authMiddleware, async (req, res) => {
    try {
        (0, response_1.sendSuccess)(res, null, 'Déconnexion réussie');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.default = router;
