"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReferralLeaderboard = exports.getReferralStats = exports.getTransactions = exports.applyBonusCode = exports.claimDailyBonus = exports.transferCoins = exports.purchaseCoins = exports.getPacks = exports.getBalance = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const webhooks_service_1 = require("../webhooks/webhooks.service");
const getBalance = async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { coins: true },
        });
        return res.json({ success: true, data: { coins: user?.coins || 0 } });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getBalance = getBalance;
const getPacks = async (_req, res) => {
    try {
        const packs = await prisma_1.prisma.creditPack.findMany({
            where: { active: true },
            orderBy: { coins: 'asc' },
        });
        return res.json({ success: true, data: packs });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getPacks = getPacks;
const purchaseCoins = async (req, res) => {
    try {
        const { packId, method } = req.body;
        if (!packId || !method)
            return res.status(400).json({ success: false, message: 'packId et method requis' });
        const pack = await prisma_1.prisma.creditPack.findUnique({ where: { id: packId } });
        if (!pack || !pack.active)
            return res.status(404).json({ success: false, message: 'Pack non trouvé' });
        const totalCoins = pack.coins + (pack.bonus || 0);
        const payment = await prisma_1.prisma.payment.create({
            data: {
                userId: req.user.id,
                amount: pack.price,
                currency: pack.currency,
                method: method.toUpperCase(),
                status: 'PENDING',
                coins: totalCoins,
                packId: pack.id,
            },
        });
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { coins: { increment: totalCoins } } }),
            prisma_1.prisma.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED' } }),
            prisma_1.prisma.transaction.create({
                data: {
                    userId: req.user.id,
                    type: 'PURCHASE',
                    description: `Achat ${pack.coins} Coins (${pack.name})`,
                    amount: totalCoins,
                    status: 'COMPLETED',
                    reference: payment.id,
                },
            }),
            prisma_1.prisma.notification.create({
                data: {
                    userId: req.user.id,
                    title: 'Achat réussi ! 🎉',
                    message: `Vous avez reçu ${totalCoins} Coins.`,
                    type: 'PAYMENT',
                },
            }),
        ]);
        await (0, webhooks_service_1.fireWebhook)(req.user.id, 'paiement.succes', { packId, coins: totalCoins, amount: pack.price });
        return res.json({ success: true, message: `Achat réussi ! ${totalCoins} Coins ajoutés.`, data: { coins: totalCoins } });
    }
    catch (error) {
        logger_1.logger.error('Purchase error:', error);
        return res.status(500).json({ success: false, message: 'Erreur lors de l\'achat' });
    }
};
exports.purchaseCoins = purchaseCoins;
const transferCoins = async (req, res) => {
    try {
        const { recipientId, amount } = req.body;
        const senderId = req.user.id;
        const FEE = 1;
        if (!recipientId || !amount)
            return res.status(400).json({ success: false, message: 'recipientId et amount requis' });
        if (amount < 1)
            return res.status(400).json({ success: false, message: 'Montant minimum: 1 Coin' });
        if (recipientId === senderId)
            return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous envoyer des Coins' });
        const [sender, recipient] = await Promise.all([
            prisma_1.prisma.user.findUnique({ where: { id: senderId }, select: { id: true, name: true, coins: true } }),
            prisma_1.prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, name: true, coins: true } }),
        ]);
        if (!sender)
            return res.status(404).json({ success: false, message: 'Expéditeur non trouvé' });
        if (!recipient)
            return res.status(404).json({ success: false, message: 'Destinataire non trouvé. Vérifiez l\'ID.' });
        const total = amount + FEE;
        if (sender.coins < total) {
            return res.status(400).json({ success: false, message: `Solde insuffisant. Vous avez ${sender.coins} Coins, besoin de ${total}.` });
        }
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: senderId }, data: { coins: { decrement: total } } }),
            prisma_1.prisma.user.update({ where: { id: recipientId }, data: { coins: { increment: amount } } }),
            prisma_1.prisma.coinTransfer.create({ data: { senderId, receiverId: recipientId, amount, fee: FEE, status: 'COMPLETED' } }),
            prisma_1.prisma.transaction.create({ data: { userId: senderId, type: 'TRANSFER_SENT', description: `Envoyé à ${recipient.name}`, amount: -total, status: 'COMPLETED' } }),
            prisma_1.prisma.transaction.create({ data: { userId: recipientId, type: 'TRANSFER_RECEIVED', description: `Reçu de ${sender.name}`, amount, status: 'COMPLETED' } }),
            prisma_1.prisma.notification.create({ data: { userId: recipientId, title: 'Coins reçus ! 🪙', message: `${sender.name} vous a envoyé ${amount} Coins.`, type: 'SUCCESS' } }),
        ]);
        return res.json({ success: true, message: `${amount} Coins envoyés à ${recipient.name}.` });
    }
    catch (error) {
        logger_1.logger.error('Transfer error:', error);
        return res.status(500).json({ success: false, message: 'Erreur lors du transfert' });
    }
};
exports.transferCoins = transferCoins;
const claimDailyBonus = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const alreadyClaimed = await prisma_1.prisma.dailyBonus.findFirst({
            where: { userId, claimedAt: { gte: today, lt: tomorrow } },
        });
        if (alreadyClaimed) {
            return res.status(400).json({ success: false, message: 'Bonus quotidien déjà réclamé aujourd\'hui' });
        }
        const DAILY_BONUS = 5;
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: userId }, data: { coins: { increment: DAILY_BONUS } } }),
            prisma_1.prisma.dailyBonus.create({ data: { userId, coins: DAILY_BONUS } }),
            prisma_1.prisma.transaction.create({ data: { userId, type: 'DAILY_BONUS', description: 'Récompense quotidienne', amount: DAILY_BONUS, status: 'COMPLETED' } }),
        ]);
        return res.json({ success: true, message: `+${DAILY_BONUS} Coins ! Revenez demain pour votre prochain bonus.`, data: { coins: DAILY_BONUS } });
    }
    catch (error) {
        logger_1.logger.error('Daily bonus error:', error);
        return res.status(500).json({ success: false, message: 'Erreur lors de la réclamation du bonus' });
    }
};
exports.claimDailyBonus = claimDailyBonus;
const applyBonusCode = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;
        const bonusCode = await prisma_1.prisma.bonusCode.findUnique({ where: { code: code.toUpperCase() } });
        if (!bonusCode || !bonusCode.active) {
            return res.status(404).json({ success: false, message: 'Code bonus invalide ou expiré' });
        }
        if (bonusCode.expiresAt && bonusCode.expiresAt < new Date()) {
            return res.status(400).json({ success: false, message: 'Code bonus expiré' });
        }
        if (bonusCode.usageLimit && bonusCode.usageCount >= bonusCode.usageLimit) {
            return res.status(400).json({ success: false, message: 'Code bonus épuisé' });
        }
        const alreadyUsed = await prisma_1.prisma.bonusCodeUsage.findUnique({ where: { codeId_userId: { codeId: bonusCode.id, userId } } });
        if (alreadyUsed)
            return res.status(400).json({ success: false, message: 'Vous avez déjà utilisé ce code' });
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: userId }, data: { coins: { increment: bonusCode.coins } } }),
            prisma_1.prisma.bonusCode.update({ where: { id: bonusCode.id }, data: { usageCount: { increment: 1 } } }),
            prisma_1.prisma.bonusCodeUsage.create({ data: { codeId: bonusCode.id, userId } }),
            prisma_1.prisma.transaction.create({ data: { userId, type: 'BONUS_CODE', description: `Code bonus: ${code}`, amount: bonusCode.coins, status: 'COMPLETED' } }),
        ]);
        return res.json({ success: true, message: `+${bonusCode.coins} Coins ajoutés !`, data: { coins: bonusCode.coins } });
    }
    catch (error) {
        logger_1.logger.error('Bonus code error:', error);
        return res.status(500).json({ success: false, message: 'Erreur lors de l\'application du code' });
    }
};
exports.applyBonusCode = applyBonusCode;
const getTransactions = async (req, res) => {
    try {
        const { type, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = { userId: req.user.id };
        if (type)
            where.type = type;
        const [txns, total] = await Promise.all([
            prisma_1.prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
            prisma_1.prisma.transaction.count({ where }),
        ]);
        return res.json({ success: true, data: { transactions: txns, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getTransactions = getTransactions;
const getReferralStats = async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { referralCode: true, _count: { select: { referrals: true } } },
        });
        const earned = await prisma_1.prisma.referral.aggregate({
            where: { referrerId: req.user.id },
            _sum: { coinsEarned: true },
        });
        return res.json({
            success: true,
            data: {
                referralCode: user?.referralCode,
                referralLink: `${process.env.FRONTEND_URL}/auth/register?ref=${user?.referralCode}`,
                totalReferrals: user?._count.referrals || 0,
                totalEarned: earned._sum.coinsEarned || 0,
            },
        });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getReferralStats = getReferralStats;
const getReferralLeaderboard = async (_req, res) => {
    try {
        const leaderboard = await prisma_1.prisma.user.findMany({
            select: { id: true, name: true, avatar: true, _count: { select: { referrals: true } } },
            orderBy: { referrals: { _count: 'desc' } },
            take: 10,
        });
        return res.json({ success: true, data: leaderboard });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getReferralLeaderboard = getReferralLeaderboard;
