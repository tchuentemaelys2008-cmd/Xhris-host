import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

const router = Router();

const PLAN_SPECS: Record<string, { cpu: number; ram: number; storage: number; coinsPerDay: number }> = {
  STARTER:  { cpu: 1, ram: 1,  storage: 10, coinsPerDay: 10 },
  PRO:      { cpu: 2, ram: 2,  storage: 20, coinsPerDay: 20 },
  ADVANCED: { cpu: 4, ram: 4,  storage: 40, coinsPerDay: 40 },
  ELITE:    { cpu: 8, ram: 8,  storage: 80, coinsPerDay: 80 },
};

// GET /api/servers
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = { userId: req.user!.id };
    if (status) where.status = status.toUpperCase();

    const [servers, total] = await Promise.all([
      prisma.server.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }),
      prisma.server.count({ where }),
    ]);
    sendPaginated(res, servers, total, page, limit);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/servers/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    sendSuccess(res, server);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/servers
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, plan } = req.body;
    if (!name || !plan) return sendError(res, 'Nom et plan requis', 400);

    const specs = PLAN_SPECS[plan.toUpperCase()];
    if (!specs) return sendError(res, 'Plan invalide', 400);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < specs.coinsPerDay) return sendError(res, `Coins insuffisants (${specs.coinsPerDay} coins requis)`, 400);

    const domain = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.xhris.host`;

    const server = await prisma.server.create({
      data: {
        name,
        plan: plan.toUpperCase() as any,
        status: 'STARTING',
        userId: req.user!.id,
        domain,
        storageTotal: specs.storage,
        coinsPerDay: specs.coinsPerDay,
      },
    });

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { coins: { decrement: specs.coinsPerDay } } }),
      prisma.transaction.create({ data: { userId: req.user!.id, type: 'CREATE_SERVER', description: `Création serveur ${name} (${plan})`, amount: -specs.coinsPerDay } }),
    ]);

    setTimeout(async () => {
      try { await prisma.server.update({ where: { id: server.id }, data: { status: 'ONLINE' } }); } catch {}
    }, 5000);

    sendSuccess(res, server, 'Serveur en cours de création', 201);
  } catch (err) {
    sendError(res, 'Erreur lors de la création', 500);
  }
});

// POST /api/servers/:id/start
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < server.coinsPerDay) return sendError(res, 'Coins insuffisants', 400);

    await prisma.server.update({ where: { id: server.id }, data: { status: 'STARTING' } });
    setTimeout(async () => {
      try { await prisma.server.update({ where: { id: server.id }, data: { status: 'ONLINE' } }); } catch {}
    }, 3000);

    sendSuccess(res, null, 'Serveur en cours de démarrage');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/servers/:id/stop
router.post('/:id/stop', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    await prisma.server.update({ where: { id: server.id }, data: { status: 'OFFLINE' } });
    sendSuccess(res, null, 'Serveur arrêté');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/servers/:id/restart
router.post('/:id/restart', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    await prisma.server.update({ where: { id: server.id }, data: { status: 'STARTING' } });
    setTimeout(async () => {
      try { await prisma.server.update({ where: { id: server.id }, data: { status: 'ONLINE' } }); } catch {}
    }, 3000);
    sendSuccess(res, null, 'Serveur en cours de redémarrage');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// DELETE /api/servers/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    await prisma.server.delete({ where: { id: server.id } });
    sendSuccess(res, null, 'Serveur supprimé');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/servers/:id/stats
router.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { cpuUsage: true, ramUsage: true, storageUsed: true, storageTotal: true, uptime: true, status: true },
    });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);

    // Simulate dynamic stats
    sendSuccess(res, {
      ...server,
      cpuUsage: Math.random() * 80,
      ramUsage: Math.random() * 70,
    });
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/servers/:id/files
router.get('/:id/files', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    if (server.status !== 'ONLINE') return sendError(res, 'Serveur hors ligne', 400);

    // Simulate file listing
    const path = req.query.path as string || '/';
    const files = [
      { name: 'index.js', type: 'file', size: 2048, modified: new Date().toISOString() },
      { name: 'package.json', type: 'file', size: 512, modified: new Date().toISOString() },
      { name: 'node_modules', type: 'directory', size: 0, modified: new Date().toISOString() },
      { name: '.env', type: 'file', size: 256, modified: new Date().toISOString() },
    ];

    sendSuccess(res, { path, files });
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/servers/:id/logs
router.get('/:id/logs', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);

    const logs = [
      `[${new Date().toISOString()}] Serveur démarré`,
      `[${new Date().toISOString()}] Node.js v20.0.0 détecté`,
      `[${new Date().toISOString()}] Dépendances installées`,
      `[${new Date().toISOString()}] Application démarrée sur le port 3000`,
    ];

    sendSuccess(res, { logs });
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

export default router;
