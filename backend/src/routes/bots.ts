import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import crypto from 'crypto';
import {
  deployBotContainer, stopBotContainer, startBotContainer,
  deleteBotContainer, getBotContainerLogs, getBotContainerStats, followBotContainerLogs,
} from '../utils/docker-bots';
import { logger } from '../utils/logger';
import fs from 'fs';
import { appendBotLog, ensureBotLogFile, readBotLogLines } from '../utils/bot-log-files';

const router = Router();

const READY_LOG_PATTERN = /(bot connect|connect[eé]|connected|ready|\[WA-CONNECT\]\s*open|whatsapp.*open|client.*ready|login successful)/i;

function maskEnvVars(envVars: any): any {
  if (!envVars || typeof envVars !== 'object') return envVars;
  const safe = { ...envVars };
  const PROTECTED = ['XHRIS_API_KEY', 'SESSION_SECRET', 'OPENAI_API_KEY'];
  PROTECTED.forEach(k => {
    if (safe[k]) safe[k] = '***' + String(safe[k]).slice(-4);
  });
  return safe;
}

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
    const safeBots = bots.map(b => ({ ...b, envVars: maskEnvVars(b.envVars) }));
    sendPaginated(res, safeBots, total, page, limit);
  } catch { sendError(res, 'Erreur', 500); }
});

// GET /api/bots/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    sendSuccess(res, { ...bot, envVars: maskEnvVars(bot.envVars) });
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/bots/deploy
router.post('/deploy', async (req: AuthRequest, res: Response) => {
  try {
    const { name, platform, sessionLink, envVars, marketplaceBotId, serverId: rawServerId } = req.body;

    let serverId = rawServerId || null;
    if (!serverId) {
      const existingServer = await prisma.server.findFirst({
        where: { userId: req.user!.id, status: { in: ['ONLINE', 'RUNNING'] as any } },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null);
      serverId = existingServer?.id || null;
    }

    const marketplaceBot = marketplaceBotId
      ? await prisma.marketplaceBot.findFirst({ where: { id: marketplaceBotId, status: 'PUBLISHED' } }).catch(() => null)
      : null;
    const botName = name || marketplaceBot?.name;
    if (!botName) return sendError(res, 'Nom du bot requis', 400);

    const deployCost = marketplaceBot?.coinsPerDay || 10;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < deployCost) return sendError(res, `Coins insuffisants (${deployCost} requis)`, 400);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const deployedToday = await prisma.transaction.count({
      where: { userId: req.user!.id, type: 'DEPLOY_BOT', createdAt: { gte: today } },
    });
    if (deployedToday >= 10) return sendError(res, 'Limite quotidienne atteinte (10/jour)', 400);

    const existingKey = await prisma.apiKey.findFirst({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      select: { key: true },
    });
    const apiKeyValue = existingKey?.key || `xhs_live_${crypto.randomBytes(20).toString('hex')}`;
    if (!existingKey) {
      await prisma.apiKey.create({
        data: { userId: req.user!.id, name: `Cle auto - ${botName}`, key: apiKeyValue, permissions: ['read', 'write', 'bots', 'servers', 'coins'] },
      });
    }

    const mergedEnvVars: Record<string, string> = {
      ...(envVars || {}),
      XHRIS_API_KEY: apiKeyValue,
      XHRIS_API_URL: process.env.BACKEND_URL || 'https://api.xhrishost.site/api',
      BOT_NAME: botName,
      XHRIS_DEPLOY_TYPE: marketplaceBotId ? '1click' : 'upload',
    };

    if (marketplaceBotId && marketplaceBot) {
      if (marketplaceBot.githubUrl) mergedEnvVars.GITHUB_URL = marketplaceBot.githubUrl;
      if (marketplaceBot.setupFile) mergedEnvVars.SETUP_FILE_PATH = marketplaceBot.setupFile;
      await prisma.marketplaceBot.update({
        where: { id: marketplaceBotId },
        data: { downloads: { increment: 1 } },
      }).catch(() => {});
    }

    const bot = await prisma.bot.create({
      data: {
        name: botName,
        platform: (platform?.toUpperCase() || marketplaceBot?.platform || 'WHATSAPP') as any,
        status: 'STARTING',
        userId: req.user!.id,
        serverId,
        sessionLink,
        envVars: mergedEnvVars,
        coinsPerDay: deployCost,
      },
    });

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { coins: { decrement: deployCost } } }),
      prisma.transaction.create({ data: { userId: req.user!.id, type: 'DEPLOY_BOT', description: `Deploiement de ${botName}`, amount: -deployCost } }),
    ]);

    try {
      const containerId = await deployBotContainer(bot.id, platform?.toUpperCase() || marketplaceBot?.platform || 'WHATSAPP', mergedEnvVars);
      await prisma.bot.update({
        where: { id: bot.id },
        data: { status: 'STARTING', processId: containerId, logs: readBotLogLines(bot.id, 50) },
      });

      let markedReady = false;
      followBotContainerLogs(
        bot.id,
        async (line) => {
          if (markedReady || !READY_LOG_PATTERN.test(line)) return;
          markedReady = true;
          appendBotLog(bot.id, 'Readiness marker detected; bot is online');
          await prisma.bot.update({
            where: { id: bot.id },
            data: { status: 'RUNNING', logs: readBotLogLines(bot.id, 100) },
          }).catch(() => {});
        },
        async (code) => {
          if (markedReady || code === 0) return;
          const latest = await prisma.bot.findUnique({ where: { id: bot.id }, select: { status: true } }).catch(() => null);
          if (!latest || latest.status !== 'STARTING') return;
          await prisma.bot.update({
            where: { id: bot.id },
            data: { status: 'ERROR', logs: readBotLogLines(bot.id, 100) },
          }).catch(() => {});
        },
      );

      logger.info(`Bot deploy started: ${bot.id} container: ${containerId.substring(0, 12)}`);
      return sendSuccess(res, { ...bot, status: 'STARTING', processId: containerId, apiKey: apiKeyValue }, 'Bot en cours de deploiement', 201);
    } catch (err: any) {
      const message = err?.message || 'Erreur inconnue';
      appendBotLog(bot.id, `Deployment failed: ${message}`);
      logger.error(`Bot deploy failed: ${bot.id} - ${message}`);
      const failedBot = await prisma.bot.update({
        where: { id: bot.id },
        data: { status: 'ERROR', logs: readBotLogLines(bot.id, 100) },
      });
      return res.status(500).json({ success: false, message, data: { ...failedBot, apiKey: apiKeyValue } });
    }
  } catch (err: any) {
    logger.error(`Bot deploy route failed: ${err?.message || err}`);
    return sendError(res, 'Erreur lors du deploiement', 500);
  }
});

// Legacy deploy route kept below but shadowed by the real deploy route above.
router.post('/deploy', async (req: AuthRequest, res: Response) => {
  try {
    const { name, platform, sessionLink, envVars, marketplaceBotId, serverId: rawServerId } = req.body;

    // Auto-select server if not provided
    let serverId = rawServerId || null;
    if (!serverId) {
      const existingServer = await prisma.server.findFirst({
        where: { userId: req.user!.id, status: { in: ['ONLINE', 'RUNNING'] as any } },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null);
      serverId = existingServer?.id || null;
    }
    const marketplaceBot = marketplaceBotId
      ? await prisma.marketplaceBot.findFirst({ where: { id: marketplaceBotId, status: 'PUBLISHED' } }).catch(() => null)
      : null;
    const botName = name || marketplaceBot?.name;
    if (!botName) return sendError(res, 'Nom du bot requis', 400);

    const deployCost = marketplaceBot?.coinsPerDay || 10;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < deployCost) return sendError(res, `Coins insuffisants (${deployCost} requis)`, 400);

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
        data: { userId: req.user!.id, name: `Clé auto — ${botName}`, key: apiKeyValue, permissions: ['read', 'write', 'bots', 'servers', 'coins'] },
      });
    } else {
      apiKeyValue = existingKey.key;
    }

    const mergedEnvVars: Record<string, string> = {
      ...(envVars || {}),
      XHRIS_API_KEY: apiKeyValue || '',
      XHRIS_API_URL: process.env.BACKEND_URL || 'https://api.xhrishost.site/api',
      BOT_NAME: botName,
      XHRIS_DEPLOY_TYPE: marketplaceBotId ? '1click' : 'upload',
    };

    // Fetch marketplace bot info if provided
    if (marketplaceBotId && marketplaceBot) {
        if (marketplaceBot.githubUrl) mergedEnvVars.GITHUB_URL = marketplaceBot.githubUrl;
        if (marketplaceBot.setupFile) mergedEnvVars.SETUP_FILE_PATH = marketplaceBot.setupFile;
        await prisma.marketplaceBot.update({
          where: { id: marketplaceBotId },
          data: { downloads: { increment: 1 } },
        }).catch(() => {});
    }

    const bot = await prisma.bot.create({
      data: {
        name: botName,
        platform: (platform?.toUpperCase() || marketplaceBot?.platform || 'WHATSAPP') as any,
        status: 'STARTING',
        userId: req.user!.id,
        sessionLink,
        envVars: mergedEnvVars,
        coinsPerDay: deployCost,
      },
    });

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { coins: { decrement: deployCost } } }),
      prisma.transaction.create({ data: { userId: req.user!.id, type: 'DEPLOY_BOT', description: `Déploiement de ${botName}`, amount: -deployCost } }),
    ]);

    // Real Docker deploy (fire and forget)
    deployBotContainer(bot.id, platform?.toUpperCase() || marketplaceBot?.platform || 'WHATSAPP', mergedEnvVars)
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
    if (!bot) return sendError(res, 'Bot non trouve', 404);
    const fileLogs = readBotLogLines(req.params.id, 200);
    const dockerLogs = fileLogs.length > 0 ? fileLogs : await getBotContainerLogs(req.params.id);
    const logs = dockerLogs.length > 0 ? dockerLogs : (bot.logs.length > 0 ? bot.logs : ['Aucun log disponible']);
    return sendSuccess(res, { logs, status: bot.status });
  } catch {
    return sendError(res, 'Erreur', 500);
  }
});

// GET /api/bots/:id/logs/stream
router.get('/:id/logs/stream', async (req: AuthRequest, res: Response) => {
  const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id }, select: { id: true } });
  if (!bot) return sendError(res, 'Bot non trouve', 404);

  const logPath = ensureBotLogFile(req.params.id);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let lastOffset = 0;
  const sendLine = (line: string) => {
    if (!line.trim()) return;
    res.write(`data: ${JSON.stringify({ line, ts: new Date().toISOString() })}\n\n`);
  };

  const readNewBytes = () => {
    fs.stat(logPath, (statErr, stats) => {
      if (statErr) return;
      if (stats.size < lastOffset) lastOffset = 0;
      if (stats.size === lastOffset) return;
      const stream = fs.createReadStream(logPath, { start: lastOffset, end: stats.size - 1, encoding: 'utf8' });
      lastOffset = stats.size;
      let buffer = '';
      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        lines.forEach(sendLine);
      });
      stream.on('end', () => {
        if (buffer) sendLine(buffer);
      });
    });
  };

  readNewBytes();
  const interval = setInterval(readNewBytes, 500);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
    res.end();
  });
});

// Legacy logs route kept below but shadowed by the file-backed route above.
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
    // Protect system keys — restore original values even if user tries to overwrite
    const PROTECTED = ['XHRIS_API_KEY', 'XHRIS_API_URL', 'XHRIS_DEPLOY_TYPE', 'BOT_NAME'];
    const existingEnv = (bot.envVars as any) || {};
    const safeVars = { ...vars };
    PROTECTED.forEach(k => { if (existingEnv[k]) safeVars[k] = existingEnv[k]; });
    const updated = await prisma.bot.update({ where: { id: bot.id }, data: { envVars: safeVars } });
    sendSuccess(res, { ...updated, envVars: maskEnvVars(updated.envVars) }, 'Variables mises à jour');
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
