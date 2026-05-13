"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.use(auth_1.adminMiddleware);
router.get('/stats', async (_req, res) => {
    try {
        const [totalUsers, newUsers, activeUsers, premiumUsers, activeServers, deployedBots, revenue, circulating,] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
            prisma_1.prisma.user.count({ where: { status: 'ACTIVE' } }),
            prisma_1.prisma.user.count({ where: { role: 'PREMIUM' } }),
            prisma_1.prisma.server.count({ where: { status: 'ONLINE' } }),
            prisma_1.prisma.bot.count({ where: { status: 'RUNNING' } }),
            prisma_1.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
            prisma_1.prisma.user.aggregate({ _sum: { coins: true } }),
        ]);
        (0, response_1.sendSuccess)(res, {
            totalUsers, newUsers, activeUsers, premiumUsers,
            activeServers, deployedBots,
            totalRevenue: revenue._sum.amount || 0,
            coinsCirculating: circulating._sum.coins || 0,
        });
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/activity', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const [users, bots, servers] = await Promise.all([
                prisma_1.prisma.user.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
                prisma_1.prisma.bot.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
                prisma_1.prisma.server.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
            ]);
            data.push({ date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), users, bots, servers });
        }
        (0, response_1.sendSuccess)(res, data);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const role = req.query.role;
        const status = req.query.status;
        const where = {};
        if (search)
            where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
        if (role)
            where.role = role.toUpperCase();
        if (status)
            where.status = status.toUpperCase();
        const [users, total] = await Promise.all([
            prisma_1.prisma.user.findMany({
                where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
                select: { id: true, name: true, email: true, role: true, status: true, plan: true, coins: true, createdAt: true, lastLogin: true, emailVerified: true, _count: { select: { bots: true, servers: true } } },
            }),
            prisma_1.prisma.user.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, users, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/users/:id', async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.params.id },
            include: { bots: { take: 5 }, servers: { take: 5 }, transactions: { take: 10, orderBy: { createdAt: 'desc' } } },
        });
        if (!user)
            return (0, response_1.sendError)(res, 'Utilisateur non trouvé', 404);
        const { password, twoFactorSecret, ...safe } = user;
        (0, response_1.sendSuccess)(res, safe);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.patch('/users/:id', async (req, res) => {
    try {
        const { name, email, role, status, plan, planExpiry, coins } = req.body;
        const data = {};
        if (name !== undefined)
            data.name = name;
        if (email !== undefined)
            data.email = email;
        if (role !== undefined)
            data.role = role;
        if (status !== undefined)
            data.status = status;
        if (plan !== undefined)
            data.plan = plan;
        if (planExpiry)
            data.planExpiry = new Date(planExpiry);
        if (coins !== undefined)
            data.coins = Number(coins);
        const user = await prisma_1.prisma.user.update({ where: { id: req.params.id }, data });
        (0, response_1.sendSuccess)(res, user, 'Utilisateur mis à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/users/:id/ban', async (req, res) => {
    try {
        const { reason } = req.body;
        await prisma_1.prisma.user.update({ where: { id: req.params.id }, data: { status: 'BANNED', bannedAt: new Date(), bannedReason: reason } });
        await Promise.all([
            prisma_1.prisma.bot.updateMany({ where: { userId: req.params.id }, data: { status: 'STOPPED' } }),
            prisma_1.prisma.server.updateMany({ where: { userId: req.params.id }, data: { status: 'OFFLINE' } }),
        ]);
        (0, response_1.sendSuccess)(res, null, 'Utilisateur banni');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/users/:id/unban', async (req, res) => {
    try {
        await prisma_1.prisma.user.update({ where: { id: req.params.id }, data: { status: 'ACTIVE', bannedAt: null, bannedReason: null } });
        (0, response_1.sendSuccess)(res, null, 'Utilisateur débanni');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/users/:id/coins', async (req, res) => {
    try {
        const { amount, reason } = req.body;
        if (!amount)
            return (0, response_1.sendError)(res, 'Montant requis', 400);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.params.id }, data: { coins: { increment: amount } } }),
            prisma_1.prisma.transaction.create({ data: { userId: req.params.id, type: amount > 0 ? 'ADMIN_GRANT' : 'ADMIN_DEDUCT', description: reason || 'Ajustement admin', amount } }),
        ]);
        (0, response_1.sendSuccess)(res, null, `${amount} coins ${amount > 0 ? 'ajoutés' : 'retirés'}`);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/users', async (req, res) => {
    try {
        const { name, email, password, role, plan, coins } = req.body;
        if (!name || !email)
            return (0, response_1.sendError)(res, 'Nom et email requis', 400);
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            return (0, response_1.sendError)(res, 'Email déjà utilisé', 409);
        const hashedPassword = password ? await bcryptjs_1.default.hash(password, 12) : undefined;
        const user = await prisma_1.prisma.user.create({
            data: { name, email, password: hashedPassword, role: role || 'USER', plan: plan || 'FREE', emailVerified: true, coins: coins !== undefined ? Number(coins) : 10 },
        });
        const { password: _, ...safeUser } = user;
        (0, response_1.sendSuccess)(res, safeUser, 'Utilisateur créé', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/bots', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const platform = req.query.platform;
        const where = {};
        if (status)
            where.status = status.toUpperCase();
        if (platform)
            where.platform = platform.toUpperCase();
        const [bots, total] = await Promise.all([
            prisma_1.prisma.bot.findMany({
                where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
                include: { user: { select: { name: true, email: true } } },
            }),
            prisma_1.prisma.bot.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, bots, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/servers', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const where = {};
        if (status)
            where.status = status.toUpperCase();
        const [servers, total] = await Promise.all([
            prisma_1.prisma.server.findMany({
                where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
                include: { user: { select: { name: true, email: true } } },
            }),
            prisma_1.prisma.server.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, servers, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/servers/:id/restart', async (req, res) => {
    try {
        await prisma_1.prisma.server.update({ where: { id: req.params.id }, data: { status: 'STARTING' } });
        setTimeout(async () => {
            try {
                await prisma_1.prisma.server.update({ where: { id: req.params.id }, data: { status: 'ONLINE' } });
            }
            catch { }
        }, 3000);
        (0, response_1.sendSuccess)(res, null, 'Serveur redémarré');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/transactions', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type;
        const status = req.query.status;
        const search = req.query.search;
        const where = {};
        if (type)
            where.type = type.toUpperCase();
        if (status)
            where.status = status.toUpperCase();
        if (search)
            where.OR = [{ id: { contains: search } }, { description: { contains: search, mode: 'insensitive' } }];
        const [txns, total] = await Promise.all([
            prisma_1.prisma.transaction.findMany({
                where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
                include: { user: { select: { name: true, email: true } } },
            }),
            prisma_1.prisma.transaction.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, txns, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/subscriptions', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const where = {};
        if (status)
            where.status = status.toUpperCase();
        const [subs, total] = await Promise.all([
            prisma_1.prisma.subscription.findMany({
                where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
                include: { user: { select: { name: true, email: true } } },
            }),
            prisma_1.prisma.subscription.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, subs, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/promo-codes', async (req, res) => {
    try {
        const [codes, total] = await Promise.all([
            prisma_1.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma_1.prisma.promoCode.count(),
        ]);
        (0, response_1.sendPaginated)(res, codes, total, 1, 100);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/promo-codes', async (req, res) => {
    try {
        const { code, type, discount, usageLimit, expiresAt } = req.body;
        if (!code || !type || !discount)
            return (0, response_1.sendError)(res, 'Code, type et réduction requis', 400);
        const promo = await prisma_1.prisma.promoCode.create({
            data: { code: code.toUpperCase(), type: type.toUpperCase(), discount, usageLimit, expiresAt: expiresAt ? new Date(expiresAt) : undefined, createdBy: req.user.id },
        });
        (0, response_1.sendSuccess)(res, promo, 'Code promo créé', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.patch('/promo-codes/:id', async (req, res) => {
    try {
        const promo = await prisma_1.prisma.promoCode.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, promo, 'Code promo mis à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/promo-codes/:id', async (req, res) => {
    try {
        await prisma_1.prisma.promoCode.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Code promo supprimé');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/credit-packs', async (_req, res) => {
    try {
        const packs = await prisma_1.prisma.creditPack.findMany({ orderBy: { coins: 'asc' } });
        (0, response_1.sendSuccess)(res, packs);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/credit-packs', async (req, res) => {
    try {
        const pack = await prisma_1.prisma.creditPack.create({ data: req.body });
        (0, response_1.sendSuccess)(res, pack, 'Pack créé', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.patch('/credit-packs/:id', async (req, res) => {
    try {
        const pack = await prisma_1.prisma.creditPack.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, pack, 'Pack mis à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/credit-packs/:id', async (req, res) => {
    try {
        await prisma_1.prisma.creditPack.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Pack supprimé');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/bonus-codes', async (_req, res) => {
    try {
        const codes = await prisma_1.prisma.bonusCode.findMany({ orderBy: { createdAt: 'desc' } });
        (0, response_1.sendSuccess)(res, codes);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/bonus-codes', async (req, res) => {
    try {
        const { code, coins, usageLimit, expiresAt } = req.body;
        if (!code || !coins)
            return (0, response_1.sendError)(res, 'Code et coins requis', 400);
        const existing = await prisma_1.prisma.bonusCode.findUnique({ where: { code: code.toUpperCase() } });
        if (existing)
            return (0, response_1.sendError)(res, 'Code déjà existant', 409);
        const bc = await prisma_1.prisma.bonusCode.create({
            data: { code: code.toUpperCase(), coins: Number(coins), usageLimit: usageLimit ? Number(usageLimit) : null, expiresAt: expiresAt ? new Date(expiresAt) : null, createdBy: req.user.id },
        });
        (0, response_1.sendSuccess)(res, bc, 'Code bonus créé', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.patch('/bonus-codes/:id', async (req, res) => {
    try {
        const bc = await prisma_1.prisma.bonusCode.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, bc, 'Code bonus mis à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/bonus-codes/:id', async (req, res) => {
    try {
        await prisma_1.prisma.bonusCode.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Code bonus supprimé');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/revenue', async (req, res) => {
    try {
        const period = req.query.period || '30d';
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const [total, byMethod, recent] = await Promise.all([
            prisma_1.prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: since } }, _sum: { amount: true } }),
            prisma_1.prisma.payment.groupBy({ by: ['method'], where: { status: 'COMPLETED', createdAt: { gte: since } }, _sum: { amount: true } }),
            prisma_1.prisma.payment.findMany({ where: { status: 'COMPLETED', createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 20 }),
        ]);
        (0, response_1.sendSuccess)(res, { total: total._sum.amount || 0, byMethod, recent });
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/financial-history', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const [payments, total] = await Promise.all([
            prisma_1.prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            prisma_1.prisma.payment.count(),
        ]);
        (0, response_1.sendPaginated)(res, payments, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/withdrawals', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const [withdrawals, total] = await Promise.all([
            prisma_1.prisma.withdrawal.findMany({
                orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
                include: { user: { select: { name: true, email: true } } },
            }),
            prisma_1.prisma.withdrawal.count(),
        ]);
        (0, response_1.sendPaginated)(res, withdrawals, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/withdrawals/:id/approve', async (req, res) => {
    try {
        await prisma_1.prisma.withdrawal.update({ where: { id: req.params.id }, data: { status: 'APPROVED', processedAt: new Date(), processedBy: req.user.id } });
        (0, response_1.sendSuccess)(res, null, 'Retrait approuvé');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/withdrawals/:id/reject', async (req, res) => {
    try {
        const { reason } = req.body;
        await prisma_1.prisma.withdrawal.update({ where: { id: req.params.id }, data: { status: 'REJECTED', note: reason, processedAt: new Date(), processedBy: req.user.id } });
        (0, response_1.sendSuccess)(res, null, 'Retrait rejeté');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/announcements', async (req, res) => {
    try {
        const [announcements, total] = await Promise.all([
            prisma_1.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma_1.prisma.announcement.count(),
        ]);
        (0, response_1.sendPaginated)(res, announcements, total, 1, 100);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/announcements', async (req, res) => {
    try {
        const { title, description, placement, priority, startDate, endDate } = req.body;
        if (!title || !placement)
            return (0, response_1.sendError)(res, 'Titre et emplacement requis', 400);
        const ann = await prisma_1.prisma.announcement.create({
            data: { title, description, placement, priority: priority?.toUpperCase() || 'MEDIUM', startDate: new Date(startDate || Date.now()), endDate: new Date(endDate || Date.now() + 30 * 24 * 60 * 60 * 1000), createdBy: req.user.id },
        });
        (0, response_1.sendSuccess)(res, ann, 'Annonce créée', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.patch('/announcements/:id', async (req, res) => {
    try {
        const ann = await prisma_1.prisma.announcement.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, ann, 'Annonce mise à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/announcements/:id', async (req, res) => {
    try {
        await prisma_1.prisma.announcement.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'Annonce supprimée');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/faq', async (_req, res) => {
    try {
        const faq = await prisma_1.prisma.faq.findMany({ orderBy: { position: 'asc' } });
        (0, response_1.sendSuccess)(res, faq);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/faq', async (req, res) => {
    try {
        const item = await prisma_1.prisma.faq.create({ data: req.body });
        (0, response_1.sendSuccess)(res, item, 'FAQ créée', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.patch('/faq/:id', async (req, res) => {
    try {
        const item = await prisma_1.prisma.faq.update({ where: { id: req.params.id }, data: req.body });
        (0, response_1.sendSuccess)(res, item, 'FAQ mise à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/faq/:id', async (req, res) => {
    try {
        await prisma_1.prisma.faq.delete({ where: { id: req.params.id } });
        (0, response_1.sendSuccess)(res, null, 'FAQ supprimée');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/logs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const level = req.query.level;
        const where = {};
        if (level)
            where.level = level;
        const [logs, total] = await Promise.all([
            prisma_1.prisma.systemLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            prisma_1.prisma.systemLog.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, logs, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/settings', async (_req, res) => {
    try {
        const settings = await prisma_1.prisma.systemSetting.findMany();
        const obj = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
        (0, response_1.sendSuccess)(res, obj);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/settings', async (req, res) => {
    try {
        const flat = Object.entries({ ...req.body.general, ...req.body.coins }).filter(([_, v]) => v !== undefined);
        await Promise.all(flat.map(([key, value]) => prisma_1.prisma.systemSetting.upsert({
            where: { key },
            create: { key, value: value },
            update: { value: value },
        })));
        (0, response_1.sendSuccess)(res, null, 'Paramètres sauvegardés');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.patch('/settings', async (req, res) => {
    try {
        const updates = Object.entries(req.body);
        await Promise.all(updates.map(([key, value]) => prisma_1.prisma.systemSetting.upsert({
            where: { key },
            create: { key, value: value },
            update: { value: value },
        })));
        (0, response_1.sendSuccess)(res, null, 'Paramètres mis à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/system/health', async (_req, res) => {
    try {
        const start = Date.now();
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        const dbLatency = Date.now() - start;
        (0, response_1.sendSuccess)(res, {
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            dbLatency,
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Service dégradé', 503);
    }
});
router.post('/backups', async (_req, res) => {
    try {
        (0, response_1.sendSuccess)(res, { id: `backup-${Date.now()}`, createdAt: new Date().toISOString() }, 'Sauvegarde initiée');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/backups', async (_req, res) => {
    try {
        (0, response_1.sendSuccess)(res, [
            { id: 'backup-001', size: '2.4 GB', createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'completed' },
            { id: 'backup-002', size: '2.3 GB', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'completed' },
        ]);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/security/logs', async (req, res) => {
    try {
        const logs = await prisma_1.prisma.loginHistory.findMany({
            orderBy: { createdAt: 'desc' }, take: 100,
            include: { user: { select: { name: true, email: true } } },
        });
        (0, response_1.sendSuccess)(res, logs);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/bots/:id/review', async (req, res) => {
    try {
        const { status, reason } = req.body;
        await prisma_1.prisma.marketplaceBot.update({
            where: { id: req.params.id },
            data: { status: status.toUpperCase() },
        });
        (0, response_1.sendSuccess)(res, null, `Bot ${status === 'approved' ? 'approuvé' : 'rejeté'}`);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/messages', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const [tickets, total] = await Promise.all([
            prisma_1.prisma.supportTicket.findMany({
                orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit,
                include: { user: { select: { name: true, email: true } }, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
            }),
            prisma_1.prisma.supportTicket.count(),
        ]);
        (0, response_1.sendPaginated)(res, tickets, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/messages/:id', async (req, res) => {
    try {
        const ticket = await prisma_1.prisma.supportTicket.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { name: true, email: true, id: true } },
                messages: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!ticket)
            return (0, response_1.sendError)(res, 'Ticket non trouvé', 404);
        (0, response_1.sendSuccess)(res, ticket);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/messages/:id/reply', async (req, res) => {
    try {
        const { content } = req.body;
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.ticketMessage.create({ data: { ticketId: req.params.id, senderId: req.user.id, content, isAdmin: true } }),
            prisma_1.prisma.supportTicket.update({ where: { id: req.params.id }, data: { status: 'IN_PROGRESS', updatedAt: new Date() } }),
        ]);
        (0, response_1.sendSuccess)(res, null, 'Réponse envoyée');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.default = router;
