"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = exports.supportRouter = exports.notificationsRouter = exports.webhooksRouter = exports.apiKeysRouter = exports.developerRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const crypto_1 = __importDefault(require("crypto"));
exports.developerRouter = (0, express_1.Router)();
exports.developerRouter.get('/profile', async (req, res) => {
    try {
        let profile = await prisma_1.prisma.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) {
            profile = await prisma_1.prisma.developerProfile.create({ data: { userId: req.user.id } });
        }
        (0, response_1.sendSuccess)(res, profile);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.developerRouter.patch('/profile', async (req, res) => {
    try {
        const { displayName, bio, website, github, twitter, discord, whatsapp, public: isPublic } = req.body;
        const profile = await prisma_1.prisma.developerProfile.upsert({
            where: { userId: req.user.id },
            create: { userId: req.user.id, displayName, bio, website, github, twitter, discord, whatsapp, public: isPublic },
            update: { displayName, bio, website, github, twitter, discord, whatsapp, public: isPublic },
        });
        (0, response_1.sendSuccess)(res, profile, 'Profil mis à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.developerRouter.get('/bots', async (req, res) => {
    try {
        const profile = await prisma_1.prisma.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return (0, response_1.sendError)(res, 'Profil développeur non trouvé', 404);
        const bots = await prisma_1.prisma.marketplaceBot.findMany({ where: { developerId: profile.id }, orderBy: { createdAt: 'desc' } });
        (0, response_1.sendSuccess)(res, bots);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.developerRouter.get('/stats', async (req, res) => {
    try {
        const profile = await prisma_1.prisma.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return (0, response_1.sendError)(res, 'Profil non trouvé', 404);
        const [botsCount, totalDownloads, avgRating] = await Promise.all([
            prisma_1.prisma.marketplaceBot.count({ where: { developerId: profile.id, status: 'PUBLISHED' } }),
            prisma_1.prisma.marketplaceBot.aggregate({ where: { developerId: profile.id }, _sum: { downloads: true } }),
            prisma_1.prisma.marketplaceBot.aggregate({ where: { developerId: profile.id }, _avg: { rating: true } }),
        ]);
        (0, response_1.sendSuccess)(res, { botsPublished: botsCount, totalDownloads: totalDownloads._sum.downloads || 0, avgRating: avgRating._avg.rating || 0 });
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.apiKeysRouter = (0, express_1.Router)();
exports.apiKeysRouter.get('/', async (req, res) => {
    try {
        const keys = await prisma_1.prisma.apiKey.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
        const masked = keys.map(k => ({ ...k, key: k.key.slice(0, 12) + '•'.repeat(16) + k.key.slice(-6) }));
        (0, response_1.sendSuccess)(res, masked);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.apiKeysRouter.post('/', async (req, res) => {
    try {
        const { name, permissions } = req.body;
        if (!name)
            return (0, response_1.sendError)(res, 'Nom requis', 400);
        const rawKey = `xhs_live_${crypto_1.default.randomBytes(20).toString('hex')}`;
        const key = await prisma_1.prisma.apiKey.create({
            data: { userId: req.user.id, name, key: rawKey, permissions: permissions || ['read'] },
        });
        (0, response_1.sendSuccess)(res, { ...key }, 'Clé créée — sauvegardez-la maintenant, elle ne sera plus affichée', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.apiKeysRouter.post('/:id/revoke', async (req, res) => {
    try {
        const key = await prisma_1.prisma.apiKey.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!key)
            return (0, response_1.sendError)(res, 'Clé non trouvée', 404);
        await prisma_1.prisma.apiKey.update({ where: { id: key.id }, data: { status: 'REVOKED' } });
        (0, response_1.sendSuccess)(res, null, 'Clé révoquée');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.apiKeysRouter.delete('/:id', async (req, res) => {
    try {
        await prisma_1.prisma.apiKey.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
        (0, response_1.sendSuccess)(res, null, 'Clé supprimée');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.webhooksRouter = (0, express_1.Router)();
exports.webhooksRouter.get('/', async (req, res) => {
    try {
        const webhooks = await prisma_1.prisma.webhook.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
        (0, response_1.sendSuccess)(res, webhooks);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.webhooksRouter.post('/', async (req, res) => {
    try {
        const { name, url, events } = req.body;
        if (!name || !url || !events?.length)
            return (0, response_1.sendError)(res, 'Nom, URL et événements requis', 400);
        if (!url.startsWith('https://'))
            return (0, response_1.sendError)(res, 'URL HTTPS requise', 400);
        const secret = `whsec_${crypto_1.default.randomBytes(24).toString('hex')}`;
        const webhook = await prisma_1.prisma.webhook.create({
            data: { userId: req.user.id, name, url, events, secret },
        });
        (0, response_1.sendSuccess)(res, webhook, 'Webhook créé', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.webhooksRouter.patch('/:id', async (req, res) => {
    try {
        const wh = await prisma_1.prisma.webhook.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!wh)
            return (0, response_1.sendError)(res, 'Webhook non trouvé', 404);
        const updated = await prisma_1.prisma.webhook.update({ where: { id: wh.id }, data: req.body });
        (0, response_1.sendSuccess)(res, updated, 'Webhook mis à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.webhooksRouter.delete('/:id', async (req, res) => {
    try {
        await prisma_1.prisma.webhook.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
        (0, response_1.sendSuccess)(res, null, 'Webhook supprimé');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.webhooksRouter.post('/:id/test', async (req, res) => {
    try {
        const wh = await prisma_1.prisma.webhook.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!wh)
            return (0, response_1.sendError)(res, 'Webhook non trouvé', 404);
        const payload = { event: 'test', timestamp: new Date().toISOString(), data: { message: 'Test webhook from XHRIS HOST' } };
        const sig = crypto_1.default.createHmac('sha256', wh.secret).update(JSON.stringify(payload)).digest('hex');
        try {
            const resp = await fetch(wh.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-XHRIS-Signature': `sha256=${sig}` },
                body: JSON.stringify(payload),
            });
            await prisma_1.prisma.webhook.update({ where: { id: wh.id }, data: { lastActivity: new Date(), lastStatus: `${resp.status} ${resp.statusText}` } });
            (0, response_1.sendSuccess)(res, { status: resp.status }, `Test envoyé: ${resp.status}`);
        }
        catch {
            (0, response_1.sendError)(res, 'Impossible de joindre l\'URL', 400);
        }
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.webhooksRouter.post('/secret/regenerate', async (req, res) => {
    try {
        const newSecret = `whsec_${crypto_1.default.randomBytes(24).toString('hex')}`;
        await prisma_1.prisma.webhook.updateMany({ where: { userId: req.user.id }, data: { secret: newSecret } });
        (0, response_1.sendSuccess)(res, { secret: newSecret }, 'Secret régénéré');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.notificationsRouter = (0, express_1.Router)();
exports.notificationsRouter.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const unreadOnly = req.query.unread === 'true';
        const where = { userId: req.user.id };
        if (unreadOnly)
            where.read = false;
        const [notifications, total] = await Promise.all([
            prisma_1.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            prisma_1.prisma.notification.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, notifications, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.notificationsRouter.patch('/:id/read', async (req, res) => {
    try {
        await prisma_1.prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { read: true } });
        (0, response_1.sendSuccess)(res, null, 'Notification lue');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.notificationsRouter.post('/read-all', async (req, res) => {
    try {
        await prisma_1.prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
        (0, response_1.sendSuccess)(res, null, 'Toutes les notifications lues');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.supportRouter = (0, express_1.Router)();
exports.supportRouter.get('/articles', async (req, res) => {
    try {
        const { category, search } = req.query;
        const where = { published: true };
        if (category)
            where.category = category;
        if (search)
            where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { content: { contains: search, mode: 'insensitive' } }];
        const articles = await prisma_1.prisma.supportArticle.findMany({ where, orderBy: { views: 'desc' }, take: 20 });
        (0, response_1.sendSuccess)(res, articles);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.supportRouter.get('/articles/:id', async (req, res) => {
    try {
        const article = await prisma_1.prisma.supportArticle.findUnique({ where: { id: req.params.id } });
        if (!article)
            return (0, response_1.sendError)(res, 'Article non trouvé', 404);
        await prisma_1.prisma.supportArticle.update({ where: { id: article.id }, data: { views: { increment: 1 } } });
        (0, response_1.sendSuccess)(res, article);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.supportRouter.get('/faq', async (_req, res) => {
    try {
        const faq = await prisma_1.prisma.faq.findMany({ where: { active: true }, orderBy: { position: 'asc' } });
        (0, response_1.sendSuccess)(res, faq);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.supportRouter.post('/tickets', async (req, res) => {
    try {
        const { subject, message, category, priority } = req.body;
        if (!subject || !message)
            return (0, response_1.sendError)(res, 'Sujet et message requis', 400);
        const ticket = await prisma_1.prisma.supportTicket.create({
            data: {
                userId: req.user.id,
                subject,
                category,
                priority: priority?.toUpperCase() || 'MEDIUM',
                messages: { create: { senderId: req.user.id, content: message } },
            },
            include: { messages: true },
        });
        (0, response_1.sendSuccess)(res, ticket, 'Ticket créé', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.supportRouter.get('/tickets', async (req, res) => {
    try {
        const tickets = await prisma_1.prisma.supportTicket.findMany({
            where: { userId: req.user.id },
            include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
            orderBy: { updatedAt: 'desc' },
        });
        (0, response_1.sendSuccess)(res, tickets);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.supportRouter.get('/tickets/:id', async (req, res) => {
    try {
        const ticket = await prisma_1.prisma.supportTicket.findFirst({
            where: { id: req.params.id, userId: req.user.id },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (!ticket)
            return (0, response_1.sendError)(res, 'Ticket non trouvé', 404);
        (0, response_1.sendSuccess)(res, ticket);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.supportRouter.post('/tickets/:id/reply', async (req, res) => {
    try {
        const { message } = req.body;
        const ticket = await prisma_1.prisma.supportTicket.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!ticket)
            return (0, response_1.sendError)(res, 'Ticket non trouvé', 404);
        if (ticket.status === 'CLOSED')
            return (0, response_1.sendError)(res, 'Ticket fermé', 400);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.ticketMessage.create({ data: { ticketId: ticket.id, senderId: req.user.id, content: message } }),
            prisma_1.prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'WAITING', updatedAt: new Date() } }),
        ]);
        (0, response_1.sendSuccess)(res, null, 'Réponse envoyée');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.paymentsRouter = (0, express_1.Router)();
exports.paymentsRouter.post('/initiate', async (req, res) => {
    try {
        const { amount, method, packId } = req.body;
        if (!amount || !method)
            return (0, response_1.sendError)(res, 'Montant et méthode requis', 400);
        const reference = `XH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const payment = await prisma_1.prisma.payment.create({
            data: {
                userId: req.user.id,
                amount,
                method: method.toUpperCase(),
                reference,
                packId,
                status: 'PENDING',
            },
        });
        (0, response_1.sendSuccess)(res, { payment, reference, paymentUrl: `https://pay.xhris.host/checkout/${reference}` }, 'Paiement initié');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.paymentsRouter.post('/fapshi/initiate', async (req, res) => {
    try {
        const { packId, coins, amount, phone } = req.body;
        if (!packId || !coins || !amount || !phone)
            return (0, response_1.sendError)(res, 'Paramètres manquants', 400);
        const FAPSHI_API_KEY = process.env.FAPSHI_API_KEY || '';
        const FAPSHI_API_USER = process.env.FAPSHI_API_USER || '';
        const amountXAF = Math.round(amount * 655);
        const reference = `XH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        await prisma_1.prisma.payment.create({
            data: { userId: req.user.id, amount, method: 'FAPSHI', reference, packId, status: 'PENDING' },
        });
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
            const fapshiData = await fapshiRes.json();
            if (!fapshiRes.ok)
                return (0, response_1.sendError)(res, fapshiData?.message || 'Erreur Fapshi', 400);
            (0, response_1.sendSuccess)(res, { reference, link: fapshiData?.link }, 'Paiement Fapshi initié');
        }
        else {
            (0, response_1.sendSuccess)(res, { reference, link: null }, 'Paiement en attente de configuration Fapshi');
        }
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur lors de l\'initiation Fapshi', 500);
    }
});
exports.paymentsRouter.post('/geniuspay/initiate', async (req, res) => {
    try {
        const { packId, coins, amount, currency = 'XOF', description, successUrl, errorUrl } = req.body;
        if (!packId || !coins || !amount)
            return (0, response_1.sendError)(res, 'Paramètres manquants', 400);
        const GP_PUBLIC_KEY = process.env.GENIUSPAY_PUBLIC_KEY || '';
        const GP_SECRET_KEY = process.env.GENIUSPAY_SECRET_KEY || '';
        const reference = `XH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        await prisma_1.prisma.payment.create({
            data: { userId: req.user.id, amount, method: 'GENIUSPAY', reference, packId, status: 'PENDING' },
        });
        if (GP_PUBLIC_KEY && GP_SECRET_KEY) {
            const gpRes = await fetch('https://pay.genius.ci/api/v1/merchant/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': GP_PUBLIC_KEY,
                    'X-API-Secret': GP_SECRET_KEY,
                },
                body: JSON.stringify({
                    amount,
                    currency,
                    description: description || `XHRIS Host - ${coins} Coins (${packId})`,
                    customer: { email: req.user.email },
                    metadata: { order_id: reference, pack_id: packId, coins, user_id: req.user.id },
                    success_url: successUrl || `${process.env.FRONTEND_URL}/dashboard/coins/buy?success=1&ref=${reference}`,
                    error_url: errorUrl || `${process.env.FRONTEND_URL}/dashboard/coins/buy?error=1&ref=${reference}`,
                }),
            });
            const gpData = await gpRes.json();
            if (!gpRes.ok)
                return (0, response_1.sendError)(res, gpData?.error?.message || 'Erreur GeniusPay', 400);
            (0, response_1.sendSuccess)(res, {
                reference,
                checkoutUrl: gpData.data?.checkout_url,
                paymentUrl: gpData.data?.payment_url,
                gpReference: gpData.data?.reference,
            }, 'Paiement GeniusPay initié');
        }
        else {
            (0, response_1.sendSuccess)(res, { reference, checkoutUrl: null }, 'GeniusPay non configuré — mode dev');
        }
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur GeniusPay', 500);
    }
});
exports.paymentsRouter.post('/geniuspay/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        const timestamp = req.headers['x-webhook-timestamp'];
        const event = req.headers['x-webhook-event'];
        const webhookSecret = process.env.GENIUSPAY_WEBHOOK_SECRET || '';
        if (webhookSecret && signature && timestamp) {
            const { createHmac } = await Promise.resolve().then(() => __importStar(require('crypto')));
            const data = `${timestamp}.${JSON.stringify(req.body)}`;
            const expected = createHmac('sha256', webhookSecret).update(data).digest('hex');
            if (expected !== signature) {
                return res.status(401).json({ success: false, message: 'Signature invalide' });
            }
            if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) {
                return res.status(400).json({ success: false, message: 'Timestamp expiré' });
            }
        }
        const payload = req.body;
        const gpRef = payload?.data?.metadata?.order_id;
        if (event === 'payment.success' && gpRef) {
            const payment = await prisma_1.prisma.payment.findUnique({ where: { reference: gpRef } });
            if (payment && payment.status === 'PENDING') {
                const coinsToCredit = Number(payload?.data?.metadata?.coins) || 0;
                await prisma_1.prisma.$transaction([
                    prisma_1.prisma.payment.update({ where: { reference: gpRef }, data: { status: 'COMPLETED' } }),
                    ...(coinsToCredit > 0 ? [
                        prisma_1.prisma.user.update({ where: { id: payment.userId }, data: { coins: { increment: coinsToCredit } } }),
                        prisma_1.prisma.transaction.create({
                            data: {
                                userId: payment.userId,
                                type: 'PURCHASE',
                                amount: coinsToCredit,
                                description: `Achat ${coinsToCredit} coins via GeniusPay`,
                                reference: gpRef,
                            },
                        }),
                    ] : []),
                ]);
            }
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false });
    }
});
exports.paymentsRouter.get('/verify/:reference', async (req, res) => {
    try {
        const payment = await prisma_1.prisma.payment.findUnique({ where: { reference: req.params.reference } });
        if (!payment)
            return (0, response_1.sendError)(res, 'Paiement non trouvé', 404);
        (0, response_1.sendSuccess)(res, payment);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.paymentsRouter.post('/withdraw', async (req, res) => {
    try {
        const { amount, method, details } = req.body;
        if (!amount || amount < 10)
            return (0, response_1.sendError)(res, 'Montant minimum: €10', 400);
        if (!method)
            return (0, response_1.sendError)(res, 'Méthode requise', 400);
        const fees = { CARD: 0.015, PAYPAL: 0.025, CRYPTO: 0.010, BANK_TRANSFER: 0.005 };
        const fee = amount * (fees[method.toUpperCase()] || 0.015);
        const net = amount - fee;
        const withdrawal = await prisma_1.prisma.withdrawal.create({
            data: { userId: req.user.id, amount, fee, net, method: method.toUpperCase(), details: details || {} },
        });
        (0, response_1.sendSuccess)(res, withdrawal, 'Demande de retrait soumise', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.paymentsRouter.get('/withdrawals', async (req, res) => {
    try {
        const withdrawals = await prisma_1.prisma.withdrawal.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
        (0, response_1.sendSuccess)(res, withdrawals);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
