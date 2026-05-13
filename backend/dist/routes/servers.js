"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const docker_1 = require("../utils/docker");
const router = (0, express_1.Router)();
const PLAN_SPECS = {
    STARTER: { cpu: 1, ram: 1, storage: 10, coinsPerDay: 10 },
    PRO: { cpu: 2, ram: 2, storage: 20, coinsPerDay: 20 },
    ADVANCED: { cpu: 4, ram: 4, storage: 40, coinsPerDay: 40 },
    ELITE: { cpu: 8, ram: 8, storage: 80, coinsPerDay: 80 },
};
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
    catch (err) {
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
    catch (err) {
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
            return (0, response_1.sendError)(res, `Coins insuffisants (${specs.coinsPerDay} coins requis)`, 400);
        const domain = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.xhris.host`;
        const server = await prisma_1.prisma.server.create({
            data: {
                name, plan: plan.toUpperCase(),
                status: 'STARTING', userId: req.user.id,
                domain, storageTotal: specs.storage, coinsPerDay: specs.coinsPerDay,
            },
        });
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { coins: { decrement: specs.coinsPerDay } } }),
            prisma_1.prisma.transaction.create({ data: { userId: req.user.id, type: 'CREATE_SERVER', description: `Création serveur ${name} (${plan})`, amount: -specs.coinsPerDay } }),
        ]);
        (0, docker_1.createServerContainer)(server.id, plan.toUpperCase())
            .then(async ({ containerId, port }) => {
            await prisma_1.prisma.server.update({
                where: { id: server.id },
                data: { status: 'ONLINE', dockerId: containerId },
            });
        })
            .catch(async () => {
            await prisma_1.prisma.server.update({ where: { id: server.id }, data: { status: 'ERROR' } });
        });
        (0, response_1.sendSuccess)(res, server, 'Serveur en cours de création', 201);
    }
    catch (err) {
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
    catch (err) {
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
    catch (err) {
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
    catch (err) {
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
        (0, response_1.sendSuccess)(res, null, 'Serveur supprimé');
    }
    catch (err) {
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
    catch (err) {
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
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.default = router;
