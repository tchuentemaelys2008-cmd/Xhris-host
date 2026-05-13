"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.googleAuth = exports.verifyEmail = exports.resetPassword = exports.forgotPassword = exports.refreshToken = exports.logout = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../utils/prisma");
const jwt_1 = require("../utils/jwt");
const logger_1 = require("../utils/logger");
const email_1 = require("../utils/email");
const register = async (req, res) => {
    try {
        const { name, email, password, referralCode } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Tous les champs sont requis' });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Un compte existe déjà avec cet email' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const verifyToken = (0, jwt_1.generateEmailToken)('temp');
        let referrer = null;
        if (referralCode) {
            referrer = await prisma_1.prisma.user.findUnique({ where: { referralCode } });
        }
        const user = await prisma_1.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    name: name.trim(),
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    coins: 10,
                    referredBy: referrer?.id,
                },
            });
            await tx.transaction.create({
                data: {
                    userId: newUser.id,
                    type: 'ADMIN_GRANT',
                    description: 'Bonus de bienvenue',
                    amount: 10,
                    status: 'COMPLETED',
                },
            });
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
        try {
            await (0, email_1.sendVerificationEmail)(user.email, user.name, verifyToken);
        }
        catch { }
        try {
            await (0, email_1.sendWelcomeEmail)(user.email, user.name);
        }
        catch { }
        const { accessToken, refreshToken, sessionId } = (0, jwt_1.generateTokens)({
            userId: user.id, email: user.email, role: user.role,
        });
        await prisma_1.prisma.session.create({
            data: {
                id: sessionId,
                userId: user.id,
                token: accessToken,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        logger_1.logger.info(`New user registered: ${user.email}`);
        return res.status(201).json({
            success: true,
            message: 'Compte créé avec succès',
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role, coins: user.coins, plan: user.plan },
                token: accessToken,
                refreshToken,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Register error:', error);
        return res.status(500).json({ success: false, message: 'Erreur lors de l\'inscription' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.password) {
            return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
        }
        if (user.status === 'BANNED') {
            return res.status(403).json({ success: false, message: `Compte banni. Raison: ${user.bannedReason || 'Non spécifiée'}` });
        }
        const isValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isValid) {
            await prisma_1.prisma.loginHistory.create({ data: { userId: user.id, ip: req.ip, success: false } });
            return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
        }
        const { accessToken, refreshToken, sessionId } = (0, jwt_1.generateTokens)({
            userId: user.id, email: user.email, role: user.role,
        });
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.session.create({
                data: { id: sessionId, userId: user.id, token: accessToken, ip: req.ip, userAgent: req.headers['user-agent'], expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            }),
            prisma_1.prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date(), lastLoginIp: req.ip } }),
            prisma_1.prisma.loginHistory.create({ data: { userId: user.id, ip: req.ip, success: true, device: req.headers['user-agent'] } }),
        ]);
        logger_1.logger.info(`User logged in: ${user.email}`);
        return res.json({
            success: true,
            message: 'Connexion réussie',
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, coins: user.coins, avatar: user.avatar, emailVerified: user.emailVerified },
                token: accessToken,
                refreshToken,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Erreur de connexion' });
    }
};
exports.login = login;
const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            await prisma_1.prisma.session.deleteMany({ where: { token } }).catch(() => { });
        }
        return res.json({ success: true, message: 'Déconnexion réussie' });
    }
    catch {
        return res.json({ success: true, message: 'Déconnexion réussie' });
    }
};
exports.logout = logout;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        if (!token)
            return res.status(400).json({ success: false, message: 'Token de rafraîchissement requis' });
        const payload = (0, jwt_1.verifyRefreshToken)(token);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, name: true, status: true },
        });
        if (!user || user.status === 'BANNED') {
            return res.status(401).json({ success: false, message: 'Token invalide' });
        }
        const { accessToken, refreshToken: newRefresh, sessionId } = (0, jwt_1.generateTokens)({ userId: user.id, email: user.email, role: user.role });
        await prisma_1.prisma.session.create({
            data: { id: sessionId, userId: user.id, token: accessToken, ip: req.ip, userAgent: req.headers['user-agent'], expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        });
        return res.json({ success: true, data: { token: accessToken, refreshToken: newRefresh } });
    }
    catch {
        return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
    }
};
exports.refreshToken = refreshToken;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ success: false, message: 'Email requis' });
        const user = await prisma_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user)
            return res.json({ success: true, message: 'Si cet email existe, vous recevrez un lien de réinitialisation.' });
        const resetToken = (0, jwt_1.generatePasswordResetToken)(user.id);
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { emailVerifyToken: resetToken } });
        await (0, email_1.sendPasswordResetEmail)(user.email, user.name, resetToken).catch(() => { });
        return res.json({ success: true, message: 'Si cet email existe, vous recevrez un lien de réinitialisation.' });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur lors de la demande de réinitialisation' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password)
            return res.status(400).json({ success: false, message: 'Token et mot de passe requis' });
        if (password.length < 8)
            return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' });
        const payload = (0, jwt_1.verifyEmailToken)(token);
        if (payload.type !== 'password_reset')
            return res.status(400).json({ success: false, message: 'Token invalide' });
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        await prisma_1.prisma.user.update({
            where: { id: payload.userId },
            data: { password: hashedPassword, emailVerifyToken: null },
        });
        await prisma_1.prisma.session.deleteMany({ where: { userId: payload.userId } });
        return res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
    }
    catch {
        return res.status(400).json({ success: false, message: 'Token invalide ou expiré' });
    }
};
exports.resetPassword = resetPassword;
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token)
            return res.status(400).json({ success: false, message: 'Token requis' });
        const payload = (0, jwt_1.verifyEmailToken)(token);
        if (payload.type !== 'email_verify')
            return res.status(400).json({ success: false, message: 'Token invalide' });
        await prisma_1.prisma.user.update({
            where: { id: payload.userId },
            data: { emailVerified: true, emailVerifyToken: null },
        });
        return res.json({ success: true, message: 'Email vérifié avec succès' });
    }
    catch {
        return res.status(400).json({ success: false, message: 'Token invalide ou expiré' });
    }
};
exports.verifyEmail = verifyEmail;
const googleAuth = async (req, res) => {
    try {
        const { token: googleToken } = req.body;
        if (!googleToken)
            return res.status(400).json({ success: false, message: 'Token Google requis' });
        const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${googleToken}`);
        if (!googleRes.ok)
            return res.status(401).json({ success: false, message: 'Token Google invalide' });
        const googleData = await googleRes.json();
        let user = await prisma_1.prisma.user.findFirst({
            where: { OR: [{ googleId: googleData.sub }, { email: googleData.email }] },
        });
        if (!user) {
            user = await prisma_1.prisma.$transaction(async (tx) => {
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
        }
        else if (!user.googleId) {
            user = await prisma_1.prisma.user.update({ where: { id: user.id }, data: { googleId: googleData.sub, emailVerified: true } });
        }
        if (user.status === 'BANNED')
            return res.status(403).json({ success: false, message: 'Compte banni' });
        const { accessToken, refreshToken, sessionId } = (0, jwt_1.generateTokens)({ userId: user.id, email: user.email, role: user.role });
        await prisma_1.prisma.session.create({
            data: { id: sessionId, userId: user.id, token: accessToken, ip: req.ip, userAgent: req.headers['user-agent'], expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        });
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
        return res.json({
            success: true,
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, coins: user.coins, avatar: user.avatar },
                token: accessToken,
                refreshToken,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Google auth error:', error);
        return res.status(500).json({ success: false, message: 'Erreur d\'authentification Google' });
    }
};
exports.googleAuth = googleAuth;
const getMe = async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
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
        if (!user)
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        return res.json({ success: true, data: user });
    }
    catch (error) {
        logger_1.logger.error('GetMe error:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getMe = getMe;
