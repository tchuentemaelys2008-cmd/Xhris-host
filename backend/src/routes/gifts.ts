import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'xhris-secret-key';

// Resolve authenticated user from JWT or x-api-key (optional auth)
async function resolveUser(req: any): Promise<{ userId: string; isAdmin: boolean; channelJoined: boolean } | null> {
  // Already resolved by authMiddleware upstream
  if (req.user?.id) {
    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (u) return { userId: u.id, isAdmin: u.role === 'ADMIN' || u.role === 'SUPERADMIN', channelJoined: !!(u as any).channelJoined };
  }

  // JWT from Authorization header
  const authHeader = req.headers['authorization'] as string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
      if (decoded?.id) {
        const u = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (u) return { userId: u.id, isAdmin: u.role === 'ADMIN' || u.role === 'SUPERADMIN', channelJoined: !!(u as any).channelJoined };
      }
    } catch { /* invalid token — treat as unauthenticated */ }
  }

  // API key
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey) {
    const key = await prisma.apiKey.findFirst({ where: { key: apiKey, status: 'ACTIVE' } });
    if (key) {
      const u = await prisma.user.findUnique({ where: { id: key.userId } });
      if (u) return { userId: u.id, isAdmin: u.role === 'ADMIN' || u.role === 'SUPERADMIN', channelJoined: !!(u as any).channelJoined };
    }
  }

  return null;
}

// ── GET /api/gifts/active — cadeaux mode "site" pour la bannière dashboard ──
router.get('/active', async (_req, res: Response) => {
  try {
    const now = new Date();
    const gifts = await (prisma as any).giftDrop.findMany({
      where: { active: true, distributionMode: 'site', expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { _count: { select: { claims: true } } },
    });
    const filtered = gifts.filter((g: any) => (g._count?.claims || 0) < g.totalCapacity);
    sendSuccess(res, filtered.map((g: any) => ({
      id: g.id, title: g.title, description: g.description,
      mainReward: g.mainReward, consolationReward: g.consolationReward,
      winnersLimit: g.winnersLimit, claimsCount: g._count?.claims || 0,
      expiresAt: g.expiresAt, requireChannelJoin: g.requireChannelJoin,
    })));
  } catch (err: any) {
    sendError(res, 'Erreur', 500);
  }
});

// ── GET /api/gifts/:idOrCode — détails d'un cadeau ──────────────────────────
router.get('/:idOrCode', async (req: any, res: Response) => {
  try {
    const { idOrCode } = req.params;
    const gift = await (prisma as any).giftDrop.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }] },
      include: { _count: { select: { claims: true } } },
    });
    if (!gift) return sendError(res, 'Cadeau introuvable', 404);

    const auth = await resolveUser(req);
    let userClaim = null;
    if (auth) {
      userClaim = await (prisma as any).giftClaim.findUnique({
        where: { giftDropId_userId: { giftDropId: gift.id, userId: auth.userId } },
      });
    }

    sendSuccess(res, {
      id: gift.id, code: gift.code, title: gift.title, description: gift.description,
      mainReward: gift.mainReward, consolationReward: gift.consolationReward,
      winnersLimit: gift.winnersLimit, totalCapacity: gift.totalCapacity,
      claimsCount: gift._count?.claims || 0,
      expiresAt: gift.expiresAt, requireChannelJoin: gift.requireChannelJoin,
      active: gift.active,
      isExpired: new Date(gift.expiresAt) <= new Date(),
      isFull: (gift._count?.claims || 0) >= gift.totalCapacity,
      userClaim: userClaim ? {
        rewardType: userClaim.rewardType, coinsEarned: userClaim.coinsEarned,
        position: userClaim.position, claimedAt: userClaim.claimedAt,
      } : null,
      userChannelJoined: auth?.channelJoined || false,
      isAuthenticated: !!auth,
    });
  } catch (err: any) {
    sendError(res, 'Erreur: ' + err.message, 500);
  }
});

// ── POST /api/gifts/:idOrCode/claim ─────────────────────────────────────────
router.post('/:idOrCode/claim', async (req: any, res: Response) => {
  try {
    const auth = await resolveUser(req);
    if (!auth) return sendError(res, 'Connexion requise pour réclamer', 401);

    const { idOrCode } = req.params;
    const gift = await (prisma as any).giftDrop.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }] },
    });
    if (!gift) return sendError(res, 'Cadeau introuvable', 404);
    if (!gift.active) return sendError(res, 'Cadeau désactivé', 400);
    if (new Date(gift.expiresAt) <= new Date()) return sendError(res, 'Cadeau expiré', 400);

    if (gift.requireChannelJoin && !auth.channelJoined) {
      return sendError(res, 'Tu dois d\'abord rejoindre la chaîne WhatsApp (voir /dashboard/growth)', 403);
    }

    const existing = await (prisma as any).giftClaim.findUnique({
      where: { giftDropId_userId: { giftDropId: gift.id, userId: auth.userId } },
    });
    if (existing) {
      return sendError(res, `Tu as déjà réclamé ce cadeau (+${existing.coinsEarned} coins)`, 400);
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const currentClaims = await tx.giftClaim.count({ where: { giftDropId: gift.id } });
      if (currentClaims >= gift.totalCapacity) throw new Error('CAPACITY_FULL');

      const position = currentClaims + 1;
      const isWinner = position <= gift.winnersLimit;
      const rewardType = isWinner ? 'main' : 'consolation';
      const coinsEarned = isWinner ? gift.mainReward : gift.consolationReward;
      if (coinsEarned <= 0) throw new Error('NO_CONSOLATION');

      await tx.giftClaim.create({ data: { giftDropId: gift.id, userId: auth.userId, rewardType, coinsEarned, position } });
      await tx.user.update({ where: { id: auth.userId }, data: { coins: { increment: coinsEarned } } });
      await tx.transaction.create({
        data: {
          userId: auth.userId, type: 'BONUS_CODE', amount: coinsEarned,
          description: `🎁 Cadeau "${gift.title}" (${isWinner ? 'lot principal' : 'consolation'})`,
        },
      });
      return { isWinner, coinsEarned, position };
    });

    const msg = result.isWinner
      ? `🎉 Félicitations ! Tu es ${result.position}${result.position === 1 ? 'er' : 'e'} et reçois ${result.coinsEarned} coins !`
      : `🎁 Lot consolation : +${result.coinsEarned} coins. Sois plus rapide la prochaine fois !`;

    sendSuccess(res, { rewardType: result.isWinner ? 'main' : 'consolation', coinsEarned: result.coinsEarned, position: result.position, message: msg });
  } catch (err: any) {
    if (err.message === 'CAPACITY_FULL') return sendError(res, 'Tous les cadeaux ont été distribués', 410);
    if (err.message === 'NO_CONSOLATION') return sendError(res, 'Les lots ont tous été pris et aucune consolation n\'est prévue', 410);
    console.error('[gifts/claim]', err.message);
    sendError(res, 'Erreur: ' + err.message, 500);
  }
});

export default router;
