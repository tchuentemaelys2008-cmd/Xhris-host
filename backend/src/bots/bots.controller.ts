import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

const DEPLOY_COST = 10; // coins per day
const MAX_DEPLOYS_PER_DAY = 10;

// ============ GET ALL BOTS ============
export const getAllBots = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId: req.user!.id };
    if (status) where.status = (status as string).toUpperCase();

    const [bots, total] = await Promise.all([
      prisma.bot.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.bot.count({ where }),
    ]);

    return res.json({ success: true, data: { bots, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    logger.error('getAllBots error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ GET BOT BY ID ============
export const getBotById = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });
    return res.json({ success: true, data: bot });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ DEPLOY BOT ============
export const deployBot = async (req: AuthRequest, res: Response) => {
  try {
    const { marketplaceBotId, sessionLink, envVars, serverId } = req.body;
    const userId = req.user!.id;

    // Check daily deploy limit
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const deployCount = await prisma.bot.count({ where: { userId, createdAt: { gte: today } } });
    if (deployCount >= MAX_DEPLOYS_PER_DAY) {
      return res.status(400).json({ success: false, message: `Limite de ${MAX_DEPLOYS_PER_DAY} déploiements par jour atteinte` });
    }

    // Check coins
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true } });
    if (!user || user.coins < DEPLOY_COST) {
      return res.status(400).json({ success: false, message: `Solde insuffisant. ${DEPLOY_COST} coins requis.` });
    }

    // Get marketplace bot info
    const marketplaceBot = marketplaceBotId
      ? await prisma.marketplaceBot.findUnique({ where: { id: marketplaceBotId } })
      : null;

    // Create bot
    const bot = await prisma.$transaction(async (tx) => {
      const newBot = await tx.bot.create({
        data: {
          name: marketplaceBot?.name || 'Mon Bot',
          description: marketplaceBot?.description,
          version: marketplaceBot?.version || '1.0.0',
          platform: marketplaceBot?.platform || 'WHATSAPP',
          status: 'STARTING',
          userId,
          serverId,
          sessionLink,
          envVars: envVars || {},
          coinsPerDay: DEPLOY_COST,
        },
      });

      // Deduct coins
      await tx.user.update({ where: { id: userId }, data: { coins: { decrement: DEPLOY_COST } } });
      await tx.transaction.create({
        data: { userId, type: 'DEPLOY_BOT', description: `Déploiement de ${newBot.name}`, amount: -DEPLOY_COST, status: 'COMPLETED' },
      });
      await tx.notification.create({
        data: { userId, title: 'Bot déployé ! 🤖', message: `${newBot.name} est en cours de démarrage.`, type: 'BOT' },
      });

      // Update marketplace downloads
      if (marketplaceBotId) {
        await tx.marketplaceBot.update({ where: { id: marketplaceBotId }, data: { downloads: { increment: 1 } } });
      }

      return newBot;
    });

    // Simulate bot starting (in prod: call your bot runner service)
    setTimeout(async () => {
      await prisma.bot.update({
        where: { id: bot.id },
        data: { status: 'RUNNING', logs: ['Bot démarré avec succès', 'Connexion WhatsApp établie', 'Session restaurée'] },
      }).catch(() => {});
    }, 3000);

    logger.info(`Bot deployed: ${bot.id} by ${userId}`);
    return res.status(201).json({ success: true, message: 'Bot déployé avec succès', data: bot });
  } catch (error) {
    logger.error('deployBot error:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors du déploiement' });
  }
};

// ============ START BOT ============
export const startBot = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });
    if (bot.status === 'RUNNING') return res.status(400).json({ success: false, message: 'Bot déjà en ligne' });

    // Check coins
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < bot.coinsPerDay) {
      return res.status(400).json({ success: false, message: `Solde insuffisant. ${bot.coinsPerDay} coins requis.` });
    }

    const updated = await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING' } });
    setTimeout(async () => {
      await prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } }).catch(() => {});
    }, 2000);

    return res.json({ success: true, message: 'Bot en cours de démarrage', data: updated });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ STOP BOT ============
export const stopBot = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });
    if (bot.status === 'STOPPED') return res.status(400).json({ success: false, message: 'Bot déjà arrêté' });

    const updated = await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STOPPED', cpuUsage: 0, ramUsage: 0 } });
    return res.json({ success: true, message: 'Bot arrêté', data: updated });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ RESTART BOT ============
export const restartBot = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });

    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING', restarts: { increment: 1 } } });
    setTimeout(async () => {
      await prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } }).catch(() => {});
    }, 2000);

    return res.json({ success: true, message: 'Bot en cours de redémarrage' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ DELETE BOT ============
export const deleteBot = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });

    await prisma.bot.delete({ where: { id: bot.id } });
    return res.json({ success: true, message: 'Bot supprimé' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ GET BOT LOGS ============
export const getBotLogs = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id }, select: { logs: true } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });

    const logs = bot.logs.map((log, i) => ({
      id: i,
      timestamp: new Date(Date.now() - (bot.logs.length - i) * 60000).toISOString(),
      message: log,
      level: log.toLowerCase().includes('error') ? 'error' : 'info',
    }));

    return res.json({ success: true, data: logs });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ UPDATE ENV VARS ============
export const updateEnvVars = async (req: AuthRequest, res: Response) => {
  try {
    const { vars } = req.body;
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });

    const updated = await prisma.bot.update({ where: { id: bot.id }, data: { envVars: vars } });
    return res.json({ success: true, message: 'Variables d\'environnement mises à jour', data: updated });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============ GET BOT STATS ============
export const getBotStats = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });

    return res.json({
      success: true,
      data: { cpu: bot.cpuUsage, ram: bot.ramUsage, uptime: bot.uptime, restarts: bot.restarts, status: bot.status },
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
