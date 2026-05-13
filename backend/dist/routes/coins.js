"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.get('/balance', async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { coins: true },
        });
        (0, response_1.sendSuccess)(res, { coins: user?.coins || 0 });
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/packs', async (_req, res) => {
    try {
        const packs = await prisma_1.prisma.creditPack.findMany({
            where: { active: true },
            orderBy: { coins: 'asc' },
        });
        const defaultPacks = [
            { id: 'pack-100', name: '100 Coins', coins: 100, price: 2.49, currency: 'EUR', label: 'Idéal pour commencer' },
            { id: 'pack-250', name: '250 Coins', coins: 250, price: 4.99, currency: 'EUR', label: 'Parfait pour les petits projets' },
            { id: 'pack-500', name: '500 Coins', coins: 500, price: 9.99, currency: 'EUR', popular: true, label: 'Le plus populaire' },
            { id: 'pack-1000', name: '1,000 Coins', coins: 1000, price: 17.99, currency: 'EUR', label: 'Pour les utilisateurs réguliers' },
            { id: 'pack-2500', name: '2,500 Coins', coins: 2500, price: 39.99, currency: 'EUR', label: 'Pour les pros' },
        ];
        (0, response_1.sendSuccess)(res, packs.length > 0 ? packs : defaultPacks);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/purchase', async (req, res) => {
    try {
        const { packId, method } = req.body;
        if (!packId || !method)
            return (0, response_1.sendError)(res, 'Pack et méthode requis', 400);
        const defaultPacks = {
            'pack-100': { coins: 100, price: 2.49 },
            'pack-250': { coins: 250, price: 4.99 },
            'pack-500': { coins: 500, price: 9.99 },
            'pack-1000': { coins: 1000, price: 17.99 },
            'pack-2500': { coins: 2500, price: 39.99 },
        };
        const pack = defaultPacks[packId];
        if (!pack)
            return (0, response_1.sendError)(res, 'Pack invalide', 400);
        const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { coins: { increment: pack.coins } } }),
            prisma_1.prisma.transaction.create({
                data: {
                    userId: req.user.id,
                    type: 'PURCHASE',
                    description: `Achat de ${pack.coins} Coins`,
                    amount: pack.coins,
                    reference,
                },
            }),
        ]);
        (0, response_1.sendSuccess)(res, { coins: pack.coins, reference }, `${pack.coins} Coins ajoutés à votre compte`);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur lors de l\'achat', 500);
    }
});
router.post('/transfer', async (req, res) => {
    try {
        const { recipientId, amount } = req.body;
        if (!recipientId || !amount || amount <= 0)
            return (0, response_1.sendError)(res, 'Destinataire et montant valides requis', 400);
        if (recipientId === req.user.id)
            return (0, response_1.sendError)(res, 'Impossible de s\'envoyer des coins à soi-même', 400);
        const sender = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { coins: true, name: true } });
        const fee = 1;
        const total = amount + fee;
        if (!sender || sender.coins < total)
            return (0, response_1.sendError)(res, 'Solde insuffisant', 400);
        const recipient = await prisma_1.prisma.user.findUnique({ where: { id: recipientId } });
        if (!recipient)
            return (0, response_1.sendError)(res, 'Utilisateur destinataire non trouvé', 404);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { coins: { decrement: total } } }),
            prisma_1.prisma.user.update({ where: { id: recipientId }, data: { coins: { increment: amount } } }),
            prisma_1.prisma.transaction.create({ data: { userId: req.user.id, type: 'TRANSFER_SENT', description: `Envoi à @${recipient.name}`, amount: -amount } }),
            prisma_1.prisma.transaction.create({ data: { userId: recipientId, type: 'TRANSFER_RECEIVED', description: `Reçu de @${sender.name || 'Utilisateur'}`, amount } }),
            prisma_1.prisma.coinTransfer.create({ data: { senderId: req.user.id, receiverId: recipientId, amount, fee } }),
            prisma_1.prisma.notification.create({ data: { userId: recipientId, title: 'Coins reçus !', message: `Vous avez reçu ${amount} Coins de @${sender.name || 'Utilisateur'}.`, type: 'SUCCESS' } }),
            prisma_1.prisma.notification.create({ data: { userId: req.user.id, title: 'Transfert effectué', message: `Votre solde a été réduit de ${total} Coins (${amount} envoyés + ${fee} de frais) à @${recipient.name}.`, type: 'INFO' } }),
        ]);
        (0, response_1.sendSuccess)(res, { amount, recipientName: recipient.name }, `${amount} Coins envoyés avec succès`);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur lors du transfert', 500);
    }
});
router.post('/daily-bonus', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existing = await prisma_1.prisma.transaction.findFirst({
            where: { userId: req.user.id, type: 'DAILY_BONUS', createdAt: { gte: today } },
        });
        if (existing)
            return (0, response_1.sendError)(res, 'Bonus quotidien déjà réclamé', 400);
        const bonusAmount = 3;
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { coins: { increment: bonusAmount } } }),
            prisma_1.prisma.transaction.create({ data: { userId: req.user.id, type: 'DAILY_BONUS', description: 'Récompense quotidienne', amount: bonusAmount } }),
        ]);
        (0, response_1.sendSuccess)(res, { coins: bonusAmount }, `+${bonusAmount} Coins bonus quotidien reçus !`);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/bonus-code', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code)
            return (0, response_1.sendError)(res, 'Code requis', 400);
        const bonusCode = await prisma_1.prisma.bonusCode.findUnique({ where: { code: code.toUpperCase() } });
        if (!bonusCode)
            return (0, response_1.sendError)(res, 'Code invalide', 404);
        if (!bonusCode.active)
            return (0, response_1.sendError)(res, 'Code désactivé', 400);
        if (bonusCode.usageLimit && bonusCode.usageCount >= bonusCode.usageLimit)
            return (0, response_1.sendError)(res, 'Code épuisé', 400);
        if (bonusCode.expiresAt && bonusCode.expiresAt < new Date())
            return (0, response_1.sendError)(res, 'Code expiré', 400);
        const alreadyUsed = await prisma_1.prisma.bonusCodeUsage.findUnique({
            where: { codeId_userId: { codeId: bonusCode.id, userId: req.user.id } },
        });
        if (alreadyUsed)
            return (0, response_1.sendError)(res, 'Vous avez déjà utilisé ce code', 400);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { coins: { increment: bonusCode.coins } } }),
            prisma_1.prisma.transaction.create({ data: { userId: req.user.id, type: 'BONUS_CODE', description: `Code bonus: ${code}`, amount: bonusCode.coins } }),
            prisma_1.prisma.bonusCode.update({ where: { id: bonusCode.id }, data: { usageCount: { increment: 1 } } }),
            prisma_1.prisma.bonusCodeUsage.create({ data: { codeId: bonusCode.id, userId: req.user.id } }),
        ]);
        (0, response_1.sendSuccess)(res, { coins: bonusCode.coins }, `+${bonusCode.coins} Coins ajoutés !`);
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
        const where = { userId: req.user.id };
        if (type && type !== 'all')
            where.type = type.toUpperCase();
        const [transactions, total] = await Promise.all([
            prisma_1.prisma.transaction.findMany({
                where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
            }),
            prisma_1.prisma.transaction.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, transactions, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/referral', async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { referralCode: true } });
        const referrals = await prisma_1.prisma.referral.findMany({ where: { referrerId: req.user.id }, orderBy: { createdAt: 'desc' } });
        (0, response_1.sendSuccess)(res, { referralCode: user?.referralCode, referrals, totalReferrals: referrals.length, totalEarned: referrals.length * 10 });
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/referral/leaderboard', async (_req, res) => {
    try {
        const leaderboard = await prisma_1.prisma.referral.groupBy({
            by: ['referrerId'],
            _count: { referrerId: true },
            orderBy: { _count: { referrerId: 'desc' } },
            take: 10,
        });
        const enriched = await Promise.all(leaderboard.map(async (item) => {
            const user = await prisma_1.prisma.user.findUnique({ where: { id: item.referrerId }, select: { name: true, avatar: true } });
            return { ...item, user, coins: item._count.referrerId * 10 };
        }));
        (0, response_1.sendSuccess)(res, enriched);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/recent-recipients', async (req, res) => {
    try {
        const recentTransfers = await prisma_1.prisma.coinTransfer.findMany({
            where: { senderId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 15,
            include: {
                receiver: { select: { id: true, name: true, avatar: true, plan: true } },
            },
        });
        const seen = new Set();
        const recipients = recentTransfers
            .filter(t => { if (seen.has(t.receiverId))
            return false; seen.add(t.receiverId); return true; })
            .slice(0, 5)
            .map(t => ({
            id: t.receiver.id,
            name: t.receiver.name,
            avatar: t.receiver.avatar,
            plan: t.receiver.plan,
            lastAmount: t.amount,
            lastDate: t.createdAt,
        }));
        (0, response_1.sendSuccess)(res, recipients);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.default = router;
