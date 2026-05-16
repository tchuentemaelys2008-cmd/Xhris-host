"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCKER_AVAILABLE = void 0;
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const crypto_1 = __importDefault(require("crypto"));
const child_process_1 = require("child_process");
const docker_bots_1 = require("../utils/docker-bots");
const process_runner_1 = require("../utils/process-runner");
const logger_1 = require("../utils/logger");
const fs_1 = __importDefault(require("fs"));
const bot_log_files_1 = require("../utils/bot-log-files");
const notify_1 = require("../utils/notify");
const router = (0, express_1.Router)();
exports.DOCKER_AVAILABLE = (() => {
    try {
        (0, child_process_1.execSync)('docker version', { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
})();
const READY_LOG_PATTERN = /(\[WA-CONNECT\]\s*open|whatsapp\s+(connected|connect|open|ready)|bot\s+(connected|connecte|connecté|en ligne|ready|started|démarré|demarre|prêt|pret)|client\s+(connected|connecte|connecté|ready)|connection\s+(open|opened|established)|login\s+successful|connexion\s+(whatsapp\s+)?r[eé]ussie|server\s+(running|started|listening)|listening\s+on|démarré\s+sur|started\s+on|✅|connected to|baileys.*open|qr\s*generated|scan\s+the\s+qr|connecté|en\s+ligne)/i;
function addRuntimeEnvAliases(env) {
    const normalized = { ...env };
    const session = normalized.SESSION_ID || normalized.SESSION || normalized.SESSIONID || normalized.SESSION_STRING;
    if (session) {
        normalized.SESSION_ID = session;
        normalized.SESSION = normalized.SESSION || session;
        normalized.SESSIONID = normalized.SESSIONID || session;
        normalized.SESSION_STRING = normalized.SESSION_STRING || session;
    }
    const owner = normalized.OWNER_NUMBER || normalized.OWNER || normalized.OWNER_NUM || normalized.BOT_OWNER || normalized.SUDO;
    if (owner) {
        const cleanOwner = String(owner).replace(/^\+/, '');
        normalized.OWNER_NUMBER = normalized.OWNER_NUMBER || cleanOwner;
        normalized.OWNER = normalized.OWNER || cleanOwner;
        normalized.OWNER_NUM = normalized.OWNER_NUM || cleanOwner;
        normalized.BOT_OWNER = normalized.BOT_OWNER || cleanOwner;
    }
    if (normalized.PREFIX && !normalized.PREFIXES)
        normalized.PREFIXES = normalized.PREFIX;
    return normalized;
}
function maskEnvVars(envVars) {
    if (!envVars || typeof envVars !== 'object')
        return envVars;
    const safe = { ...envVars };
    const PROTECTED = ['XHRIS_API_KEY', 'SESSION_SECRET', 'OPENAI_API_KEY'];
    PROTECTED.forEach(k => {
        if (safe[k])
            safe[k] = '***' + String(safe[k]).slice(-4);
    });
    return safe;
}
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
        const safeBots = bots.map(b => ({ ...b, envVars: maskEnvVars(b.envVars) }));
        (0, response_1.sendPaginated)(res, safeBots, total, page, limit);
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/:id', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        (0, response_1.sendSuccess)(res, { ...bot, envVars: maskEnvVars(bot.envVars) });
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/deploy', async (req, res) => {
    try {
        const { name, platform, sessionLink, envVars, marketplaceBotId, serverId: rawServerId } = req.body;
        let serverId = rawServerId || null;
        if (!serverId) {
            const existingServer = await prisma_1.prisma.server.findFirst({
                where: { userId: req.user.id, status: { in: ['ONLINE'] } },
                orderBy: { createdAt: 'desc' },
            }).catch(() => null);
            serverId = existingServer?.id || null;
        }
        const marketplaceBot = marketplaceBotId
            ? await prisma_1.prisma.marketplaceBot.findFirst({ where: { id: marketplaceBotId, status: 'PUBLISHED' } }).catch(() => null)
            : null;
        const botName = name || marketplaceBot?.name;
        if (!botName)
            return (0, response_1.sendError)(res, 'Nom du bot requis', 400);
        const deployCost = marketplaceBot?.coinsPerDay || 10;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { coins: true } });
        if (!user || user.coins < deployCost)
            return (0, response_1.sendError)(res, `Coins insuffisants (${deployCost} requis)`, 400);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deployedToday = await prisma_1.prisma.transaction.count({
            where: { userId: req.user.id, type: 'DEPLOY_BOT', createdAt: { gte: today } },
        });
        if (deployedToday >= 10)
            return (0, response_1.sendError)(res, 'Limite quotidienne atteinte (10/jour)', 400);
        const existingKey = await prisma_1.prisma.apiKey.findFirst({
            where: { userId: req.user.id, status: 'ACTIVE' },
            select: { key: true },
        });
        const apiKeyValue = existingKey?.key || `xhs_live_${crypto_1.default.randomBytes(20).toString('hex')}`;
        if (!existingKey) {
            await prisma_1.prisma.apiKey.create({
                data: { userId: req.user.id, name: `Cle auto - ${botName}`, key: apiKeyValue, permissions: ['read', 'write', 'bots', 'servers', 'coins'] },
            });
        }
        const mergedEnvVars = addRuntimeEnvAliases({
            ...(envVars || {}),
            XHRIS_API_KEY: apiKeyValue,
            XHRIS_API_URL: process.env.BACKEND_URL || 'https://api.xhrishost.site/api',
            BOT_NAME: botName,
            XHRIS_DEPLOY_TYPE: marketplaceBotId ? '1click' : 'upload',
        });
        if (marketplaceBotId && marketplaceBot) {
            if (marketplaceBot.githubUrl)
                mergedEnvVars.GITHUB_URL = marketplaceBot.githubUrl;
            if (marketplaceBot.setupFile)
                mergedEnvVars.SETUP_FILE_PATH = marketplaceBot.setupFile;
            if (!marketplaceBot.githubUrl && !marketplaceBot.setupFile) {
                return (0, response_1.sendError)(res, 'Ce bot marketplace n a ni depot GitHub ni fichier de setup publie', 400);
            }
            await prisma_1.prisma.marketplaceBot.update({
                where: { id: marketplaceBotId },
                data: { downloads: { increment: 1 } },
            }).catch(() => { });
        }
        const bot = await prisma_1.prisma.bot.create({
            data: {
                name: botName,
                platform: (platform?.toUpperCase() || marketplaceBot?.platform || 'WHATSAPP'),
                status: 'STARTING',
                userId: req.user.id,
                serverId,
                sessionLink,
                envVars: mergedEnvVars,
                coinsPerDay: deployCost,
            },
        });
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { coins: { decrement: deployCost } } }),
            prisma_1.prisma.transaction.create({ data: { userId: req.user.id, type: 'DEPLOY_BOT', description: `Deploiement de ${botName}`, amount: -deployCost } }),
        ]);
        try {
            const botPlatform = platform?.toUpperCase() || marketplaceBot?.platform || 'WHATSAPP';
            const onReady = async () => {
                (0, bot_log_files_1.appendBotLog)(bot.id, 'Readiness marker detected; bot is online');
                await prisma_1.prisma.bot.update({
                    where: { id: bot.id },
                    data: { status: 'RUNNING', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) },
                }).catch(() => { });
                await (0, notify_1.notify)(req.user.id, {
                    title: 'Bot connecté ! 🎉',
                    message: `${botName} est en ligne et prêt à recevoir des messages.`,
                    type: 'BOT',
                    link: '/dashboard/bots',
                }).catch(() => { });
            };
            const onExit = async (code) => {
                if (code === 0)
                    return;
                const latest = await prisma_1.prisma.bot.findUnique({ where: { id: bot.id }, select: { status: true } }).catch(() => null);
                if (!latest || !['STARTING', 'RUNNING'].includes(latest.status))
                    return;
                (0, bot_log_files_1.appendBotLog)(bot.id, `Bot process stopped before a healthy WhatsApp session was confirmed (exit ${code ?? 'unknown'})`);
                await prisma_1.prisma.bot.update({
                    where: { id: bot.id },
                    data: { status: 'ERROR', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) },
                }).catch(() => { });
            };
            let processId = '';
            if (exports.DOCKER_AVAILABLE) {
                const containerId = await (0, docker_bots_1.deployBotContainer)(bot.id, botPlatform, mergedEnvVars);
                processId = containerId;
                await prisma_1.prisma.bot.update({
                    where: { id: bot.id },
                    data: { status: 'STARTING', processId: containerId, logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 50) },
                });
                let markedReady = false;
                (0, docker_bots_1.followBotContainerLogs)(bot.id, async (line) => {
                    if (markedReady || !READY_LOG_PATTERN.test(line))
                        return;
                    markedReady = true;
                    await onReady();
                }, onExit);
                let installAttempts = 0;
                const crashLoopDetector = setInterval(() => {
                    try {
                        const logs = (0, bot_log_files_1.readBotLogLines)(bot.id, 200);
                        const attempts = logs.filter(l => /Installing system build tools/i.test(l)).length;
                        if (attempts > 2 && installAttempts !== attempts) {
                            installAttempts = attempts;
                            if (attempts >= 3) {
                                clearInterval(crashLoopDetector);
                                (0, bot_log_files_1.appendBotLog)(bot.id, 'CRASH LOOP DETECTED: container restarting repeatedly. Stopping.');
                                Promise.resolve().then(() => __importStar(require('child_process'))).then(({ execSync }) => {
                                    try {
                                        execSync(`docker stop xhris-bot-${bot.id}`, { stdio: 'ignore' });
                                    }
                                    catch { }
                                    try {
                                        execSync(`docker update --restart=no xhris-bot-${bot.id}`, { stdio: 'ignore' });
                                    }
                                    catch { }
                                });
                                prisma_1.prisma.bot.update({
                                    where: { id: bot.id },
                                    data: {
                                        status: 'ERROR',
                                        logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100),
                                    },
                                }).catch(() => { });
                            }
                        }
                    }
                    catch { }
                }, 15000);
                setTimeout(async () => {
                    try {
                        const current = await prisma_1.prisma.bot.findUnique({
                            where: { id: bot.id },
                            select: { status: true, userId: true, name: true },
                        });
                        if (!current || current.status !== 'STARTING')
                            return;
                        let isAlive = false;
                        try {
                            const result = (0, child_process_1.execSync)(`docker inspect --format='{{.State.Running}}' xhris-bot-${bot.id}`, { encoding: 'utf8' }).trim().replace(/'/g, '');
                            isAlive = result === 'true';
                        }
                        catch {
                            isAlive = false;
                        }
                        if (isAlive) {
                            (0, bot_log_files_1.appendBotLog)(bot.id, 'Healthcheck 120s: container alive, marking RUNNING');
                            await prisma_1.prisma.bot.update({
                                where: { id: bot.id },
                                data: { status: 'RUNNING', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) },
                            }).catch(() => { });
                            await prisma_1.prisma.notification.create({
                                data: {
                                    userId: current.userId,
                                    title: 'Bot en ligne ! 🎉',
                                    message: `${current.name} est démarré et fonctionne.`,
                                    type: 'BOT',
                                },
                            }).catch(() => { });
                        }
                        else {
                            (0, bot_log_files_1.appendBotLog)(bot.id, 'Healthcheck 120s: container NOT running, marking ERROR');
                            await prisma_1.prisma.bot.update({
                                where: { id: bot.id },
                                data: { status: 'ERROR', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) },
                            }).catch(() => { });
                        }
                    }
                    catch (e) {
                        (0, bot_log_files_1.appendBotLog)(bot.id, `Healthcheck error: ${e?.message || e}`);
                    }
                }, 120000);
            }
            else {
                const pid = await (0, process_runner_1.deployBotNative)(bot.id, botPlatform, mergedEnvVars, onReady, onExit);
                processId = pid;
                await prisma_1.prisma.bot.update({
                    where: { id: bot.id },
                    data: { status: 'STARTING', processId: pid, logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 50) },
                });
            }
            logger_1.logger.info(`Bot deploy started: ${bot.id} runner=${exports.DOCKER_AVAILABLE ? 'docker' : 'native'} process=${processId}`);
            return (0, response_1.sendSuccess)(res, { ...bot, status: 'STARTING', processId, apiKey: apiKeyValue }, 'Bot en cours de deploiement', 201);
        }
        catch (err) {
            const message = err?.message || 'Erreur inconnue';
            (0, bot_log_files_1.appendBotLog)(bot.id, `Deployment failed: ${message}`);
            logger_1.logger.error(`Bot deploy failed: ${bot.id} - ${message}`);
            const failedBot = await prisma_1.prisma.bot.update({
                where: { id: bot.id },
                data: { status: 'ERROR', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) },
            });
            return res.status(500).json({ success: false, message, data: { ...failedBot, apiKey: apiKeyValue } });
        }
    }
    catch (err) {
        logger_1.logger.error(`Bot deploy route failed: ${err?.message || err}`);
        return (0, response_1.sendError)(res, 'Erreur lors du deploiement', 500);
    }
});
router.post('/:id/start', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        if (bot.status === 'RUNNING')
            return (0, response_1.sendError)(res, 'Bot déjà en cours', 400);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { coins: true } });
        if (!user || user.coins < bot.coinsPerDay)
            return (0, response_1.sendError)(res, 'Coins insuffisants', 400);
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING' } });
        if (exports.DOCKER_AVAILABLE) {
            (0, docker_bots_1.startBotContainer)(bot.id)
                .then(async () => {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });
            })
                .catch(async () => {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'ERROR' } });
            });
        }
        else {
            (0, process_runner_1.startBotNative)(bot.id, bot.platform, addRuntimeEnvAliases(bot.envVars || {}), async () => {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) } }).catch(() => { });
            }, async (code) => {
                if (code === 0)
                    return;
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'ERROR', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) } }).catch(() => { });
            }).then(async (pid) => {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { processId: pid, logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 50) } }).catch(() => { });
            }).catch(async () => {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'ERROR', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) } }).catch(() => { });
            });
        }
        (0, response_1.sendSuccess)(res, null, 'Bot en cours de démarrage');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/:id/stop', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        if (exports.DOCKER_AVAILABLE)
            await (0, docker_bots_1.stopBotContainer)(bot.id);
        else
            await (0, process_runner_1.stopBotNative)(bot.id);
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'STOPPED', cpuUsage: 0, ramUsage: 0 } });
        (0, response_1.sendSuccess)(res, null, 'Bot arrêté');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/:id/restart', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'STARTING', restarts: { increment: 1 } } });
        if (exports.DOCKER_AVAILABLE) {
            await (0, docker_bots_1.stopBotContainer)(bot.id);
            (0, docker_bots_1.startBotContainer)(bot.id)
                .then(async () => {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING' } });
            })
                .catch(async () => {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'ERROR' } });
            });
        }
        else {
            await (0, process_runner_1.stopBotNative)(bot.id);
            (0, process_runner_1.startBotNative)(bot.id, bot.platform, addRuntimeEnvAliases(bot.envVars || {}), async () => {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'RUNNING', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) } }).catch(() => { });
            }, async (code) => {
                if (code === 0)
                    return;
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'ERROR', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) } }).catch(() => { });
            }).then(async (pid) => {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { processId: pid, logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 50) } }).catch(() => { });
            }).catch(async () => {
                await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'ERROR', logs: (0, bot_log_files_1.readBotLogLines)(bot.id, 100) } }).catch(() => { });
            });
        }
        (0, response_1.sendSuccess)(res, null, 'Bot en cours de redémarrage');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        if (exports.DOCKER_AVAILABLE)
            await (0, docker_bots_1.deleteBotContainer)(bot.id);
        else
            await (0, process_runner_1.deleteBotNative)(bot.id);
        await prisma_1.prisma.bot.delete({ where: { id: bot.id } });
        (0, response_1.sendSuccess)(res, null, 'Bot supprimé');
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/:id/logs', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id }, select: { logs: true, status: true } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouve', 404);
        const fileLogs = (0, bot_log_files_1.readBotLogLines)(req.params.id, 200);
        const dockerLogs = fileLogs.length > 0 ? fileLogs : await (0, docker_bots_1.getBotContainerLogs)(req.params.id);
        const logs = dockerLogs.length > 0 ? dockerLogs : (bot.logs.length > 0 ? bot.logs : ['Aucun log disponible']);
        return (0, response_1.sendSuccess)(res, { logs, status: bot.status });
    }
    catch {
        return (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/:id/logs/stream', async (req, res) => {
    const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id }, select: { id: true } });
    if (!bot)
        return (0, response_1.sendError)(res, 'Bot non trouve', 404);
    const logPath = (0, bot_log_files_1.ensureBotLogFile)(req.params.id);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    let lastOffset = 0;
    const sendLine = (line) => {
        if (!line.trim())
            return;
        res.write(`data: ${JSON.stringify({ line, ts: new Date().toISOString() })}\n\n`);
    };
    const readNewBytes = () => {
        fs_1.default.stat(logPath, (statErr, stats) => {
            if (statErr)
                return;
            if (stats.size < lastOffset)
                lastOffset = 0;
            if (stats.size === lastOffset)
                return;
            const stream = fs_1.default.createReadStream(logPath, { start: lastOffset, end: stats.size - 1, encoding: 'utf8' });
            lastOffset = stats.size;
            let buffer = '';
            stream.on('data', (chunk) => {
                buffer += chunk;
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop() || '';
                lines.forEach(sendLine);
            });
            stream.on('end', () => {
                if (buffer)
                    sendLine(buffer);
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
router.patch('/:id/env', async (req, res) => {
    try {
        const { vars } = req.body;
        const bot = await prisma_1.prisma.bot.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        const PROTECTED = ['XHRIS_API_KEY', 'XHRIS_API_URL', 'XHRIS_DEPLOY_TYPE', 'BOT_NAME'];
        const existingEnv = bot.envVars || {};
        const safeVars = { ...vars };
        PROTECTED.forEach(k => { if (existingEnv[k])
            safeVars[k] = existingEnv[k]; });
        const updated = await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { envVars: safeVars } });
        (0, response_1.sendSuccess)(res, { ...updated, envVars: maskEnvVars(updated.envVars) }, 'Variables mises à jour');
    }
    catch {
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
        if (bot.status === 'RUNNING') {
            const { cpu, ram } = exports.DOCKER_AVAILABLE
                ? await (0, docker_bots_1.getBotContainerStats)(req.params.id)
                : await (0, process_runner_1.getBotNativeStats)(req.params.id);
            (0, response_1.sendSuccess)(res, { ...bot, cpuUsage: cpu, ramUsage: ram });
        }
        else {
            (0, response_1.sendSuccess)(res, bot);
        }
    }
    catch {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.default = router;
