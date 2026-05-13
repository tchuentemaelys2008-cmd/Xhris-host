import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, adminMiddleware } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

const router = Router();
router.use(adminMiddleware);

// ============ DASHBOARD STATS ============
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers, newUsers, activeUsers, premiumUsers,
      activeServers, deployedBots, revenue, circulating,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30*24*60*60*1000) } } }),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'PREMIUM' } }),
      prisma.server.count({ where: { status: 'ONLINE' } }),
      prisma.bot.count({ where: { status: 'RUNNING' } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.user.aggregate({ _sum: { coins: true } }),
    ]);

    sendSuccess(res, {
      totalUsers, newUsers, activeUsers, premiumUsers,
      activeServers, deployedBots,
      totalRevenue: revenue._sum.amount || 0,
      coinsCirculating: circulating._sum.coins || 0,
    });
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.get('/activity', async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [users, bots, servers] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
        prisma.bot.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
        prisma.server.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
      ]);
      data.push({ date: date.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }), users, bots, servers });
    }
    sendSuccess(res, data);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ USERS ============
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;

    const where: any = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    if (role) where.role = role.toUpperCase();
    if (status) where.status = status.toUpperCase();

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        select: { id: true, name: true, email: true, role: true, status: true, plan: true, coins: true, createdAt: true, lastLogin: true, emailVerified: true, _count: { select: { bots: true, servers: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    sendPaginated(res, users, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { bots: { take: 5 }, servers: { take: 5 }, transactions: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!user) return sendError(res, 'Utilisateur non trouvé', 404);
    const { password, twoFactorSecret, ...safe } = user as any;
    sendSuccess(res, safe);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.patch('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, status, plan, planExpiry, coins } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (status !== undefined) data.status = status;
    if (plan !== undefined) data.plan = plan;
    if (planExpiry) data.planExpiry = new Date(planExpiry);
    if (coins !== undefined) data.coins = Number(coins);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    sendSuccess(res, user, 'Utilisateur mis à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/users/:id/ban', async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    await prisma.user.update({ where: { id: req.params.id }, data: { status: 'BANNED', bannedAt: new Date(), bannedReason: reason } });
    // Stop all their bots and servers
    await Promise.all([
      prisma.bot.updateMany({ where: { userId: req.params.id }, data: { status: 'STOPPED' } }),
      prisma.server.updateMany({ where: { userId: req.params.id }, data: { status: 'OFFLINE' } }),
    ]);
    sendSuccess(res, null, 'Utilisateur banni');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/users/:id/unban', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { status: 'ACTIVE', bannedAt: null, bannedReason: null } });
    sendSuccess(res, null, 'Utilisateur débanni');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/users/:id/coins', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, reason } = req.body;
    if (!amount) return sendError(res, 'Montant requis', 400);
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.params.id }, data: { coins: { increment: amount } } }),
      prisma.transaction.create({ data: { userId: req.params.id, type: amount > 0 ? 'ADMIN_GRANT' : 'ADMIN_DEDUCT', description: reason || 'Ajustement admin', amount } }),
    ]);
    sendSuccess(res, null, `${amount} coins ${amount > 0 ? 'ajoutés' : 'retirés'}`);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, plan, coins } = req.body;
    if (!name || !email) return sendError(res, 'Nom et email requis', 400);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return sendError(res, 'Email déjà utilisé', 409);
    const hashedPassword = password ? await bcrypt.hash(password, 12) : undefined;
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || 'USER', plan: plan || 'FREE', emailVerified: true, coins: coins !== undefined ? Number(coins) : 10 },
    });
    const { password: _, ...safeUser } = user as any;
    sendSuccess(res, safeUser, 'Utilisateur créé', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ BOTS (Admin) ============
router.get('/bots', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const platform = req.query.platform as string;

    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (platform) where.platform = platform.toUpperCase();

    const [bots, total] = await Promise.all([
      prisma.bot.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.bot.count({ where }),
    ]);
    sendPaginated(res, bots, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ SERVERS (Admin) ============
router.get('/servers', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status.toUpperCase();

    const [servers, total] = await Promise.all([
      prisma.server.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.server.count({ where }),
    ]);
    sendPaginated(res, servers, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/servers/:id/restart', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.server.update({ where: { id: req.params.id }, data: { status: 'STARTING' } });
    setTimeout(async () => {
      try { await prisma.server.update({ where: { id: req.params.id }, data: { status: 'ONLINE' } }); } catch {}
    }, 3000);
    sendSuccess(res, null, 'Serveur redémarré');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ TRANSACTIONS ============
router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};
    if (type) where.type = type.toUpperCase();
    if (status) where.status = status.toUpperCase();
    if (search) where.OR = [{ id: { contains: search } }, { description: { contains: search, mode: 'insensitive' } }];

    const [txns, total] = await Promise.all([
      prisma.transaction.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.transaction.count({ where }),
    ]);
    sendPaginated(res, txns, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ SUBSCRIPTIONS ============
router.get('/subscriptions', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status.toUpperCase();

    const [subs, total] = await Promise.all([
      prisma.subscription.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.subscription.count({ where }),
    ]);
    sendPaginated(res, subs, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ PROMO CODES ============
router.get('/promo-codes', async (req: AuthRequest, res: Response) => {
  try {
    const [codes, total] = await Promise.all([
      prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.promoCode.count(),
    ]);
    sendPaginated(res, codes, total, 1, 100);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/promo-codes', async (req: AuthRequest, res: Response) => {
  try {
    const { code, type, discount, usageLimit, expiresAt } = req.body;
    if (!code || !type || !discount) return sendError(res, 'Code, type et réduction requis', 400);
    const promo = await prisma.promoCode.create({
      data: { code: code.toUpperCase(), type: type.toUpperCase() as any, discount, usageLimit, expiresAt: expiresAt ? new Date(expiresAt) : undefined, createdBy: req.user!.id },
    });
    sendSuccess(res, promo, 'Code promo créé', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.patch('/promo-codes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const promo = await prisma.promoCode.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, promo, 'Code promo mis à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.delete('/promo-codes/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.promoCode.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Code promo supprimé');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ CREDIT PACKS ============
router.get('/credit-packs', async (_req: AuthRequest, res: Response) => {
  try {
    const packs = await prisma.creditPack.findMany({ orderBy: { coins: 'asc' } });
    sendSuccess(res, packs);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/credit-packs', async (req: AuthRequest, res: Response) => {
  try {
    const pack = await prisma.creditPack.create({ data: req.body });
    sendSuccess(res, pack, 'Pack créé', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.patch('/credit-packs/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pack = await prisma.creditPack.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, pack, 'Pack mis à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.delete('/credit-packs/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.creditPack.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Pack supprimé');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ BONUS CODES ============
router.get('/bonus-codes', async (_req: AuthRequest, res: Response) => {
  try {
    const codes = await prisma.bonusCode.findMany({ orderBy: { createdAt: 'desc' } });
    sendSuccess(res, codes);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/bonus-codes', async (req: AuthRequest, res: Response) => {
  try {
    const { code, coins, usageLimit, expiresAt } = req.body;
    if (!code || !coins) return sendError(res, 'Code et coins requis', 400);
    const existing = await prisma.bonusCode.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) return sendError(res, 'Code déjà existant', 409);
    const bc = await prisma.bonusCode.create({
      data: { code: code.toUpperCase(), coins: Number(coins), usageLimit: usageLimit ? Number(usageLimit) : null, expiresAt: expiresAt ? new Date(expiresAt) : null, createdBy: req.user!.id },
    });
    sendSuccess(res, bc, 'Code bonus créé', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.patch('/bonus-codes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const bc = await prisma.bonusCode.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, bc, 'Code bonus mis à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.delete('/bonus-codes/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.bonusCode.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Code bonus supprimé');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ REVENUE ============
router.get('/revenue', async (req: AuthRequest, res: Response) => {
  try {
    const period = req.query.period as string || '30d';
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [total, byMethod, recent] = await Promise.all([
      prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.payment.groupBy({ by: ['method'], where: { status: 'COMPLETED', createdAt: { gte: since } }, _sum: { amount: true } }),
      prisma.payment.findMany({ where: { status: 'COMPLETED', createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    sendSuccess(res, { total: total._sum.amount || 0, byMethod, recent });
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.get('/financial-history', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }),
      prisma.payment.count(),
    ]);
    sendPaginated(res, payments, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ WITHDRAWALS ============
router.get('/withdrawals', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.withdrawal.count(),
    ]);
    sendPaginated(res, withdrawals, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/withdrawals/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.withdrawal.update({ where: { id: req.params.id }, data: { status: 'APPROVED', processedAt: new Date(), processedBy: req.user!.id } });
    sendSuccess(res, null, 'Retrait approuvé');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/withdrawals/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    await prisma.withdrawal.update({ where: { id: req.params.id }, data: { status: 'REJECTED', note: reason, processedAt: new Date(), processedBy: req.user!.id } });
    sendSuccess(res, null, 'Retrait rejeté');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ ANNOUNCEMENTS ============
router.get('/announcements', async (req: AuthRequest, res: Response) => {
  try {
    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.announcement.count(),
    ]);
    sendPaginated(res, announcements, total, 1, 100);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/announcements', async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, placement, priority, startDate, endDate } = req.body;
    if (!title || !placement) return sendError(res, 'Titre et emplacement requis', 400);
    const ann = await prisma.announcement.create({
      data: { title, description, placement, priority: priority?.toUpperCase() || 'MEDIUM', startDate: new Date(startDate || Date.now()), endDate: new Date(endDate || Date.now() + 30*24*60*60*1000), createdBy: req.user!.id },
    });
    sendSuccess(res, ann, 'Annonce créée', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.patch('/announcements/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ann = await prisma.announcement.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, ann, 'Annonce mise à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.delete('/announcements/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Annonce supprimée');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ FAQ ============
router.get('/faq', async (_req: AuthRequest, res: Response) => {
  try {
    const faq = await prisma.faq.findMany({ orderBy: { position: 'asc' } });
    sendSuccess(res, faq);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/faq', async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.faq.create({ data: req.body });
    sendSuccess(res, item, 'FAQ créée', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.patch('/faq/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.faq.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, item, 'FAQ mise à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.delete('/faq/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.faq.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'FAQ supprimée');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ SYSTEM ============
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const level = req.query.level as string;

    const where: any = {};
    if (level) where.level = level;

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }),
      prisma.systemLog.count({ where }),
    ]);
    sendPaginated(res, logs, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.get('/settings', async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const obj = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    sendSuccess(res, obj);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const flat = Object.entries({ ...req.body.general, ...req.body.coins }).filter(([_, v]) => v !== undefined);
    await Promise.all(
      flat.map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          create: { key, value: value as any },
          update: { value: value as any },
        })
      )
    );
    sendSuccess(res, null, 'Paramètres sauvegardés');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.patch('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const updates = Object.entries(req.body);
    await Promise.all(
      updates.map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          create: { key, value: value as any },
          update: { value: value as any },
        })
      )
    );
    sendSuccess(res, null, 'Paramètres mis à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.get('/system/health', async (_req: AuthRequest, res: Response) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - start;

    sendSuccess(res, {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      dbLatency,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    sendError(res, 'Service dégradé', 503);
  }
});

router.post('/backups', async (_req: AuthRequest, res: Response) => {
  try {
    // In production: trigger actual backup
    sendSuccess(res, { id: `backup-${Date.now()}`, createdAt: new Date().toISOString() }, 'Sauvegarde initiée');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.get('/backups', async (_req: AuthRequest, res: Response) => {
  try {
    // Mock backup list
    sendSuccess(res, [
      { id: 'backup-001', size: '2.4 GB', createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'completed' },
      { id: 'backup-002', size: '2.3 GB', createdAt: new Date(Date.now() - 2*86400000).toISOString(), status: 'completed' },
    ]);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.get('/security/logs', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.loginHistory.findMany({
      orderBy: { createdAt: 'desc' }, take: 100,
      include: { user: { select: { name: true, email: true } } },
    });
    sendSuccess(res, logs);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ MARKETPLACE REVIEW ============
router.post('/bots/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const { status, reason } = req.body;
    await prisma.marketplaceBot.update({
      where: { id: req.params.id },
      data: { status: status.toUpperCase() as any },
    });
    sendSuccess(res, null, `Bot ${status === 'approved' ? 'approuvé' : 'rejeté'}`);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ MESSAGES ============
router.get('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        orderBy: { updatedAt: 'desc' }, skip: (page-1)*limit, take: limit,
        include: { user: { select: { name: true, email: true } }, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
      }),
      prisma.supportTicket.count(),
    ]);
    sendPaginated(res, tickets, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.get('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true, id: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) return sendError(res, 'Ticket non trouvé', 404);
    sendSuccess(res, ticket);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/messages/:id/reply', async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    await prisma.$transaction([
      prisma.ticketMessage.create({ data: { ticketId: req.params.id, senderId: req.user!.id, content, isAdmin: true } }),
      prisma.supportTicket.update({ where: { id: req.params.id }, data: { status: 'IN_PROGRESS', updatedAt: new Date() } }),
    ]);
    sendSuccess(res, null, 'Réponse envoyée');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ============ MARKETPLACE BOTS ============

router.get('/marketplace-bots', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const platform = req.query.platform as string;

    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (platform) where.platform = platform.toUpperCase();

    const [bots, total] = await Promise.all([
      prisma.marketplaceBot.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          developer: {
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
            },
          },
        },
      }),
      prisma.marketplaceBot.count({ where }),
    ]);
    sendPaginated(res, bots, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.get('/marketplace-bots/:id', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.marketplaceBot.findUnique({
      where: { id: req.params.id },
      include: {
        developer: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    sendSuccess(res, bot);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

router.post('/marketplace-bots/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const { status, reason } = req.body;
    if (!status || !['PUBLISHED', 'REJECTED'].includes(status.toUpperCase())) {
      return sendError(res, 'Status invalide (PUBLISHED ou REJECTED)', 400);
    }
    const newStatus = status.toUpperCase() as 'PUBLISHED' | 'REJECTED';

    const bot = await prisma.marketplaceBot.findUnique({
      where: { id: req.params.id },
      include: {
        developer: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);

    await prisma.marketplaceBot.update({ where: { id: bot.id }, data: { status: newStatus } });

    await prisma.notification.create({
      data: {
        userId: bot.developer.user.id,
        title: newStatus === 'PUBLISHED' ? '✅ Bot approuvé !' : '❌ Bot rejeté',
        message: newStatus === 'PUBLISHED'
          ? `Votre bot "${bot.name}" est maintenant publié sur le marketplace !`
          : `Votre bot "${bot.name}" a été rejeté.${reason ? ` Raison: ${reason}` : ''}`,
        type: newStatus === 'PUBLISHED' ? 'SUCCESS' as any : 'WARNING' as any,
        link: '/developer/publications',
      },
    });

    sendSuccess(res, null, newStatus === 'PUBLISHED' ? 'Bot approuvé et publié' : 'Bot rejeté');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// Legacy route — keep for backward compat
router.post('/bots/:id/review', async (req: AuthRequest, res: Response) => {
  req.params.id = req.params.id;
  const { status, reason } = req.body;
  if (!status || !['PUBLISHED', 'REJECTED', 'approved', 'rejected'].includes(status)) {
    return sendError(res, 'Status invalide', 400);
  }
  const mapped = status === 'approved' ? 'PUBLISHED' : status === 'rejected' ? 'REJECTED' : status.toUpperCase();
  try {
    const bot = await prisma.marketplaceBot.findUnique({
      where: { id: req.params.id },
      include: { developer: { include: { user: { select: { id: true } } } } },
    });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    await prisma.marketplaceBot.update({ where: { id: bot.id }, data: { status: mapped as any } });
    if (bot.developer?.user?.id) {
      await prisma.notification.create({
        data: {
          userId: bot.developer.user.id,
          title: mapped === 'PUBLISHED' ? '✅ Bot approuvé' : '❌ Bot rejeté',
          message: mapped === 'PUBLISHED' ? `"${bot.name}" est publié sur le marketplace` : `"${bot.name}" a été rejeté${reason ? `: ${reason}` : ''}`,
          type: mapped === 'PUBLISHED' ? 'SUCCESS' as any : 'WARNING' as any,
        },
      });
    }
    sendSuccess(res, null, 'Review soumise');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

export default router;
