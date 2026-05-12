import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ========== DEVELOPER ==========
export const developerRouter = Router();

developerRouter.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    let profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      profile = await prisma.developerProfile.create({ data: { userId: req.user!.id } });
    }
    sendSuccess(res, profile);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

developerRouter.patch('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, bio, website, github, twitter, discord, whatsapp, public: isPublic } = req.body;
    const profile = await prisma.developerProfile.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, displayName, bio, website, github, twitter, discord, whatsapp, public: isPublic },
      update: { displayName, bio, website, github, twitter, discord, whatsapp, public: isPublic },
    });
    sendSuccess(res, profile, 'Profil mis à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

developerRouter.get('/bots', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return sendError(res, 'Profil développeur non trouvé', 404);
    const bots = await prisma.marketplaceBot.findMany({ where: { developerId: profile.id }, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, bots);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

developerRouter.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return sendError(res, 'Profil non trouvé', 404);
    const [botsCount, totalDownloads, avgRating] = await Promise.all([
      prisma.marketplaceBot.count({ where: { developerId: profile.id, status: 'PUBLISHED' } }),
      prisma.marketplaceBot.aggregate({ where: { developerId: profile.id }, _sum: { downloads: true } }),
      prisma.marketplaceBot.aggregate({ where: { developerId: profile.id }, _avg: { rating: true } }),
    ]);
    sendSuccess(res, { botsPublished: botsCount, totalDownloads: totalDownloads._sum.downloads || 0, avgRating: avgRating._avg.rating || 0 });
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ========== API KEYS ==========
export const apiKeysRouter = Router();

apiKeysRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    // Mask keys
    const masked = keys.map(k => ({ ...k, key: k.key.slice(0, 12) + '•'.repeat(16) + k.key.slice(-6) }));
    sendSuccess(res, masked);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

apiKeysRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, permissions } = req.body;
    if (!name) return sendError(res, 'Nom requis', 400);
    const rawKey = `xhs_live_${crypto.randomBytes(20).toString('hex')}`;
    const key = await prisma.apiKey.create({
      data: { userId: req.user!.id, name, key: rawKey, permissions: permissions || ['read'] },
    });
    sendSuccess(res, { ...key }, 'Clé créée — sauvegardez-la maintenant, elle ne sera plus affichée', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

apiKeysRouter.post('/:id/revoke', async (req: AuthRequest, res: Response) => {
  try {
    const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!key) return sendError(res, 'Clé non trouvée', 404);
    await prisma.apiKey.update({ where: { id: key.id }, data: { status: 'REVOKED' } });
    sendSuccess(res, null, 'Clé révoquée');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

apiKeysRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.apiKey.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    sendSuccess(res, null, 'Clé supprimée');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ========== WEBHOOKS ==========
export const webhooksRouter = Router();

webhooksRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const webhooks = await prisma.webhook.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, webhooks);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

webhooksRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, url, events } = req.body;
    if (!name || !url || !events?.length) return sendError(res, 'Nom, URL et événements requis', 400);
    if (!url.startsWith('https://')) return sendError(res, 'URL HTTPS requise', 400);
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const webhook = await prisma.webhook.create({
      data: { userId: req.user!.id, name, url, events, secret },
    });
    sendSuccess(res, webhook, 'Webhook créé', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

webhooksRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const wh = await prisma.webhook.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!wh) return sendError(res, 'Webhook non trouvé', 404);
    const updated = await prisma.webhook.update({ where: { id: wh.id }, data: req.body });
    sendSuccess(res, updated, 'Webhook mis à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

webhooksRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.webhook.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    sendSuccess(res, null, 'Webhook supprimé');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

webhooksRouter.post('/:id/test', async (req: AuthRequest, res: Response) => {
  try {
    const wh = await prisma.webhook.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!wh) return sendError(res, 'Webhook non trouvé', 404);

    const payload = { event: 'test', timestamp: new Date().toISOString(), data: { message: 'Test webhook from XHRIS HOST' } };
    const sig = crypto.createHmac('sha256', wh.secret).update(JSON.stringify(payload)).digest('hex');

    try {
      const resp = await fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XHRIS-Signature': `sha256=${sig}` },
        body: JSON.stringify(payload),
      });
      await prisma.webhook.update({ where: { id: wh.id }, data: { lastActivity: new Date(), lastStatus: `${resp.status} ${resp.statusText}` } });
      sendSuccess(res, { status: resp.status }, `Test envoyé: ${resp.status}`);
    } catch {
      sendError(res, 'Impossible de joindre l\'URL', 400);
    }
  } catch (err) { sendError(res, 'Erreur', 500); }
});

webhooksRouter.post('/secret/regenerate', async (req: AuthRequest, res: Response) => {
  try {
    const newSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    await prisma.webhook.updateMany({ where: { userId: req.user!.id }, data: { secret: newSecret } });
    sendSuccess(res, { secret: newSecret }, 'Secret régénéré');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ========== NOTIFICATIONS ==========
export const notificationsRouter = Router();

notificationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unread === 'true';

    const where: any = { userId: req.user!.id };
    if (unreadOnly) where.read = false;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }),
      prisma.notification.count({ where }),
    ]);
    sendPaginated(res, notifications, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

notificationsRouter.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { read: true } });
    sendSuccess(res, null, 'Notification lue');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

notificationsRouter.post('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    sendSuccess(res, null, 'Toutes les notifications lues');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ========== SUPPORT ==========
export const supportRouter = Router();

supportRouter.get('/articles', async (req: AuthRequest, res: Response) => {
  try {
    const { category, search } = req.query;
    const where: any = { published: true };
    if (category) where.category = category;
    if (search) where.OR = [{ title: { contains: search as string, mode: 'insensitive' } }, { content: { contains: search as string, mode: 'insensitive' } }];

    const articles = await prisma.supportArticle.findMany({ where, orderBy: { views: 'desc' }, take: 20 });
    sendSuccess(res, articles);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.get('/articles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const article = await prisma.supportArticle.findUnique({ where: { id: req.params.id } });
    if (!article) return sendError(res, 'Article non trouvé', 404);
    await prisma.supportArticle.update({ where: { id: article.id }, data: { views: { increment: 1 } } });
    sendSuccess(res, article);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.get('/faq', async (_req: AuthRequest, res: Response) => {
  try {
    const faq = await prisma.faq.findMany({ where: { active: true }, orderBy: { position: 'asc' } });
    sendSuccess(res, faq);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.post('/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const { subject, message, category, priority } = req.body;
    if (!subject || !message) return sendError(res, 'Sujet et message requis', 400);

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user!.id,
        subject,
        category,
        priority: priority?.toUpperCase() || 'MEDIUM',
        messages: { create: { senderId: req.user!.id, content: message } },
      },
      include: { messages: true },
    });
    sendSuccess(res, ticket, 'Ticket créé', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.get('/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user!.id },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
    sendSuccess(res, tickets);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.get('/tickets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) return sendError(res, 'Ticket non trouvé', 404);
    sendSuccess(res, ticket);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.post('/tickets/:id/reply', async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    const ticket = await prisma.supportTicket.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!ticket) return sendError(res, 'Ticket non trouvé', 404);
    if (ticket.status === 'CLOSED') return sendError(res, 'Ticket fermé', 400);

    await prisma.$transaction([
      prisma.ticketMessage.create({ data: { ticketId: ticket.id, senderId: req.user!.id, content: message } }),
      prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'WAITING', updatedAt: new Date() } }),
    ]);
    sendSuccess(res, null, 'Réponse envoyée');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ========== PAYMENTS ==========
export const paymentsRouter = Router();

paymentsRouter.post('/initiate', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, packId } = req.body;
    if (!amount || !method) return sendError(res, 'Montant et méthode requis', 400);

    const reference = `XH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        userId: req.user!.id,
        amount,
        method: method.toUpperCase() as any,
        reference,
        packId,
        status: 'PENDING',
      },
    });

    sendSuccess(res, { payment, reference, paymentUrl: `https://pay.xhris.host/checkout/${reference}` }, 'Paiement initié');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// POST /api/payments/fapshi/initiate — Fapshi automatic payment
paymentsRouter.post('/fapshi/initiate', async (req: AuthRequest, res: Response) => {
  try {
    const { packId, coins, amount, phone } = req.body;
    if (!packId || !coins || !amount || !phone) return sendError(res, 'Paramètres manquants', 400);

    const FAPSHI_API_KEY = process.env.FAPSHI_API_KEY || '';
    const FAPSHI_API_USER = process.env.FAPSHI_API_USER || '';
    const amountXAF = Math.round(amount * 655);
    const reference = `XH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create pending payment in DB
    await prisma.payment.create({
      data: { userId: req.user!.id, amount, method: 'FAPSHI' as any, reference, packId, status: 'PENDING' },
    });

    // Call Fapshi API if credentials available
    if (FAPSHI_API_KEY && FAPSHI_API_USER) {
      const fapshiRes = await fetch('https://live.fapshi.com/initiate-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiuser': FAPSHI_API_USER,
          'apikey': FAPSHI_API_KEY,
        },
        body: JSON.stringify({
          amount: amountXAF,
          phone: phone.replace(/\s/g, '').replace(/^\+/, ''),
          message: `XHRIS Host - ${coins} Coins (${packId})`,
          externalId: reference,
          redirectUrl: `${process.env.FRONTEND_URL || 'https://xhris-host-frontend.vercel.app'}/dashboard/coins/buy?success=1`,
        }),
      });
      const fapshiData: any = await fapshiRes.json();
      if (!fapshiRes.ok) return sendError(res, fapshiData?.message || 'Erreur Fapshi', 400);
      sendSuccess(res, { reference, link: fapshiData?.link }, 'Paiement Fapshi initié');
    } else {
      // No API key — return a placeholder response
      sendSuccess(res, { reference, link: null }, 'Paiement en attente de configuration Fapshi');
    }
  } catch (err) { sendError(res, 'Erreur lors de l\'initiation Fapshi', 500); }
});

paymentsRouter.get('/verify/:reference', async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { reference: req.params.reference } });
    if (!payment) return sendError(res, 'Paiement non trouvé', 404);
    sendSuccess(res, payment);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

paymentsRouter.post('/withdraw', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, details } = req.body;
    if (!amount || amount < 10) return sendError(res, 'Montant minimum: €10', 400);
    if (!method) return sendError(res, 'Méthode requise', 400);

    const fees: Record<string, number> = { CARD: 0.015, PAYPAL: 0.025, CRYPTO: 0.010, BANK_TRANSFER: 0.005 };
    const fee = amount * (fees[method.toUpperCase()] || 0.015);
    const net = amount - fee;

    const withdrawal = await prisma.withdrawal.create({
      data: { userId: req.user!.id, amount, fee, net, method: method.toUpperCase() as any, details: details || {} },
    });

    sendSuccess(res, withdrawal, 'Demande de retrait soumise', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

paymentsRouter.get('/withdrawals', async (req: AuthRequest, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, withdrawals);
  } catch (err) { sendError(res, 'Erreur', 500); }
});
