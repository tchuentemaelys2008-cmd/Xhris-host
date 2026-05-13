import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { deployBotContainer, stopBotContainer, startBotContainer, deleteBotContainer, getBotContainerLogs, getBotContainerStats } from '../utils/docker-bots';

const DEPLOY_COST = 10;
const MAX_DEPLOYS_PER_DAY = 10;

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

export const getBotById = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });
    return res.json({ success: true, data: bot });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const deployBot = async (req: AuthRequest, res: Response) => {
  try {
    const { marketplaceBotId, sessionLink, envVars, serverId } = req.body;
    const userId = req.user!.id;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const deployCount = await prisma.bot.count({ where: { userId, createdAt: { gte: today } } });
    if (deployCount >= MAX_DEPLOYS_PER_DAY) {
      return res.status(400).json({ success: false, message: `Limite de ${MAX_DEPLOYS_PER_DAY} déploiements par jour atteinte` });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true } });
    if (!user || user.coins < DEPLOY_COST) {
      return res.status(400).json({ success: false, message: `Solde insuffisant. ${DEPLOY_COST} coins requis.` });
    }

    const marketplaceBot = marketplaceBotId
      ? await prisma.marketplaceBot.findUnique({ where: { id: marketplaceBotId } })
      : null;

    const bot = await prisma.$transaction(async (tx) => {
      const newBot = await tx.bot.create({
        data: {
          name: marketplaceBot?.name || 'Mon Bot',
          description: marketplaceBot?.description,
          version: marketplaceBot?.version || '1.0.0',
          platform: marketplaceBot?.platform || 'WHATSAPP',
          status: 'STARTING',
          userId, serverId, sessionLink,
          envVars: envVars || {},
          coinsPerDay: DEPLOY_COST,
        },
      });
      await tx.user.update({ where: { id: userId }, data: { coins: { decrement: DEPLOY_COST } } });
      await tx.transaction.create({
        data: { userId, type: 'DEPLOY_BOT', description: `Déploiement de ${newBot.name}`, amount: -DEPLOY_COST, status: 'COMPLETED' },
      });
      await tx.notification.create({
        data: { userId, title: 'Bot déployé ! 🤖', message: `${newBot.name} est en cours de démarrage.`, type: 'BOT' },
      });
      if (marketplaceBotId) {
        await tx.marketplaceBot.update({ where: { id: marketplaceBotId }, data: { downloads: { increment: 1 } } });
      }
      return newBot;
    });

    // Déployer le vrai conteneur Docker
    deployBotContainer(bot.id, bot.platform, envVars || {})
      .then(async (containerId) => {
        await prisma.bot.update({
          where: { id: bot.id },
          data: { status: 'RUNNING', processId: containerId, logs: ['Bot démarré avec succès', `Conteneur Docker: ${containerId.substring(0, 12)}`, `Plateforme: ${bot.platform}`] },
        });
      })
      .catch(async (err) => {
        logger.error('Docker deploy error:', err);
        await prisma.bot.update({ where: { id: bot.id }, data: { status: 'ERROR', logs: ['Erreur lors du démarrage du conteneur'] } });
      });

    logger.info(`Bot deployed: ${bot.id} by ${userId}`);
    return res.status(201).json({ success: true, message: 'Bot déployé avec succès', data: bot });
  } catch (error) {
    logger.error('deployBot error:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors du déploiement' });
  }
};

export const startBot = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });
    if (bot.status === 'RUNNING') return res.status(400).json({ success: false, message: 'Bot déjà en ligne' });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < bot.coinsPerDay) {
      return res.status(400).json({ success: false, message: `Solde insuffisant. ${bot.coinsPerDay} coins requis.` });
    }

    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING' } });
    await startBotContainer(bot.id);
    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });

    return res.json({ success: true, message: 'Bot démarré' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const stopBot = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });
    if (bot.status === 'STOPPED') return res.status(400).json({ success: false, message: 'Bot déjà arrêté' });

    await stopBotContainer(bot.id);
    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STOPPED', cpuUsage: 0, ramUsage: 0 } });
    return res.json({ success: true, message: 'Bot arrêté' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const restartBot = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });

    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING', restarts: { increment: 1 } } });
    await stopBotContainer(bot.id);
    await startBotContainer(bot.id);
    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });

    return res.json({ success: true, message: 'Bot redémarré' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const deleteBot = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });

    await deleteBotContainer(bot.id);
    await prisma.bot.delete({ where: { id: bot.id } });
    return res.json({ success: true, message: 'Bot supprimé' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const getBotLogs = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });

    const dockerLogs = await getBotContainerLogs(bot.id);
    const logs = dockerLogs.length > 0 ? dockerLogs.map((log, i) => ({
      id: i, timestamp: new Date().toISOString(), message: log,
      level: log.toLowerCase().includes('error') ? 'error' : 'info',
    })) : bot.logs.map((log, i) => ({
      id: i, timestamp: new Date(Date.now() - (bot.logs.length - i) * 60000).toISOString(),
      message: log, level: log.toLowerCase().includes('error') ? 'error' : 'info',
    }));

    return res.json({ success: true, data: logs });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const updateEnvVars = async (req: AuthRequest, res: Response) => {
  try {
    const { vars } = req.body;
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });
    const updated = await prisma.bot.update({ where: { id: bot.id }, data: { envVars: vars } });
    return res.json({ success: true, message: 'Variables mises à jour', data: updated });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

export const getBotStats = async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return res.status(404).json({ success: false, message: 'Bot non trouvé' });

    const { cpu, ram } = await getBotContainerStats(bot.id);
    await prisma.bot.update({ where: { id: bot.id }, data: { cpuUsage: cpu, ramUsage: ram } });

    return res.json({ success: true, data: { cpu, ram, uptime: bot.uptime, restarts: bot.restarts, status: bot.status } });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};