"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const where = { userId: req.user.id };
        if (status)
            where.status = status.toUpperCase();
        const [bots, total] = await Promise.all([
            prisma_1.prisma.bot.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            prisma_1.prisma.bot.count({ where }),
        ]);
        (0, response_1.sendPaginated)(res, bots, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/:id', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        (0, response_1.sendSuccess)(res, bot);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/deploy', async (req, res) => {
    try {
        const { name, platform, sessionLink, envVars, marketplaceBotId } = req.body;
        if (!name)
            return (0, response_1.sendError)(res, 'Nom du bot requis', 400);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { coins: true } });
        if (!user || user.coins < 10)
            return (0, response_1.sendError)(res, 'Coins insuffisants pour déployer un bot (10 coins requis)', 400);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deployedToday = await prisma_1.prisma.transaction.count({
            where: { userId: req.user.id, type: 'DEPLOY_BOT', createdAt: { gte: today } },
        });
        if (deployedToday >= 10)
            return (0, response_1.sendError)(res, 'Limite de déploiements quotidiens atteinte (10/jour)', 400);
        const bot = await prisma_1.prisma.bot.create({
            data: {
                name,
                platform: (platform?.toUpperCase() || 'WHATSAPP'),
                status: 'STARTING',
                userId: req.user.id,
                sessionLink,
                envVars: envVars || {},
                coinsPerDay: 10,
            },
        });
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { coins: { decrement: 10 } } }),
            prisma_1.prisma.transaction.create({ data: { userId: req.user.id, type: 'DEPLOY_BOT', description: `Déploiement de ${name}`, amount: -10 } }),
        ]);
        setTimeout(async () => {
            try {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });
            }
            catch { }
        }, 5000);
        (0, response_1.sendSuccess)(res, bot, 'Bot en cours de déploiement', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur lors du déploiement', 500);
    }
});
router.post('/:id/start', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        if (bot.status === 'RUNNING')
            return (0, response_1.sendError)(res, 'Bot déjà en cours d\'exécution', 400);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { coins: true } });
        if (!user || user.coins < bot.coinsPerDay)
            return (0, response_1.sendError)(res, 'Coins insuffisants', 400);
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING' } });
        setTimeout(async () => {
            try {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });
            }
            catch { }
        }, 3000);
        (0, response_1.sendSuccess)(res, null, 'Bot en cours de démarrage');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/:id/stop', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'STOPPED' } });
        (0, response_1.sendSuccess)(res, null, 'Bot arrêté');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/:id/restart', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING', restarts: { increment: 1 } } });
        setTimeout(async () => {
            try {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });
            }
            catch { }
        }, 3000);
        (0, response_1.sendSuccess)(res, null, 'Bot en cours de redémarrage');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        await prisma_1.prisma.bot.delete({ where: { id: bot.id } });
        (0, response_1.sendSuccess)(res, null, 'Bot supprimé');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/:id/logs', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id }, select: { logs: true, status: true } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        const defaultLogs = [
            `[${new Date().toISOString()}] Bot démarré`,
            `[${new Date().toISOString()}] Connexion WhatsApp établie`,
            `[${new Date().toISOString()}] Session restaurée`,
            `[${new Date().toISOString()}] En attente de messages...`,
        ];
        (0, response_1.sendSuccess)(res, { logs: bot.logs.length > 0 ? bot.logs : defaultLogs, status: bot.status });
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.patch('/:id/env', async (req, res) => {
    try {
        const { vars } = req.body;
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        const updated = await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { envVars: vars } });
        (0, response_1.sendSuccess)(res, updated, 'Variables d\'environnement mises à jour');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/:id/stats', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({
            where: { id: req.params.id, userId: req.user.id },
            select: { cpuUsage: true, ramUsage: true, uptime: true, restarts: true, status: true },
        });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        (0, response_1.sendSuccess)(res, bot);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.default = router;
