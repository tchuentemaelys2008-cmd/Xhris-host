"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const docker_1 = require("../utils/docker");
const child_process_1 = require("child_process");
const util_1 = require("util");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const router = (0, express_1.Router)();
const DOCKER = process.env.DOCKER_BIN || '/usr/bin/docker';
const PLAN_SPECS = {
    STARTER: { cpu: 1, ram: 1, storage: 10, coinsPerDay: 10 },
    PRO: { cpu: 2, ram: 2, storage: 20, coinsPerDay: 20 },
    ADVANCED: { cpu: 4, ram: 4, storage: 40, coinsPerDay: 40 },
    ELITE: { cpu: 8, ram: 8, storage: 80, coinsPerDay: 80 },
};
function uploadDir(serverId) {
    return path_1.default.join('/tmp', 'xhris-uploads', serverId);
}
function safePath(serverId, sub) {
    const base = path_1.default.resolve(uploadDir(serverId));
    if (!sub)
        return base;
    const full = path_1.default.resolve(base, sub);
    if (!full.startsWith(base + '/') && full !== base)
        throw new Error('Forbidden path');
    return full;
}
const storage = multer_1.default.diskStorage({
    destination: (req, _file, cb) => {
        const dir = uploadDir(req.params.id);
        fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, file.originalname),
});
const upload = (0, multer_1.default)({ storage, limits: { fileSize: 200 * 1024 * 1024 } });
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const where = { userId: req.user.id };
        if (status)
            where.status = status.toUpperCase();
        const [servers, total] = await Promise.all([
            prisma_1.prisma.server.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            prisma_1.prisma.server.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, servers, total, page, limit);
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/:id', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        (0, response_1.sendSuccess)(res, server);
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, plan } = req.body;
        if (!name || !plan)
            return (0, response_1.sendError)(res, 'Nom et plan requis', 400);
        const specs = PLAN_SPECS[plan.toUpperCase()];
        if (!specs)
            return (0, response_1.sendError)(res, 'Plan invalide', 400);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { coins: true } });
        if (!user || user.coins < specs.coinsPerDay)
            return (0, response_1.sendError)(res, `Coins insuffisants (${specs.coinsPerDay} requis)`, 400);
        const domain = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.xhris.host`;
        const server = await prisma_1.prisma.server.create({
            data: { name, plan: plan.toUpperCase(), status: 'STARTING', userId: req.user.id, domain, storageTotal: specs.storage, coinsPerDay: specs.coinsPerDay },
        });
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { coins: { decrement: specs.coinsPerDay } } }),
            prisma_1.prisma.transaction.create({ data: { userId: req.user.id, type: 'CREATE_SERVER', description: `Création serveur ${name} (${plan})`, amount: -specs.coinsPerDay } }),
        ]);
        (0, docker_1.createServerContainer)(server.id, plan.toUpperCase())
            .then(async ({ containerId }) => {
            await prisma_1.prisma.server.update({ where: { id: server.id }, data: { status: 'ONLINE', dockerId: containerId } });
        })
            .catch(async () => {
            await prisma_1.prisma.server.update({ where: { id: server.id }, data: { status: 'ERROR' } });
        });
        (0, response_1.sendSuccess)(res, server, 'Serveur en cours de création', 201);
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur lors de la création', 500);
    }
});
router.post('/:id/start', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        await prisma_1.prisma.server.update({ where: { id: server.id }, data: { status: 'STARTING' } });
        await (0, docker_1.startServerContainer)(server.id);
        await prisma_1.prisma.server.update({ where: { id: server.id }, data: { status: 'ONLINE' } });
        (0, response_1.sendSuccess)(res, null, 'Serveur démarré');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/:id/stop', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        await (0, docker_1.stopServerContainer)(server.id);
        await prisma_1.prisma.server.update({ where: { id: server.id }, data: { status: 'OFFLINE' } });
        (0, response_1.sendSuccess)(res, null, 'Serveur arrêté');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/:id/restart', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        await prisma_1.prisma.server.update({ where: { id: server.id }, data: { status: 'STARTING' } });
        await (0, docker_1.stopServerContainer)(server.id);
        await (0, docker_1.startServerContainer)(server.id);
        await prisma_1.prisma.server.update({ where: { id: server.id }, data: { status: 'ONLINE' } });
        (0, response_1.sendSuccess)(res, null, 'Serveur redémarré');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        await (0, docker_1.deleteServerContainer)(server.id);
        await prisma_1.prisma.server.delete({ where: { id: server.id } });
        const dir = uploadDir(req.params.id);
        if (fs_1.default.existsSync(dir))
            fs_1.default.rmSync(dir, { recursive: true, force: true });
        (0, response_1.sendSuccess)(res, null, 'Serveur supprimé');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/:id/stats', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        const { cpu, ram } = await (0, docker_1.getContainerStats)(server.id);
        (0, response_1.sendSuccess)(res, { ...server, cpuUsage: cpu, ramUsage: ram });
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/:id/logs', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        const logs = await (0, docker_1.getContainerLogs)(server.id);
        (0, response_1.sendSuccess)(res, { logs });
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/:id/exec', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        if (server.status !== 'ONLINE')
            return (0, response_1.sendError)(res, 'Serveur hors ligne', 400);
        const { command } = req.body;
        if (!command)
            return (0, response_1.sendError)(res, 'Commande requise', 400);
        const containerName = `xhris-server-${server.id}`;
        const { stdout, stderr } = await execAsync(`${DOCKER} exec ${containerName} sh -c "${command.replace(/"/g, '\\"')}"`).catch((err) => ({ stdout: '', stderr: err.message }));
        (0, response_1.sendSuccess)(res, { output: stdout || stderr || 'Commande exécutée' });
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/:id/upload', upload.single('file'), async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        const file = req.file;
        if (!file)
            return (0, response_1.sendError)(res, 'Aucun fichier fourni', 400);
        if (file.originalname.toLowerCase().endsWith('.zip')) {
            const dir = uploadDir(req.params.id);
            try {
                await execAsync(`unzip -o "${file.path}" -d "${dir}"`);
                fs_1.default.unlinkSync(file.path);
            }
            catch {
            }
        }
        (0, response_1.sendSuccess)(res, { filename: file.originalname }, 'Fichier uploadé');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur upload', 500);
    }
});
router.get('/:id/files', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        const sub = req.query.path || '';
        let targetDir;
        try {
            targetDir = safePath(req.params.id, sub);
        }
        catch {
            return (0, response_1.sendError)(res, 'Chemin invalide', 400);
        }
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
            return (0, response_1.sendSuccess)(res, { files: [] });
        }
        const entries = fs_1.default.readdirSync(targetDir, { withFileTypes: true });
        const files = entries.map(e => {
            let size = 0, modified = new Date();
            try {
                const s = fs_1.default.statSync(path_1.default.join(targetDir, e.name));
                size = s.size;
                modified = s.mtime;
            }
            catch { }
            return { name: e.name, isDir: e.isDirectory(), size, modified };
        }).sort((a, b) => {
            if (a.isDir !== b.isDir)
                return a.isDir ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        (0, response_1.sendSuccess)(res, { files });
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/:id/file', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        const filePath = req.query.path;
        if (!filePath)
            return (0, response_1.sendError)(res, 'Chemin requis', 400);
        let full;
        try {
            full = safePath(req.params.id, filePath);
        }
        catch {
            return (0, response_1.sendError)(res, 'Chemin invalide', 400);
        }
        if (!fs_1.default.existsSync(full))
            return (0, response_1.sendError)(res, 'Fichier introuvable', 404);
        const content = fs_1.default.readFileSync(full, 'utf-8');
        (0, response_1.sendSuccess)(res, { content, path: filePath });
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.put('/:id/file', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        const { path: filePath, content, newName } = req.body;
        if (!filePath)
            return (0, response_1.sendError)(res, 'Chemin requis', 400);
        let full;
        try {
            full = safePath(req.params.id, filePath);
        }
        catch {
            return (0, response_1.sendError)(res, 'Chemin invalide', 400);
        }
        if (content !== undefined) {
            fs_1.default.mkdirSync(path_1.default.dirname(full), { recursive: true });
            fs_1.default.writeFileSync(full, content, 'utf-8');
        }
        if (newName && newName !== path_1.default.basename(filePath)) {
            const parentRel = path_1.default.dirname(filePath);
            const newRel = parentRel === '.' ? newName : `${parentRel}/${newName}`;
            let newFull;
            try {
                newFull = safePath(req.params.id, newRel);
            }
            catch {
                return (0, response_1.sendError)(res, 'Chemin invalide', 400);
            }
            fs_1.default.renameSync(full, newFull);
        }
        (0, response_1.sendSuccess)(res, null, 'Fichier sauvegardé');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/:id/file', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        const filePath = req.query.path;
        if (!filePath)
            return (0, response_1.sendError)(res, 'Chemin requis', 400);
        let full;
        try {
            full = safePath(req.params.id, filePath);
        }
        catch {
            return (0, response_1.sendError)(res, 'Chemin invalide', 400);
        }
        if (!fs_1.default.existsSync(full))
            return (0, response_1.sendError)(res, 'Fichier introuvable', 404);
        const stat = fs_1.default.statSync(full);
        if (stat.isDirectory()) {
            fs_1.default.rmSync(full, { recursive: true, force: true });
        }
        else {
            fs_1.default.unlinkSync(full);
        }
        (0, response_1.sendSuccess)(res, null, 'Supprimé');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/:id/deploy', async (req, res) => {
    try {
        const server = await prisma_1.prisma.server.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!server)
            return (0, response_1.sendError)(res, 'Serveur non trouvé', 404);
        if (server.status !== 'ONLINE')
            return (0, response_1.sendError)(res, 'Serveur hors ligne — démarrez le d\'abord', 400);
        let apiKeyRecord = await prisma_1.prisma.apiKey.findFirst({
            where: { userId: req.user.id, status: 'ACTIVE' },
            select: { key: true },
        });
        if (!apiKeyRecord) {
            const newKey = `xhs_live_${crypto_1.default.randomBytes(20).toString('hex')}`;
            apiKeyRecord = await prisma_1.prisma.apiKey.create({
                data: { userId: req.user.id, name: `Clé auto — ${server.name}`, key: newKey, permissions: ['read', 'write', 'bots', 'servers', 'coins'] },
                select: { key: true },
            });
        }
        const xhrisEnvVars = {
            XHRIS_API_KEY: apiKeyRecord.key,
            XHRIS_API_URL: process.env.BACKEND_URL || 'https://api.xhrishost.site/api',
            BOT_NAME: server.name,
            XHRIS_DEPLOY_TYPE: 'server-upload',
        };
        await (0, docker_1.deployFilesToContainer)(server.id, xhrisEnvVars);
        (0, response_1.sendSuccess)(res, null, 'Déploiement lancé');
    }
    catch (err) {
        (0, response_1.sendError)(res, err?.message || 'Erreur déploiement', 500);
    }
});
exports.default = router;
