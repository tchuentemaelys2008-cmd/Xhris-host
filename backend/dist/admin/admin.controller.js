"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewMarketplaceBot = exports.getSystemLogs = exports.getFaq = exports.createAnnouncement = exports.getAnnouncements = exports.getSystemHealth = exports.getRevenue = exports.createCreditPack = exports.getCreditPacks = exports.createPromoCode = exports.getPromoCodes = exports.getAdminSubscriptions = exports.getAdminTransactions = exports.getAdminServers = exports.getAdminBots = exports.addCoinsToUser = exports.unbanUser = exports.banUser = exports.updateUser = exports.getUser = exports.getUsers = exports.getDashboardStats = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const getDashboardStats = async (_req, res) => {
    try {
        const [totalUsers, newUsers, activeUsers, premiumUsers, totalBots, runningBots, totalServers, onlineServers, totalRevenue, coinsInCirculation] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
            prisma_1.prisma.user.count({ where: { status: 'ACTIVE' } }),
            prisma_1.prisma.user.count({ where: { role: 'PREMIUM' } }),
            prisma_1.prisma.bot.count(),
            prisma_1.prisma.bot.count({ where: { status: 'RUNNING' } }),
            prisma_1.prisma.server.count(),
            prisma_1.prisma.server.count({ where: { status: 'ONLINE' } }),
            prisma_1.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
            prisma_1.prisma.user.aggregate({ _sum: { coins: true } }),
        ]);
        return res.json({
            success: true,
            data: {
                users: { total: totalUsers, new: newUsers, active: activeUsers, premium: premiumUsers },
                bots: { total: totalBots, running: runningBots },
                servers: { total: totalServers, online: onlineServers },
                revenue: { total: totalRevenue._sum.amount || 0 },
                coins: { total: coinsInCirculation._sum.coins || 0 },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('getDashboardStats error:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getUsers = async (req, res) => {
    try {
        const { search, role, status, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (role)
            where.role = role;
        if (status)
            where.status = status;
        const [users, total] = await Promise.all([
            prisma_1.prisma.user.findMany({
                where,
                orderBy: { [sort]: order },
                skip,
                take: Number(limit),
                select: {
                    id: true, name: true, email: true, role: true, status: true, plan: true,
                    coins: true, createdAt: true, lastLogin: true, avatar: true, emailVerified: true,
                    _count: { select: { bots: true, servers: true } },
                },
            }),
            prisma_1.prisma.user.count({ where }),
        ]);
        return res.json({ success: true, data: { users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    }
    catch (error) {
        logger_1.logger.error('getUsers error:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getUsers = getUsers;
const getUser = async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.params.id },
            include: {
                bots: { orderBy: { createdAt: 'desc' }, take: 5 },
                servers: { orderBy: { createdAt: 'desc' }, take: 5 },
                transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
                subscription: true,
                _count: { select: { bots: true, servers: true, transactions: true, referrals: true } },
            },
        });
        if (!user)
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        return res.json({ success: true, data: user });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getUser = getUser;
const updateUser = async (req, res) => {
    try {
        const { role, status, plan, planExpiry } = req.body;
        const user = await prisma_1.prisma.user.update({
            where: { id: req.params.id },
            data: { ...(role && { role }), ...(status && { status }), ...(plan && { plan }), ...(planExpiry && { planExpiry: new Date(planExpiry) }) },
        });
        logger_1.logger.info(`Admin updated user: ${user.id}`);
        return res.json({ success: true, message: 'Utilisateur mis à jour', data: user });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.updateUser = updateUser;
const banUser = async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await prisma_1.prisma.user.update({
            where: { id: req.params.id },
            data: { status: 'BANNED', bannedAt: new Date(), bannedReason: reason || 'Violation des conditions d\'utilisation' },
        });
        await prisma_1.prisma.bot.updateMany({ where: { userId: user.id }, data: { status: 'STOPPED' } });
        await prisma_1.prisma.server.updateMany({ where: { userId: user.id }, data: { status: 'OFFLINE' } });
        await prisma_1.prisma.session.deleteMany({ where: { userId: user.id } });
        logger_1.logger.info(`Admin banned user: ${user.id} - ${reason}`);
        return res.json({ success: true, message: 'Utilisateur banni' });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.banUser = banUser;
const unbanUser = async (req, res) => {
    try {
        await prisma_1.prisma.user.update({
            where: { id: req.params.id },
            data: { status: 'ACTIVE', bannedAt: null, bannedReason: null },
        });
        return res.json({ success: true, message: 'Utilisateur débanni' });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.unbanUser = unbanUser;
const addCoinsToUser = async (req, res) => {
    try {
        const { amount, reason } = req.body;
        if (!amount || !reason)
            return res.status(400).json({ success: false, message: 'amount et reason requis' });
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.params.id }, data: { coins: { increment: Number(amount) } } }),
            prisma_1.prisma.transaction.create({
                data: { userId: req.params.id, type: amount > 0 ? 'ADMIN_GRANT' : 'ADMIN_DEDUCT', description: reason, amount: Number(amount), status: 'COMPLETED' },
            }),
            prisma_1.prisma.notification.create({
                data: { userId: req.params.id, title: amount > 0 ? `+${amount} Coins reçus` : `${amount} Coins déduits`, message: reason, type: 'INFO' },
            }),
        ]);
        logger_1.logger.info(`Admin ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} coins to user ${req.params.id}`);
        return res.json({ success: true, message: `${Math.abs(amount)} Coins ${amount > 0 ? 'ajoutés' : 'déduits'}` });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.addCoinsToUser = addCoinsToUser;
const getAdminBots = async (req, res) => {
    try {
        const { search, status, platform, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (search)
            where.name = { contains: search, mode: 'insensitive' };
        if (status)
            where.status = status.toUpperCase();
        if (platform)
            where.platform = platform.toUpperCase();
        const [bots, total] = await Promise.all([
            prisma_1.prisma.bot.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit),
            }),
            prisma_1.prisma.bot.count({ where }),
        ]);
        return res.json({ success: true, data: { bots, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getAdminBots = getAdminBots;
const getAdminServers = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (search)
            where.name = { contains: search, mode: 'insensitive' };
        if (status)
            where.status = status.toUpperCase();
        const [servers, total] = await Promise.all([
            prisma_1.prisma.server.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit),
            }),
            prisma_1.prisma.server.count({ where }),
        ]);
        return res.json({ success: true, data: { servers, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getAdminServers = getAdminServers;
const getAdminTransactions = async (req, res) => {
    try {
        const { type, status, userId, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (type)
            where.type = type;
        if (status)
            where.status = status;
        if (userId)
            where.userId = userId;
        const [txns, total] = await Promise.all([
            prisma_1.prisma.transaction.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit),
            }),
            prisma_1.prisma.transaction.count({ where }),
        ]);
        return res.json({ success: true, data: { transactions: txns, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getAdminTransactions = getAdminTransactions;
const getAdminSubscriptions = async (req, res) => {
    try {
        const { status, plan, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status)
            where.status = status;
        if (plan)
            where.plan = plan;
        const [subs, total] = await Promise.all([
            prisma_1.prisma.subscription.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit),
            }),
            prisma_1.prisma.subscription.count({ where }),
        ]);
        return res.json({ success: true, data: { subscriptions: subs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getAdminSubscriptions = getAdminSubscriptions;
const getPromoCodes = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status)
            where.status = status;
        if (type)
            where.type = type;
        const [codes, total] = await Promise.all([
            prisma_1.prisma.promoCode.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
            prisma_1.prisma.promoCode.count({ where }),
        ]);
        return res.json({ success: true, data: { codes, total } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getPromoCodes = getPromoCodes;
const createPromoCode = async (req, res) => {
    try {
        const { code, type, discount, usageLimit, expiresAt } = req.body;
        if (!code || !type || !discount)
            return res.status(400).json({ success: false, message: 'Champs requis manquants' });
        const existing = await prisma_1.prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
        if (existing)
            return res.status(400).json({ success: false, message: 'Code déjà existant' });
        const promoCode = await prisma_1.prisma.promoCode.create({
            data: { code: code.toUpperCase(), type, discount: Number(discount), usageLimit: usageLimit ? Number(usageLimit) : null, expiresAt: expiresAt ? new Date(expiresAt) : null, createdBy: req.user.id },
        });
        return res.status(201).json({ success: true, message: 'Code promo créé', data: promoCode });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.createPromoCode = createPromoCode;
const getCreditPacks = async (_req, res) => {
    try {
        const packs = await prisma_1.prisma.creditPack.findMany({ orderBy: { coins: 'asc' } });
        return res.json({ success: true, data: packs });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getCreditPacks = getCreditPacks;
const createCreditPack = async (req, res) => {
    try {
        const { name, coins, price, currency, bonus, popular, bestValue } = req.body;
        const pack = await prisma_1.prisma.creditPack.create({ data: { name, coins: Number(coins), price: Number(price), currency: currency || 'EUR', bonus: bonus ? Number(bonus) : 0, popular: !!popular, bestValue: !!bestValue } });
        return res.status(201).json({ success: true, data: pack });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.createCreditPack = createCreditPack;
const getRevenue = async (req, res) => {
    try {
        const { from, to } = req.query;
        const where = { status: 'COMPLETED' };
        if (from || to)
            where.createdAt = { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) };
        const [total, byMethod, payments] = await Promise.all([
            prisma_1.prisma.payment.aggregate({ where, _sum: { amount: true }, _count: true }),
            prisma_1.prisma.payment.groupBy({ by: ['method'], where, _sum: { amount: true }, _count: true }),
            prisma_1.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, include: { user: { select: { name: true } } } }),
        ]);
        return res.json({ success: true, data: { total: total._sum.amount || 0, count: total._count, byMethod, payments } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getRevenue = getRevenue;
const getSystemHealth = async (_req, res) => {
    try {
        const [dbCheck, userCount, botCount] = await Promise.all([
            prisma_1.prisma.$queryRaw `SELECT 1`,
            prisma_1.prisma.user.count(),
            prisma_1.prisma.bot.count(),
        ]);
        return res.json({
            success: true,
            data: {
                status: 'healthy',
                database: 'connected',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString(),
                stats: { users: userCount, bots: botCount },
            },
        });
    }
    catch {
        return res.status(503).json({ success: false, data: { status: 'unhealthy' } });
    }
};
exports.getSystemHealth = getSystemHealth;
const getAnnouncements = async (req, res) => {
    try {
        const announcements = await prisma_1.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
        return res.json({ success: true, data: announcements });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getAnnouncements = getAnnouncements;
const createAnnouncement = async (req, res) => {
    try {
        const { title, description, placement, priority, startDate, endDate, imageUrl, linkUrl } = req.body;
        const ann = await prisma_1.prisma.announcement.create({
            data: { title, description, placement, priority: priority || 'MEDIUM', startDate: new Date(startDate), endDate: new Date(endDate), imageUrl, linkUrl, createdBy: req.user.id },
        });
        return res.status(201).json({ success: true, data: ann });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.createAnnouncement = createAnnouncement;
const getFaq = async (_req, res) => {
    try {
        const faq = await prisma_1.prisma.faq.findMany({ where: { active: true }, orderBy: { position: 'asc' } });
        return res.json({ success: true, data: faq });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getFaq = getFaq;
const getSystemLogs = async (req, res) => {
    try {
        const { level, page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (level)
            where.level = level;
        const [logs, total] = await Promise.all([
            prisma_1.prisma.systemLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
            prisma_1.prisma.systemLog.count({ where }),
        ]);
        return res.json({ success: true, data: { logs, total } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getSystemLogs = getSystemLogs;
const reviewMarketplaceBot = async (req, res) => {
    try {
        const { status, reason } = req.body;
        const bot = await prisma_1.prisma.marketplaceBot.update({
            where: { id: req.params.id },
            data: { status: status.toUpperCase() },
        });
        await prisma_1.prisma.notification.create({
            data: { userId: bot.developerId, title: status === 'approved' ? '✅ Bot approuvé !' : '❌ Bot rejeté', message: reason || `Votre bot "${bot.name}" a été ${status === 'approved' ? 'approuvé' : 'rejeté'}.`, type: 'INFO' },
        }).catch(() => { });
        return res.json({ success: true, message: `Bot ${status}` });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.reviewMarketplaceBot = reviewMarketplaceBot;
