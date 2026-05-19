import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

const STREAK_MILESTONES = [
  { days: 10, bonus: 50 },
  { days: 30, bonus: 150 },
  { days: 50, bonus: 250 },
  { days: 60, bonus: 300 },
];

async function getSettings() {
  let s = await (prisma as any).appSettings.findUnique({ where: { id: 'singleton' } });
  if (!s) s = await (prisma as any).appSettings.create({ data: { id: 'singleton' } });
  return s;
}

async function getUnlockedMilestones(userId: string): Promise<number[]> {
  const rows = await (prisma as any).taskCompletion.findMany({
    where: { userId, taskType: 'streak_milestone' },
    select: { metadata: true },
  });
  return rows
    .map((r: any) => { try { return JSON.parse(r.metadata || '{}').days; } catch { return 0; } })
    .filter((d: number) => d > 0);
}

// GET /api/growth/tasks
router.get('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, 'Utilisateur introuvable', 404);

    const settings = await getSettings();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Task 1: join channel
    const taskJoinChannel = {
      id: 'join_channel',
      title: 'Rejoindre la chaîne WhatsApp',
      description: 'Rejoins XHRIS MD pour ne rien manquer',
      reward: settings.joinChannelBonus,
      completed: !!(user as any).channelJoined,
      action: 'https://whatsapp.com/channel/0029Vark1I1AYlUR1G8YMX31',
    };

    // Task 2: daily login (with streak data)
    const todayLogin = await (prisma as any).taskCompletion.findFirst({
      where: { userId, taskType: 'daily_login', createdAt: { gte: todayStart } },
    });
    const lastCompletion = await (prisma as any).taskCompletion.findFirst({
      where: { userId, taskType: 'daily_login' },
      orderBy: { createdAt: 'desc' },
    });
    const unlockedMilestones = await getUnlockedMilestones(userId);
    const streak = (user as any).loginStreak || 0;
    const streakBonus = Math.min(15, streak);
    const nextMilestone = STREAK_MILESTONES.find(m => !unlockedMilestones.includes(m.days)) || null;
    const taskDailyLogin = {
      id: 'daily_login',
      title: 'Connexion quotidienne',
      description: `+${settings.dailyLoginBonus} coins/jour${streakBonus > 0 ? ` + ${streakBonus} streak` : ''}`,
      reward: settings.dailyLoginBonus + streakBonus,
      completed: !!todayLogin,
      streak,
      lastClaimedAt: lastCompletion?.createdAt || null,
      milestonesCompleted: unlockedMilestones,
      nextMilestone,
    };

    // Task 3: referral
    const refCount = await (prisma as any).taskCompletion.count({
      where: { userId, taskType: 'referral' },
    });
    const taskReferral = {
      id: 'referral',
      title: 'Inviter des amis',
      description: `+${settings.referralBonus} coins par ami inscrit`,
      reward: settings.referralBonus,
      completed: false,
      progress: refCount,
      link: `https://xhrishost.site?ref=${userId}`,
    };

    // Task 4: share
    const todayShare = await (prisma as any).growthShare.findFirst({
      where: { userId, createdAt: { gte: todayStart } },
    });
    const shareCount = await (prisma as any).growthShare.count({ where: { userId } });
    const taskShare = {
      id: 'share',
      title: 'Partager le site',
      description: `+${settings.shareBonus} coins/jour, max 7 jours`,
      reward: settings.shareBonus,
      completed: !!todayShare,
      progress: shareCount,
      maxProgress: 7,
      link: `https://xhrishost.site?ref=${userId}`,
    };

    sendSuccess(res, {
      tasks: [taskJoinChannel, taskDailyLogin, taskReferral, taskShare],
      coins: user.coins,
    });
  } catch (err: any) {
    console.error('[growth/tasks]', err.message);
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/growth/complete/:taskId
router.post('/complete/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { taskId } = req.params;
    const settings = await getSettings();

    // ── join_channel ──────────────────────────────────────────────────────────
    if (taskId === 'join_channel') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if ((user as any)?.channelJoined) return sendError(res, 'Déjà complété', 400);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { channelJoined: true, channelJoinedAt: new Date(), coins: { increment: settings.joinChannelBonus } } as any,
        }),
        (prisma as any).taskCompletion.create({
          data: { userId, taskType: 'join_channel', rewardCoins: settings.joinChannelBonus },
        }),
        prisma.transaction.create({
          data: { userId, type: 'BONUS_CODE', amount: settings.joinChannelBonus, description: 'Rejoint la chaîne WhatsApp' },
        }),
      ]);
      return sendSuccess(res, { reward: settings.joinChannelBonus }, `+${settings.joinChannelBonus} coins !`);
    }

    // ── daily_login ───────────────────────────────────────────────────────────
    if (taskId === 'daily_login') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);

      const alreadyToday = await (prisma as any).taskCompletion.findFirst({
        where: { userId, taskType: 'daily_login', createdAt: { gte: todayStart } },
      });
      if (alreadyToday) return sendError(res, "Déjà activé aujourd'hui", 400);

      const hadYesterday = await (prisma as any).taskCompletion.findFirst({
        where: { userId, taskType: 'daily_login', createdAt: { gte: yesterdayStart, lt: todayStart } },
      });
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const newStreak = hadYesterday ? ((user as any).loginStreak || 0) + 1 : 1;
      const bonus = Math.min(15, newStreak - 1);
      const reward = settings.dailyLoginBonus + bonus;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { loginStreak: newStreak, lastLoginAt: new Date(), coins: { increment: reward } } as any,
        }),
        (prisma as any).taskCompletion.create({
          data: { userId, taskType: 'daily_login', rewardCoins: reward, metadata: JSON.stringify({ streak: newStreak }) },
        }),
        prisma.transaction.create({
          data: { userId, type: 'BONUS_CODE', amount: reward, description: `Connexion quotidienne (streak ${newStreak}j)` },
        }),
      ]);

      // Check streak milestone bonus
      const milestone = STREAK_MILESTONES.find(m => m.days === newStreak);
      let milestoneUnlocked: { days: number; bonus: number } | null = null;
      if (milestone) {
        const alreadyGiven = await (prisma as any).taskCompletion.findFirst({
          where: { userId, taskType: 'streak_milestone', metadata: { contains: `"days":${milestone.days}` } },
        });
        if (!alreadyGiven) {
          await prisma.$transaction([
            prisma.user.update({ where: { id: userId }, data: { coins: { increment: milestone.bonus } } }),
            (prisma as any).taskCompletion.create({
              data: { userId, taskType: 'streak_milestone', rewardCoins: milestone.bonus, metadata: JSON.stringify({ days: milestone.days }) },
            }),
            prisma.transaction.create({
              data: { userId, type: 'BONUS_CODE', amount: milestone.bonus, description: `Palier streak ${milestone.days} jours !` },
            }),
          ]);
          milestoneUnlocked = { days: milestone.days, bonus: milestone.bonus };
        }
      }

      const msg = milestoneUnlocked
        ? `+${reward} coins ! Palier ${milestoneUnlocked.days}j débloqué → +${milestoneUnlocked.bonus} coins bonus !`
        : `+${reward} coins (streak ${newStreak}j)`;

      return sendSuccess(res, { reward, streak: newStreak, milestoneUnlocked }, msg);
    }

    // ── share ─────────────────────────────────────────────────────────────────
    if (taskId === 'share') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const alreadyToday = await (prisma as any).growthShare.findFirst({
        where: { userId, createdAt: { gte: todayStart } },
      });
      if (alreadyToday) return sendError(res, "Déjà partagé aujourd'hui", 400);

      const totalShares = await (prisma as any).growthShare.count({ where: { userId } });
      if (totalShares >= 7) return sendError(res, 'Maximum 7 partages atteint', 400);

      const platform = req.body?.platform || 'unknown';
      await prisma.$transaction([
        (prisma as any).growthShare.create({ data: { userId, platform } }),
        prisma.user.update({ where: { id: userId }, data: { coins: { increment: settings.shareBonus } } }),
        prisma.transaction.create({
          data: { userId, type: 'BONUS_CODE', amount: settings.shareBonus, description: 'Partage du site' },
        }),
      ]);
      return sendSuccess(res, { reward: settings.shareBonus }, `+${settings.shareBonus} coins !`);
    }

    return sendError(res, 'Tâche inconnue', 400);
  } catch (err: any) {
    console.error('[growth/complete]', err.message);
    sendError(res, 'Erreur: ' + err.message, 500);
  }
});

// GET /api/growth/referral-stats
router.get('/referral-stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const totalReferred = await prisma.user.count({ where: { referredBy: userId } });
    const earned = await (prisma as any).taskCompletion.aggregate({
      where: { userId, taskType: 'referral' },
      _sum: { rewardCoins: true },
    });
    sendSuccess(res, {
      referralLink: `https://xhrishost.site?ref=${userId}`,
      totalReferred,
      totalEarned: earned._sum.rewardCoins || 0,
    });
  } catch {
    sendError(res, 'Erreur', 500);
  }
});

export default router;
