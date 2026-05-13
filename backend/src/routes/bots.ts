import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import crypto from 'crypto';
import {
  deployBotContainer, stopBotContainer, startBotContainer,
  deleteBotContainer, getBotContainerLogs, getBotContainerStats,
} from '../utils/docker-bots';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/bots
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const where: any = { userId: req.user!.id };
    if (status) where.status = status.toUpperCase();
    const [bots, total] = await Promise.all([
      prisma.bot.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.bot.count({ where }),
    ]);
    sendPaginated(res, bots, total, page, limit);
  } catch { sendError(res, 'Erreur', 500); }
});

// GET /api/bots/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    sendSuccess(res, bot);
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/bots/deploy
router.post('/deploy', async (req: AuthRequest, res: Response) => {
  try {
    const { name, platform, sessionLink, envVars, marketplaceBotId } = req.body;
    if (!name) return sendError(res, 'Nom du bot requis', 400);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < 10) return sendError(res, 'Coins insuffisants (10 requis)', 400);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const deployedToday = await prisma.transaction.count({
      where: { userId: req.user!.id, type: 'DEPLOY_BOT', createdAt: { gte: today } },
    });
    if (deployedToday >= 10) return sendError(res, 'Limite quotidienne atteinte (10/jour)', 400);

    // Auto-generate API key
    let apiKeyValue: string | null = null;
    const existingKey = await prisma.apiKey.findFirst({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      select: { key: true },
    });
    if (!existingKey) {
      apiKeyValue = `xhs_live_${crypto.randomBytes(20).toString('hex')}`;
      await prisma.apiKey.create({
        data: { userId: req.user!.id, name: `Clé auto — ${name}`, key: apiKeyValue, permissions: ['read', 'write', 'bots', 'servers', 'coins'] },
      });
    } else {
      apiKeyValue = existingKey.key;
    }

    const mergedEnvVars: Record<string, string> = {
      ...(envVars || {}),
      XHRIS_API_KEY: apiKeyValue || '',
      XHRIS_API_URL: process.env.BACKEND_URL || 'https://api.xhrishost.site/api',
      BOT_NAME: name,
      XHRIS_DEPLOY_TYPE: marketplaceBotId ? '1click' : 'upload',
    };

    // Fetch marketplace bot info if provided
    if (marketplaceBotId) {
      const mb = await prisma.marketplaceBot.findUnique({ where: { id: marketplaceBotId } }).catch(() => null);
      if (mb) {
        if (mb.githubUrl) mergedEnvVars.GITHUB_URL = mb.githubUrl;
        if (mb.setupFile) mergedEnvVars.SETUP_FILE_PATH = mb.setupFile;
        await prisma.marketplaceBot.update({
          where: { id: marketplaceBotId },
          data: { downloads: { increment: 1 } },
        }).catch(() => {});
      }
    }

    const bot = await prisma.bot.create({
      data: {
        name,
        platform: (platform?.toUpperCase() || 'WHATSAPP') as any,
        status: 'STARTING',
        userId: req.user!.id,
        sessionLink,
        envVars: mergedEnvVars,
        coinsPerDay: 10,
      },
    });

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { coins: { decrement: 10 } } }),
      prisma.transaction.create({ data: { userId: req.user!.id, type: 'DEPLOY_BOT', description: `Déploiement de ${name}`, amount: -10 } }),
    ]);

    // Real Docker deploy (fire and forget)
    deployBotContainer(bot.id, platform?.toUpperCase() || 'WHATSAPP', mergedEnvVars)
      .then(async (containerId) => {
        await prisma.bot.update({
          where: { id: bot.id },
          data: {
            status: 'RUNNING',
            processId: containerId,
            logs: [
              `[${new Date().toISOString()}] Bot démarré avec succès`,
              `[${new Date().toISOString()}] Container: ${containerId.substring(0, 12)}`,
              `[${new Date().toISOString()}] Plateforme: ${platform || 'WHATSAPP'}`,
              `[${new Date().toISOString()}] XHRIS Connector injecté`,
            ],
          },
        });
        logger.info(`Bot deployed: ${bot.id} container: ${containerId.substring(0, 12)}`);
      })
      .catch(async (err) => {
        logger.error(`Bot deploy failed: ${bot.id} — ${err.message}`);
        await prisma.bot.update({
          where: { id: bot.id },
          data: {
            status: 'ERROR',
            logs: [
              `[${new Date().toISOString()}] Erreur de déploiement Docker`,
              `[${new Date().toISOString()}] ${err.message || 'Erreur inconnue'}`,
            ],
          },
        });
      });

    sendSuccess(res, { ...bot, apiKey: apiKeyValue }, 'Bot en cours de déploiement', 201);
  } catch (err) {
    sendError(res, 'Erreur lors du déploiement', 500);
  }
});

// POST /api/bots/:id/start
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    if (bot.status === 'RUNNING') return sendError(res, 'Bot déjà en cours', 400);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < bot.coinsPerDay) return sendError(res, 'Coins insuffisants', 400);
    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING' } });
    startBotContainer(bot.id)
      .then(async () => {
        await prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });
      })
      .catch(async () => {
        await prisma.bot.update({ where: { id: bot.id }, data: { status: 'ERROR' } });
      });
    sendSuccess(res, null, 'Bot en cours de démarrage');
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/bots/:id/stop
router.post('/:id/stop', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    await stopBotContainer(bot.id);
    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STOPPED', cpuUsage: 0, ramUsage: 0 } });
    sendSuccess(res, null, 'Bot arrêté');
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/bots/:id/restart
router.post('/:id/restart', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING', restarts: { increment: 1 } } });
    await stopBotContainer(bot.id);
    startBotContainer(bot.id)
      .then(async () => {
        await prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });
      })
      .catch(async () => {
        await prisma.bot.update({ where: { id: bot.id }, data: { status: 'ERROR' } });
      });
    sendSuccess(res, null, 'Bot en cours de redémarrage');
  } catch { sendError(res, 'Erreur', 500); }
});

// DELETE /api/bots/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    await deleteBotContainer(bot.id);
    await prisma.bot.delete({ where: { id: bot.id } });
    sendSuccess(res, null, 'Bot supprimé');
  } catch { sendError(res, 'Erreur', 500); }
});

// GET /api/bots/:id/logs
router.get('/:id/logs', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id }, select: { logs: true, status: true } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    const dockerLogs = await getBotContainerLogs(req.params.id);
    const logs = dockerLogs.length > 0 ? dockerLogs : (bot.logs.length > 0 ? bot.logs : ['Aucun log disponible']);
    sendSuccess(res, { logs, status: bot.status });
  } catch { sendError(res, 'Erreur', 500); }
});

// PATCH /api/bots/:id/env
router.patch('/:id/env', async (req: AuthRequest, res: Response) => {
  try {
    const { vars } = req.body;
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    const updated = await prisma.bot.update({ where: { id: bot.id }, data: { envVars: vars } });
    sendSuccess(res, updated, 'Variables d\'environnement mises à jour');
  } catch { sendError(res, 'Erreur', 500); }
});

// GET /api/bots/:id/stats
router.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { cpuUsage: true, ramUsage: true, uptime: true, restarts: true, status: true },
    });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    if (bot.status === 'RUNNING') {
      const { cpu, ram } = await getBotContainerStats(req.params.id);
      sendSuccess(res, { ...bot, cpuUsage: cpu, ramUsage: ram });
    } else {
      sendSuccess(res, bot);
    }
  } catch { sendError(res, 'Erreur', 500); }
});

export default router;
