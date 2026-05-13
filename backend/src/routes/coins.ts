import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

const router = Router();

// GET /api/coins/balance
router.get('/balance', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { coins: true },
    });
    sendSuccess(res, { coins: user?.coins || 0 });
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/coins/packs
router.get('/packs', async (_req: AuthRequest, res: Response) => {
  try {
    const packs = await prisma.creditPack.findMany({
      where: { active: true },
      orderBy: { coins: 'asc' },
    });

    // Return defaults if DB empty
    const defaultPacks = [
      { id: 'pack-100', name: '100 Coins', coins: 100, price: 2.49, currency: 'EUR', label: 'Idéal pour commencer' },
      { id: 'pack-250', name: '250 Coins', coins: 250, price: 4.99, currency: 'EUR', label: 'Parfait pour les petits projets' },
      { id: 'pack-500', name: '500 Coins', coins: 500, price: 9.99, currency: 'EUR', popular: true, label: 'Le plus populaire' },
      { id: 'pack-1000', name: '1,000 Coins', coins: 1000, price: 17.99, currency: 'EUR', label: 'Pour les utilisateurs réguliers' },
      { id: 'pack-2500', name: '2,500 Coins', coins: 2500, price: 39.99, currency: 'EUR', label: 'Pour les pros' },
    ];

    sendSuccess(res, packs.length > 0 ? packs : defaultPacks);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/coins/purchase
router.post('/purchase', async (req: AuthRequest, res: Response) => {
  try {
    const { packId, method } = req.body;
    if (!packId || !method) return sendError(res, 'Pack et méthode requis', 400);

    const defaultPacks: Record<string, any> = {
      'pack-100': { coins: 100, price: 2.49 },
      'pack-250': { coins: 250, price: 4.99 },
      'pack-500': { coins: 500, price: 9.99 },
      'pack-1000': { coins: 1000, price: 17.99 },
      'pack-2500': { coins: 2500, price: 39.99 },
    };

    const pack = defaultPacks[packId];
    if (!pack) return sendError(res, 'Pack invalide', 400);

    // In production: process real payment here
    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { coins: { increment: pack.coins } } }),
      prisma.transaction.create({
        data: {
          userId: req.user!.id,
          type: 'PURCHASE',
          description: `Achat de ${pack.coins} Coins`,
          amount: pack.coins,
          reference,
        },
      }),
    ]);

    sendSuccess(res, { coins: pack.coins, reference }, `${pack.coins} Coins ajoutés à votre compte`);
  } catch (err) {
    sendError(res, 'Erreur lors de l\'achat', 500);
  }
});

// POST /api/coins/transfer
router.post('/transfer', async (req: AuthRequest, res: Response) => {
  try {
    const { recipientId, amount } = req.body;
    if (!recipientId || !amount || amount <= 0) return sendError(res, 'Destinataire et montant valides requis', 400);
    if (recipientId === req.user!.id) return sendError(res, 'Impossible de s\'envoyer des coins à soi-même', 400);

    const sender = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true, name: true } });
    const fee = 1;
    const total = amount + fee;

    if (!sender || sender.coins < total) return sendError(res, 'Solde insuffisant', 400);

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) return sendError(res, 'Utilisateur destinataire non trouvé', 404);

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { coins: { decrement: total } } }),
      prisma.user.update({ where: { id: recipientId }, data: { coins: { increment: amount } } }),
      prisma.transaction.create({ data: { userId: req.user!.id, type: 'TRANSFER_SENT', description: `Envoi à @${recipient.name}`, amount: -amount } }),
      prisma.transaction.create({ data: { userId: recipientId, type: 'TRANSFER_RECEIVED', description: `Reçu de @${sender.name || 'Utilisateur'}`, amount } }),
      prisma.coinTransfer.create({ data: { senderId: req.user!.id, receiverId: recipientId, amount, fee } }),
      prisma.notification.create({ data: { userId: recipientId, title: 'Coins reçus !', message: `Vous avez reçu ${amount} Coins de @${sender.name || 'Utilisateur'}.`, type: 'SUCCESS' } }),
      prisma.notification.create({ data: { userId: req.user!.id, title: 'Transfert effectué', message: `Votre solde a été réduit de ${total} Coins (${amount} envoyés + ${fee} de frais) à @${recipient.name}.`, type: 'INFO' } }),
    ]);

    sendSuccess(res, { amount, recipientName: recipient.name }, `${amount} Coins envoyés avec succès`);
  } catch (err) {
    sendError(res, 'Erreur lors du transfert', 500);
  }
});

// POST /api/coins/daily-bonus
router.post('/daily-bonus', async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.transaction.findFirst({
      where: { userId: req.user!.id, type: 'DAILY_BONUS', createdAt: { gte: today } },
    });
    if (existing) return sendError(res, 'Bonus quotidien déjà réclamé', 400);

    const bonusAmount = 3;
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { coins: { increment: bonusAmount } } }),
      prisma.transaction.create({ data: { userId: req.user!.id, type: 'DAILY_BONUS', description: 'Récompense quotidienne', amount: bonusAmount } }),
    ]);

    sendSuccess(res, { coins: bonusAmount }, `+${bonusAmount} Coins bonus quotidien reçus !`);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/coins/bonus-code
router.post('/bonus-code', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return sendError(res, 'Code requis', 400);

    const bonusCode = await prisma.bonusCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!bonusCode) return sendError(res, 'Code invalide', 404);
    if (!bonusCode.active) return sendError(res, 'Code désactivé', 400);
    if (bonusCode.usageLimit && bonusCode.usageCount >= bonusCode.usageLimit) return sendError(res, 'Code épuisé', 400);
    if (bonusCode.expiresAt && bonusCode.expiresAt < new Date()) return sendError(res, 'Code expiré', 400);

    const alreadyUsed = await prisma.bonusCodeUsage.findUnique({
      where: { codeId_userId: { codeId: bonusCode.id, userId: req.user!.id } },
    });
    if (alreadyUsed) return sendError(res, 'Vous avez déjà utilisé ce code', 400);

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { coins: { increment: bonusCode.coins } } }),
      prisma.transaction.create({ data: { userId: req.user!.id, type: 'BONUS_CODE', description: `Code bonus: ${code}`, amount: bonusCode.coins } }),
      prisma.bonusCode.update({ where: { id: bonusCode.id }, data: { usageCount: { increment: 1 } } }),
      prisma.bonusCodeUsage.create({ data: { codeId: bonusCode.id, userId: req.user!.id } }),
    ]);

    sendSuccess(res, { coins: bonusCode.coins }, `+${bonusCode.coins} Coins ajoutés !`);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/coins/transactions
router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;

    const where: any = { userId: req.user!.id };
    if (type && type !== 'all') where.type = type.toUpperCase();

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    sendPaginated(res, transactions, total, page, limit);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/coins/referral
router.get('/referral', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { referralCode: true } });
    const referrals = await prisma.referral.findMany({ where: { referrerId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, { referralCode: user?.referralCode, referrals, totalReferrals: referrals.length, totalEarned: referrals.length * 10 });
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/coins/referral/leaderboard
router.get('/referral/leaderboard', async (_req: AuthRequest, res: Response) => {
  try {
    const leaderboard = await prisma.referral.groupBy({
      by: ['referrerId'],
      _count: { referrerId: true },
      orderBy: { _count: { referrerId: 'desc' } },
      take: 10,
    });

    const enriched = await Promise.all(
      leaderboard.map(async (item) => {
        const user = await prisma.user.findUnique({ where: { id: item.referrerId }, select: { name: true, avatar: true } });
        return { ...item, user, coins: item._count.referrerId * 10 };
      })
    );

    sendSuccess(res, enriched);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/coins/recent-recipients
router.get('/recent-recipients', async (req: AuthRequest, res: Response) => {
  try {
    const recentTransfers = await prisma.coinTransfer.findMany({
      where: { senderId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        receiver: { select: { id: true, name: true, avatar: true, plan: true } },
      },
    });

    const seen = new Set<string>();
    const recipients = recentTransfers
      .filter(t => { if (seen.has(t.receiverId)) return false; seen.add(t.receiverId); return true; })
      .slice(0, 5)
      .map(t => ({
        id: t.receiver.id,
        name: t.receiver.name,
        avatar: t.receiver.avatar,
        plan: t.receiver.plan,
        lastAmount: t.amount,
        lastDate: t.createdAt,
      }));

    sendSuccess(res, recipients);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

export default router;
