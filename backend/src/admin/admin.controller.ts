import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

// ============ DASHBOARD STATS ============
export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [totalUsers, newUsers, activeUsers, premiumUsers, totalBots, runningBots, totalServers, onlineServers, totalRevenue, coinsInCirculation] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'PREMIUM' } }),
      prisma.bot.count(),
      prisma.bot.count({ where: { status: 'RUNNING' } }),
      prisma.server.count(),
      prisma.server.count({ where: { status: 'ONLINE' } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.user.aggregate({ _sum: { coins: true } }),
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
  } catch (error) {
    logger.error('getDashboardStats error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ GET USERS ============
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { search, role, status, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sort as string]: order },
        skip,
        take: Number(limit),
        select: {
          id: true, name: true, email: true, role: true, status: true, plan: true,
          coins: true, createdAt: true, lastLogin: true, avatar: true, emailVerified: true,
          _count: { select: { bots: true, servers: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({ success: true, data: { users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    logger.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ GET USER ============
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        bots: { orderBy: { createdAt: 'desc' }, take: 5 },
        servers: { orderBy: { createdAt: 'desc' }, take: 5 },
        transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
        subscription: true,
        _count: { select: { bots: true, servers: true, transactions: true, referrals: true } },
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    return res.json({ success: true, data: user });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ UPDATE USER ============
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { role, status, plan, planExpiry } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { ...(role && { role }), ...(status && { status }), ...(plan && { plan }), ...(planExpiry && { planExpiry: new Date(planExpiry) }) },
    });
    logger.info(`Admin updated user: ${user.id}`);
    return res.json({ success: true, message: 'Utilisateur mis à jour', data: user });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ BAN USER ============
export const banUser = async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'BANNED', bannedAt: new Date(), bannedReason: reason || 'Violation des conditions d\'utilisation' },
    });
    // Stop all bots and servers
    await prisma.bot.updateMany({ where: { userId: user.id }, data: { status: 'STOPPED' } });
    await prisma.server.updateMany({ where: { userId: user.id }, data: { status: 'OFFLINE' } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    logger.info(`Admin banned user: ${user.id} - ${reason}`);
    return res.json({ success: true, message: 'Utilisateur banni' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ UNBAN USER ============
export const unbanUser = async (req: Request, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE', bannedAt: null, bannedReason: null },
    });
    return res.json({ success: true, message: 'Utilisateur débanni' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ ADD COINS TO USER ============
export const addCoinsToUser = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || !reason) return res.status(400).json({ success: false, message: 'amount et reason requis' });

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.params.id }, data: { coins: { increment: Number(amount) } } }),
      prisma.transaction.create({
        data: { userId: req.params.id, type: amount > 0 ? 'ADMIN_GRANT' : 'ADMIN_DEDUCT', description: reason, amount: Number(amount), status: 'COMPLETED' },
      }),
      prisma.notification.create({
        data: { userId: req.params.id, title: amount > 0 ? `+${amount} Coins reçus` : `${amount} Coins déduits`, message: reason, type: 'INFO' },
      }),
    ]);

    logger.info(`Admin ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} coins to user ${req.params.id}`);
    return res.json({ success: true, message: `${Math.abs(amount)} Coins ${amount > 0 ? 'ajoutés' : 'déduits'}` });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ GET BOTS (ADMIN) ============
export const getAdminBots = async (req: Request, res: Response) => {
  try {
    const { search, status, platform, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (search) where.name = { contains: search as string, mode: 'insensitive' };
    if (status) where.status = (status as string).toUpperCase();
    if (platform) where.platform = (platform as string).toUpperCase();

    const [bots, total] = await Promise.all([
      prisma.bot.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.bot.count({ where }),
    ]);

    return res.json({ success: true, data: { bots, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ GET SERVERS (ADMIN) ============
export const getAdminServers = async (req: Request, res: Response) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (search) where.name = { contains: search as string, mode: 'insensitive' };
    if (status) where.status = (status as string).toUpperCase();

    const [servers, total] = await Promise.all([
      prisma.server.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.server.count({ where }),
    ]);

    return res.json({ success: true, data: { servers, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ GET TRANSACTIONS (ADMIN) ============
export const getAdminTransactions = async (req: Request, res: Response) => {
  try {
    const { type, status, userId, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [txns, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    return res.json({ success: true, data: { transactions: txns, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ GET SUBSCRIPTIONS (ADMIN) ============
export const getAdminSubscriptions = async (req: Request, res: Response) => {
  try {
    const { status, plan, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const [subs, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.subscription.count({ where }),
    ]);

    return res.json({ success: true, data: { subscriptions: subs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ PROMO CODES ============
export const getPromoCodes = async (req: Request, res: Response) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [codes, total] = await Promise.all([
      prisma.promoCode.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.promoCode.count({ where }),
    ]);

    return res.json({ success: true, data: { codes, total } });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const createPromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const { code, type, discount, usageLimit, expiresAt } = req.body;
    if (!code || !type || !discount) return res.status(400).json({ success: false, message: 'Champs requis manquants' });

    const existing = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(400).json({ success: false, message: 'Code déjà existant' });

    const promoCode = await prisma.promoCode.create({
      data: { code: code.toUpperCase(), type, discount: Number(discount), usageLimit: usageLimit ? Number(usageLimit) : null, expiresAt: expiresAt ? new Date(expiresAt) : null, createdBy: req.user!.id },
    });
    return res.status(201).json({ success: true, message: 'Code promo créé', data: promoCode });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ CREDIT PACKS ============
export const getCreditPacks = async (_req: Request, res: Response) => {
  try {
    const packs = await prisma.creditPack.findMany({ orderBy: { coins: 'asc' } });
    return res.json({ success: true, data: packs });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const createCreditPack = async (req: Request, res: Response) => {
  try {
    const { name, coins, price, currency, bonus, popular, bestValue } = req.body;
    const pack = await prisma.creditPack.create({ data: { name, coins: Number(coins), price: Number(price), currency: currency || 'EUR', bonus: bonus ? Number(bonus) : 0, popular: !!popular, bestValue: !!bestValue } });
    return res.status(201).json({ success: true, data: pack });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ REVENUE ============
export const getRevenue = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const where: any = { status: 'COMPLETED' };
    if (from || to) where.createdAt = { ...(from && { gte: new Date(from as string) }), ...(to && { lte: new Date(to as string) }) };

    const [total, byMethod, payments] = await Promise.all([
      prisma.payment.aggregate({ where, _sum: { amount: true }, _count: true }),
      prisma.payment.groupBy({ by: ['method'], where, _sum: { amount: true }, _count: true }),
      prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, include: { user: { select: { name: true } } } } as any),
    ]);

    return res.json({ success: true, data: { total: total._sum.amount || 0, count: total._count, byMethod, payments } });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ SYSTEM HEALTH ============
export const getSystemHealth = async (_req: Request, res: Response) => {
  try {
    const [dbCheck, userCount, botCount] = await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.user.count(),
      prisma.bot.count(),
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
  } catch {
    return res.status(503).json({ success: false, data: { status: 'unhealthy' } });
  }
};

// ============ ANNOUNCEMENTS ============
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: announcements });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, placement, priority, startDate, endDate, imageUrl, linkUrl } = req.body;
    const ann = await prisma.announcement.create({
      data: { title, description, placement, priority: priority || 'MEDIUM', startDate: new Date(startDate), endDate: new Date(endDate), imageUrl, linkUrl, createdBy: req.user!.id },
    });
    return res.status(201).json({ success: true, data: ann });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ FAQ ============
export const getFaq = async (_req: Request, res: Response) => {
  try {
    const faq = await prisma.faq.findMany({ where: { active: true }, orderBy: { position: 'asc' } });
    return res.json({ success: true, data: faq });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ LOGS ============
export const getSystemLogs = async (req: Request, res: Response) => {
  try {
    const { level, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (level) where.level = level;

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.systemLog.count({ where }),
    ]);

    return res.json({ success: true, data: { logs, total } });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ MARKETPLACE BOT REVIEW ============
export const reviewMarketplaceBot = async (req: AuthRequest, res: Response) => {
  try {
    const { status, reason } = req.body;
    const bot = await prisma.marketplaceBot.update({
      where: { id: req.params.id },
      data: { status: status.toUpperCase() },
    });
    // Notify developer
    await prisma.notification.create({
      data: { userId: bot.developerId, title: status === 'approved' ? '✅ Bot approuvé !' : '❌ Bot rejeté', message: reason || `Votre bot "${bot.name}" a été ${status === 'approved' ? 'approuvé' : 'rejeté'}.`, type: 'INFO' },
    }).catch(() => {});
    return res.json({ success: true, message: `Bot ${status}` });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
