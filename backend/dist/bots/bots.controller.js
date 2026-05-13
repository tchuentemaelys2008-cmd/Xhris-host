"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBotStats = exports.updateEnvVars = exports.getBotLogs = exports.deleteBot = exports.restartBot = exports.stopBot = exports.startBot = exports.deployBot = exports.getBotById = exports.getAllBots = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const docker_bots_1 = require("../utils/docker-bots");
const DEPLOY_COST = 10;
const MAX_DEPLOYS_PER_DAY = 10;
const getAllBots = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = { userId: req.user.id };
        if (status)
            where.status = status.toUpperCase();
        const [bots, total] = await Promise.all([
            prisma_1.prisma.bot.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
            prisma_1.prisma.bot.count({ where }),
        ]);
        return res.json({ success: true, data: { bots, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    }
    catch (error) {
        logger_1.logger.error('getAllBots error:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getAllBots = getAllBots;
const getBotById = async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return res.status(404).json({ success: false, message: 'Bot non trouvé' });
        return res.json({ success: true, data: bot });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getBotById = getBotById;
const deployBot = async (req, res) => {
    try {
        const { marketplaceBotId, sessionLink, envVars, serverId } = req.body;
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deployCount = await prisma_1.prisma.bot.count({ where: { userId, createdAt: { gte: today } } });
        if (deployCount >= MAX_DEPLOYS_PER_DAY) {
            return res.status(400).json({ success: false, message: `Limite de ${MAX_DEPLOYS_PER_DAY} déploiements par jour atteinte` });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { coins: true } });
        if (!user || user.coins < DEPLOY_COST) {
            return res.status(400).json({ success: false, message: `Solde insuffisant. ${DEPLOY_COST} coins requis.` });
        }
        const marketplaceBot = marketplaceBotId
            ? await prisma_1.prisma.marketplaceBot.findUnique({ where: { id: marketplaceBotId } })
            : null;
        const bot = await prisma_1.prisma.$transaction(async (tx) => {
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
        (0, docker_bots_1.deployBotContainer)(bot.id, bot.platform, envVars || {})
            .then(async (containerId) => {
            await prisma_1.prisma.bot.update({
                where: { id: bot.id },
                data: { status: 'RUNNING', processId: containerId, logs: ['Bot démarré avec succès', `Conteneur Docker: ${containerId.substring(0, 12)}`, `Plateforme: ${bot.platform}`] },
            });
        })
            .catch(async (err) => {
            logger_1.logger.error('Docker deploy error:', err);
            await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'ERROR', logs: ['Erreur lors du démarrage du conteneur'] } });
        });
        logger_1.logger.info(`Bot deployed: ${bot.id} by ${userId}`);
        return res.status(201).json({ success: true, message: 'Bot déployé avec succès', data: bot });
    }
    catch (error) {
        logger_1.logger.error('deployBot error:', error);
        return res.status(500).json({ success: false, message: 'Erreur lors du déploiement' });
    }
};
exports.deployBot = deployBot;
const startBot = async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return res.status(404).json({ success: false, message: 'Bot non trouvé' });
        if (bot.status === 'RUNNING')
            return res.status(400).json({ success: false, message: 'Bot déjà en ligne' });
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { coins: true } });
        if (!user || user.coins < bot.coinsPerDay) {
            return res.status(400).json({ success: false, message: `Solde insuffisant. ${bot.coinsPerDay} coins requis.` });
        }
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING' } });
        await (0, docker_bots_1.startBotContainer)(bot.id);
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });
        return res.json({ success: true, message: 'Bot démarré' });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.startBot = startBot;
const stopBot = async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return res.status(404).json({ success: false, message: 'Bot non trouvé' });
        if (bot.status === 'STOPPED')
            return res.status(400).json({ success: false, message: 'Bot déjà arrêté' });
        await (0, docker_bots_1.stopBotContainer)(bot.id);
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'STOPPED', cpuUsage: 0, ramUsage: 0 } });
        return res.json({ success: true, message: 'Bot arrêté' });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.stopBot = stopBot;
const restartBot = async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return res.status(404).json({ success: false, message: 'Bot non trouvé' });
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING', restarts: { increment: 1 } } });
        await (0, docker_bots_1.stopBotContainer)(bot.id);
        await (0, docker_bots_1.startBotContainer)(bot.id);
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });
        return res.json({ success: true, message: 'Bot redémarré' });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.restartBot = restartBot;
const deleteBot = async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return res.status(404).json({ success: false, message: 'Bot non trouvé' });
        await (0, docker_bots_1.deleteBotContainer)(bot.id);
        await prisma_1.prisma.bot.delete({ where: { id: bot.id } });
        return res.json({ success: true, message: 'Bot supprimé' });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.deleteBot = deleteBot;
const getBotLogs = async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return res.status(404).json({ success: false, message: 'Bot non trouvé' });
        const dockerLogs = await (0, docker_bots_1.getBotContainerLogs)(bot.id);
        const logs = dockerLogs.length > 0 ? dockerLogs.map((log, i) => ({
            id: i, timestamp: new Date().toISOString(), message: log,
            level: log.toLowerCase().includes('error') ? 'error' : 'info',
        })) : bot.logs.map((log, i) => ({
            id: i, timestamp: new Date(Date.now() - (bot.logs.length - i) * 60000).toISOString(),
            message: log, level: log.toLowerCase().includes('error') ? 'error' : 'info',
        }));
        return res.json({ success: true, data: logs });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getBotLogs = getBotLogs;
const updateEnvVars = async (req, res) => {
    try {
        const { vars } = req.body;
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return res.status(404).json({ success: false, message: 'Bot non trouvé' });
        const updated = await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { envVars: vars } });
        return res.json({ success: true, message: 'Variables mises à jour', data: updated });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.updateEnvVars = updateEnvVars;
const getBotStats = async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return res.status(404).json({ success: false, message: 'Bot non trouvé' });
        const { cpu, ram } = await (0, docker_bots_1.getBotContainerStats)(bot.id);
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { cpuUsage: cpu, ramUsage: ram } });
        return res.json({ success: true, data: { cpu, ram, uptime: bot.uptime, restarts: bot.restarts, status: bot.status } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
exports.getBotStats = getBotStats;
