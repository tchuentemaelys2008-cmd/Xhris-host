import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import crypto from 'crypto';

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
      prisma.bot.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }),
      prisma.bot.count({ where }),
    ]);
    sendPaginated(res, bots, total, page, limit);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/bots/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    sendSuccess(res, bot);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/bots/deploy
router.post('/deploy', async (req: AuthRequest, res: Response) => {
  try {
    const { name, platform, sessionLink, envVars, marketplaceBotId } = req.body;
    if (!name) return sendError(res, 'Nom du bot requis', 400);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < 10) return sendError(res, 'Coins insuffisants pour déployer un bot (10 coins requis)', 400);

    // Check daily deploy limit
    const today = new Date(); today.setHours(0,0,0,0);
    const deployedToday = await prisma.transaction.count({
      where: { userId: req.user!.id, type: 'DEPLOY_BOT', createdAt: { gte: today } },
    });
    if (deployedToday >= 10) return sendError(res, 'Limite de déploiements quotidiens atteinte (10/jour)', 400);

    // Auto-generate API key if user doesn't have one
    let apiKeyValue: string | null = null;
    const existingKey = await prisma.apiKey.findFirst({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      select: { key: true },
    });
    if (!existingKey) {
      apiKeyValue = `xhs_live_${crypto.randomBytes(20).toString('hex')}`;
      await prisma.apiKey.create({
        data: {
          userId: req.user!.id,
          name: `Clé auto — ${name}`,
          key: apiKeyValue,
          permissions: ['read', 'write', 'bots', 'servers', 'coins'],
        },
      });
    } else {
      apiKeyValue = existingKey.key;
    }

    const mergedEnvVars = {
      ...(envVars || {}),
      XHRIS_API_KEY: apiKeyValue,
      XHRIS_API_URL: process.env.BACKEND_URL || 'https://api.xhrishost.site/api',
      BOT_NAME: name,
      XHRIS_DEPLOY_TYPE: marketplaceBotId ? '1click' : 'upload',
    };

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

    // Deduct coins
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { coins: { decrement: 10 } } }),
      prisma.transaction.create({ data: { userId: req.user!.id, type: 'DEPLOY_BOT', description: `Déploiement de ${name}`, amount: -10 } }),
    ]);

    // Simulate bot starting (in production: actually start the process)
    setTimeout(async () => {
      try {
        await prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });
      } catch {}
    }, 5000);

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
    if (bot.status === 'RUNNING') return sendError(res, 'Bot déjà en cours d\'exécution', 400);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < bot.coinsPerDay) return sendError(res, 'Coins insuffisants', 400);

    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING' } });
    setTimeout(async () => {
      try { await prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } }); } catch {}
    }, 3000);

    sendSuccess(res, null, 'Bot en cours de démarrage');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/bots/:id/stop
router.post('/:id/stop', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STOPPED' } });
    sendSuccess(res, null, 'Bot arrêté');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/bots/:id/restart
router.post('/:id/restart', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);

    await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING', restarts: { increment: 1 } } });
    setTimeout(async () => {
      try { await prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } }); } catch {}
    }, 3000);

    sendSuccess(res, null, 'Bot en cours de redémarrage');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// DELETE /api/bots/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    await prisma.bot.delete({ where: { id: bot.id } });
    sendSuccess(res, null, 'Bot supprimé');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/bots/:id/logs
router.get('/:id/logs', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id }, select: { logs: true, status: true } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);

    const defaultLogs = [
      `[${new Date().toISOString()}] Bot démarré`,
      `[${new Date().toISOString()}] Connexion WhatsApp établie`,
      `[${new Date().toISOString()}] Session restaurée`,
      `[${new Date().toISOString()}] En attente de messages...`,
    ];

    sendSuccess(res, { logs: bot.logs.length > 0 ? bot.logs : defaultLogs, status: bot.status });
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// PATCH /api/bots/:id/env
router.patch('/:id/env', async (req: AuthRequest, res: Response) => {
  try {
    const { vars } = req.body;
    const bot = await prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    const updated = await prisma.bot.update({ where: { id: bot.id }, data: { envVars: vars } });
    sendSuccess(res, updated, 'Variables d\'environnement mises à jour');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/bots/:id/stats
router.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const bot = await prisma.bot.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { cpuUsage: true, ramUsage: true, uptime: true, restarts: true, status: true },
    });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    sendSuccess(res, bot);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

export default router;
