import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import {
  createServerContainer, stopServerContainer, startServerContainer,
  deleteServerContainer, getContainerStats, getContainerLogs, deployFilesToContainer,
} from '../utils/docker';
import { exec } from 'child_process';
import { promisify } from 'util';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
const router = Router();

const PLAN_SPECS: Record<string, { cpu: number; ram: number; storage: number; coinsPerDay: number }> = {
  STARTER:  { cpu: 1, ram: 1,  storage: 10, coinsPerDay: 10 },
  PRO:      { cpu: 2, ram: 2,  storage: 20, coinsPerDay: 20 },
  ADVANCED: { cpu: 4, ram: 4,  storage: 40, coinsPerDay: 40 },
  ELITE:    { cpu: 8, ram: 8,  storage: 80, coinsPerDay: 80 },
};

function uploadDir(serverId: string) {
  return path.join('/tmp', 'xhris-uploads', serverId);
}

function safePath(serverId: string, sub: string): string {
  const base = path.resolve(uploadDir(serverId));
  if (!sub) return base;
  const full = path.resolve(base, sub);
  if (!full.startsWith(base + '/') && full !== base) throw new Error('Forbidden path');
  return full;
}

const storage = multer.diskStorage({
  destination: (req: any, _file: any, cb: any) => {
    const dir = uploadDir(req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req: any, file: any, cb: any) => cb(null, file.originalname),
});

const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

// GET /api/servers
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const where: any = { userId: req.user!.id };
    if (status) where.status = status.toUpperCase();
    const [servers, total] = await Promise.all([
      prisma.server.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.server.count({ where }),
    ]);
    sendPaginated(res, servers, total, page, limit);
  } catch { sendError(res, 'Erreur', 500); }
});

// GET /api/servers/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    sendSuccess(res, server);
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/servers
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, plan } = req.body;
    if (!name || !plan) return sendError(res, 'Nom et plan requis', 400);
    const specs = PLAN_SPECS[plan.toUpperCase()];
    if (!specs) return sendError(res, 'Plan invalide', 400);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { coins: true } });
    if (!user || user.coins < specs.coinsPerDay) return sendError(res, `Coins insuffisants (${specs.coinsPerDay} requis)`, 400);
    const domain = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.xhris.host`;
    const server = await prisma.server.create({
      data: { name, plan: plan.toUpperCase() as any, status: 'STARTING', userId: req.user!.id, domain, storageTotal: specs.storage, coinsPerDay: specs.coinsPerDay },
    });
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.id }, data: { coins: { decrement: specs.coinsPerDay } } }),
      prisma.transaction.create({ data: { userId: req.user!.id, type: 'CREATE_SERVER', description: `Création serveur ${name} (${plan})`, amount: -specs.coinsPerDay } }),
    ]);
    createServerContainer(server.id, plan.toUpperCase())
      .then(async ({ containerId }) => {
        await prisma.server.update({ where: { id: server.id }, data: { status: 'ONLINE', dockerId: containerId } });
      })
      .catch(async () => {
        await prisma.server.update({ where: { id: server.id }, data: { status: 'ERROR' } });
      });
    sendSuccess(res, server, 'Serveur en cours de création', 201);
  } catch { sendError(res, 'Erreur lors de la création', 500); }
});

// POST /api/servers/:id/start
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    await prisma.server.update({ where: { id: server.id }, data: { status: 'STARTING' } });
    await startServerContainer(server.id);
    await prisma.server.update({ where: { id: server.id }, data: { status: 'ONLINE' } });
    sendSuccess(res, null, 'Serveur démarré');
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/servers/:id/stop
router.post('/:id/stop', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    await stopServerContainer(server.id);
    await prisma.server.update({ where: { id: server.id }, data: { status: 'OFFLINE' } });
    sendSuccess(res, null, 'Serveur arrêté');
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/servers/:id/restart
router.post('/:id/restart', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    await prisma.server.update({ where: { id: server.id }, data: { status: 'STARTING' } });
    await stopServerContainer(server.id);
    await startServerContainer(server.id);
    await prisma.server.update({ where: { id: server.id }, data: { status: 'ONLINE' } });
    sendSuccess(res, null, 'Serveur redémarré');
  } catch { sendError(res, 'Erreur', 500); }
});

// DELETE /api/servers/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    await deleteServerContainer(server.id);
    await prisma.server.delete({ where: { id: server.id } });
    const dir = uploadDir(req.params.id);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    sendSuccess(res, null, 'Serveur supprimé');
  } catch { sendError(res, 'Erreur', 500); }
});

// GET /api/servers/:id/stats
router.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    const { cpu, ram } = await getContainerStats(server.id);
    sendSuccess(res, { ...server, cpuUsage: cpu, ramUsage: ram });
  } catch { sendError(res, 'Erreur', 500); }
});

// GET /api/servers/:id/logs
router.get('/:id/logs', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    const logs = await getContainerLogs(server.id);
    sendSuccess(res, { logs });
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/servers/:id/exec
router.post('/:id/exec', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    if (server.status !== 'ONLINE') return sendError(res, 'Serveur hors ligne', 400);
    const { command } = req.body;
    if (!command) return sendError(res, 'Commande requise', 400);
    const containerName = `xhris-server-${server.id}`;
    const { stdout, stderr } = await execAsync(
      `docker exec ${containerName} sh -c "${command.replace(/"/g, '\\"')}"`,
    ).catch((err: any) => ({ stdout: '', stderr: err.message }));
    sendSuccess(res, { output: stdout || stderr || 'Commande exécutée' });
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/servers/:id/upload
router.post('/:id/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    const file = req.file;
    if (!file) return sendError(res, 'Aucun fichier fourni', 400);

    if (file.originalname.toLowerCase().endsWith('.zip')) {
      const dir = uploadDir(req.params.id);
      try {
        await execAsync(`unzip -o "${file.path}" -d "${dir}"`);
        fs.unlinkSync(file.path);
      } catch {
        // keep the zip if unzip fails
      }
    }

    sendSuccess(res, { filename: file.originalname }, 'Fichier uploadé');
  } catch { sendError(res, 'Erreur upload', 500); }
});

// GET /api/servers/:id/files?path=
router.get('/:id/files', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    const sub = (req.query.path as string) || '';
    let targetDir: string;
    try { targetDir = safePath(req.params.id, sub); } catch { return sendError(res, 'Chemin invalide', 400); }
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      return sendSuccess(res, { files: [] });
    }
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const files = entries.map(e => {
      let size = 0, modified = new Date();
      try { const s = fs.statSync(path.join(targetDir, e.name)); size = s.size; modified = s.mtime; } catch {}
      return { name: e.name, isDir: e.isDirectory(), size, modified };
    }).sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    sendSuccess(res, { files });
  } catch { sendError(res, 'Erreur', 500); }
});

// GET /api/servers/:id/file?path=
router.get('/:id/file', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    const filePath = req.query.path as string;
    if (!filePath) return sendError(res, 'Chemin requis', 400);
    let full: string;
    try { full = safePath(req.params.id, filePath); } catch { return sendError(res, 'Chemin invalide', 400); }
    if (!fs.existsSync(full)) return sendError(res, 'Fichier introuvable', 404);
    const content = fs.readFileSync(full, 'utf-8');
    sendSuccess(res, { content, path: filePath });
  } catch { sendError(res, 'Erreur', 500); }
});

// PUT /api/servers/:id/file
router.put('/:id/file', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    const { path: filePath, content, newName } = req.body;
    if (!filePath) return sendError(res, 'Chemin requis', 400);
    let full: string;
    try { full = safePath(req.params.id, filePath); } catch { return sendError(res, 'Chemin invalide', 400); }
    if (content !== undefined) {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf-8');
    }
    if (newName && newName !== path.basename(filePath)) {
      const parentRel = path.dirname(filePath);
      const newRel = parentRel === '.' ? newName : `${parentRel}/${newName}`;
      let newFull: string;
      try { newFull = safePath(req.params.id, newRel); } catch { return sendError(res, 'Chemin invalide', 400); }
      fs.renameSync(full, newFull);
    }
    sendSuccess(res, null, 'Fichier sauvegardé');
  } catch { sendError(res, 'Erreur', 500); }
});

// DELETE /api/servers/:id/file?path=
router.delete('/:id/file', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    const filePath = req.query.path as string;
    if (!filePath) return sendError(res, 'Chemin requis', 400);
    let full: string;
    try { full = safePath(req.params.id, filePath); } catch { return sendError(res, 'Chemin invalide', 400); }
    if (!fs.existsSync(full)) return sendError(res, 'Fichier introuvable', 404);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      fs.unlinkSync(full);
    }
    sendSuccess(res, null, 'Supprimé');
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/servers/:id/deploy
router.post('/:id/deploy', async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!server) return sendError(res, 'Serveur non trouvé', 404);
    if (server.status !== 'ONLINE') return sendError(res, 'Serveur hors ligne — démarrez le d\'abord', 400);
    await deployFilesToContainer(server.id);
    sendSuccess(res, null, 'Déploiement lancé');
  } catch (err: any) {
    sendError(res, err?.message || 'Erreur déploiement', 500);
  }
});

export default router;
