"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.get('/me', async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, name: true, email: true, role: true, status: true, plan: true,
                planExpiry: true, coins: true, xp: true, level: true, avatar: true, banner: true,
                bio: true, whatsapp: true, location: true, language: true, timezone: true,
                currency: true, theme: true, emailVerified: true, twoFactorEnabled: true,
                referralCode: true, lastLogin: true, createdAt: true,
                _count: { select: { bots: true, servers: true } },
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
router.patch('/me', async (req, res) => {
    try {
        const { name, bio, whatsapp, location, language, timezone, currency, theme } = req.body;
        const updated = await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: { name, bio, whatsapp, location, language, timezone, currency, theme },
            select: { id: true, name: true, bio: true, whatsapp: true, location: true, language: true, timezone: true, currency: true, theme: true },
        });
        (0, response_1.sendSuccess)(res, updated, 'Profil mis à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur mise à jour', 500);
    }
});
router.patch('/me/password', async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword)
            return (0, response_1.sendError)(res, 'Ancien et nouveau mot de passe requis', 400);
        if (newPassword.length < 8)
            return (0, response_1.sendError)(res, 'Nouveau mot de passe trop court', 400);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user?.password)
            return (0, response_1.sendError)(res, 'Impossible de changer le mot de passe', 400);
        const valid = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!valid)
            return (0, response_1.sendError)(res, 'Ancien mot de passe incorrect', 400);
        const hashed = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
        (0, response_1.sendSuccess)(res, null, 'Mot de passe mis à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/me/stats', async (req, res) => {
    try {
        const userId = req.user.id;
        const [user, botsCount, serversCount, txTotal, txToday] = await Promise.all([
            prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { coins: true, plan: true, planExpiry: true } }),
            prisma_1.prisma.bot.count({ where: { userId, status: 'RUNNING' } }),
            prisma_1.prisma.server.count({ where: { userId, status: 'ONLINE' } }),
            prisma_1.prisma.transaction.aggregate({ where: { userId, amount: { gt: 0 } }, _sum: { amount: true } }),
            prisma_1.prisma.transaction.findFirst({ where: { userId, type: 'DAILY_BONUS', createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
        ]);
        const deployedToday = await prisma_1.prisma.transaction.count({
            where: { userId, type: 'DEPLOY_BOT', createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
        });
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/me/sessions', async (req, res) => {
    try {
        const sessions = await prisma_1.prisma.session.findMany({
            where: { userId: req.user.id, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
        });
        (0, response_1.sendSuccess)(res, sessions);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/me/sessions/:id', async (req, res) => {
    try {
        await prisma_1.prisma.session.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
        (0, response_1.sendSuccess)(res, null, 'Session révoquée');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/me', async (req, res) => {
    try {
        const { password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (user?.password) {
            if (!password)
                return (0, response_1.sendError)(res, 'Mot de passe requis', 400);
            const valid = await bcryptjs_1.default.compare(password, user.password);
            if (!valid)
                return (0, response_1.sendError)(res, 'Mot de passe incorrect', 400);
        }
        await prisma_1.prisma.user.delete({ where: { id: req.user.id } });
        (0, response_1.sendSuccess)(res, null, 'Compte supprimé');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/lookup/:id', async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, name: true, avatar: true },
        });
        if (!user)
            return (0, response_1.sendError)(res, 'Utilisateur non trouvé', 404);
        (0, response_1.sendSuccess)(res, user);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.default = router;
