"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSockets = setupWebSockets;
exports.sendNotification = sendNotification;
exports.broadcastToAdmins = broadcastToAdmins;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const onlineUsers = new Map();
function setupWebSockets(io) {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
            if (!token)
                return next(new Error('Authentication required'));
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'xhris-secret-key');
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, name: true, role: true, status: true },
            });
            if (!user || user.status === 'BANNED')
                return next(new Error('Access denied'));
            socket.userId = user.id;
            socket.userName = user.name;
            socket.userRole = user.role;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', async (socket) => {
        const userId = socket.userId;
        const userName = socket.userName;
        const userRole = socket.userRole;
        logger_1.logger.info(`User connected: ${userName} (${userId})`);
        onlineUsers.set(userId, { socketId: socket.id, userId, name: userName, role: userRole });
        io.emit('users:online', { count: onlineUsers.size, users: Array.from(onlineUsers.values()) });
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { lastLogin: new Date() } }).catch(() => { });
        socket.join(`user:${userId}`);
        socket.on('channel:join', (channelId) => {
            socket.join(`channel:${channelId}`);
            socket.emit('channel:joined', { channelId });
        });
        socket.on('channel:leave', (channelId) => {
            socket.leave(`channel:${channelId}`);
        });
        socket.on('message:send', async (data) => {
            try {
                if (!data.content?.trim() || data.content.length > 2000)
                    return;
                const channel = await prisma_1.prisma.channel.findUnique({ where: { id: data.channelId } });
                if (!channel)
                    return;
                const message = await prisma_1.prisma.message.create({
                    data: { channelId: data.channelId, userId, content: data.content, attachments: data.attachments || [] },
                    include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
                });
                io.to(`channel:${data.channelId}`).emit('message:new', message);
            }
            catch (err) {
                socket.emit('error', { message: 'Erreur envoi message' });
            }
        });
        socket.on('message:edit', async (data) => {
            try {
                const msg = await prisma_1.prisma.message.findUnique({ where: { id: data.messageId } });
                if (!msg || msg.userId !== userId)
                    return;
                const updated = await prisma_1.prisma.message.update({
                    where: { id: data.messageId },
                    data: { content: data.content, edited: true, editedAt: new Date() },
                    include: { user: { select: { id: true, name: true } } },
                });
                io.to(`channel:${msg.channelId}`).emit('message:edited', updated);
            }
            catch { }
        });
        socket.on('message:delete', async (data) => {
            try {
                const msg = await prisma_1.prisma.message.findUnique({ where: { id: data.messageId } });
                if (!msg)
                    return;
                const canDelete = msg.userId === userId || ['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(userRole);
                if (!canDelete)
                    return;
                await prisma_1.prisma.message.delete({ where: { id: data.messageId } });
                io.to(`channel:${msg.channelId}`).emit('message:deleted', { messageId: data.messageId });
            }
            catch { }
        });
        socket.on('message:react', async (data) => {
            try {
                const msg = await prisma_1.prisma.message.findUnique({ where: { id: data.messageId } });
                if (!msg)
                    return;
                const existing = await prisma_1.prisma.messageReaction.findUnique({
                    where: { messageId_userId_emoji: { messageId: data.messageId, userId, emoji: data.emoji } },
                });
                if (existing) {
                    await prisma_1.prisma.messageReaction.delete({ where: { id: existing.id } });
                    io.to(`channel:${msg.channelId}`).emit('message:reaction:removed', { messageId: data.messageId, userId, emoji: data.emoji });
                }
                else {
                    await prisma_1.prisma.messageReaction.create({ data: { messageId: data.messageId, userId, emoji: data.emoji } });
                    io.to(`channel:${msg.channelId}`).emit('message:reaction:added', { messageId: data.messageId, userId, emoji: data.emoji });
                }
            }
            catch { }
        });
        socket.on('typing:start', (channelId) => {
            socket.to(`channel:${channelId}`).emit('typing:start', { userId, userName });
        });
        socket.on('typing:stop', (channelId) => {
            socket.to(`channel:${channelId}`).emit('typing:stop', { userId });
        });
        socket.on('bot:subscribe', (botId) => {
            socket.join(`bot:${botId}`);
        });
        socket.on('bot:unsubscribe', (botId) => {
            socket.leave(`bot:${botId}`);
        });
        socket.on('server:subscribe', (serverId) => {
            socket.join(`server:${serverId}`);
        });
        socket.on('notification:read', async (notifId) => {
            try {
                await prisma_1.prisma.notification.updateMany({ where: { id: notifId, userId }, data: { read: true } });
            }
            catch { }
        });
        socket.on('notification:count', async () => {
            try {
                const count = await prisma_1.prisma.notification.count({ where: { userId, read: false } });
                socket.emit('notification:count', { count });
            }
            catch { }
        });
        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            io.emit('users:online', { count: onlineUsers.size, users: Array.from(onlineUsers.values()) });
            logger_1.logger.info(`User disconnected: ${userName} (${userId})`);
        });
    });
    setInterval(async () => {
        try {
            const bots = await prisma_1.prisma.bot.findMany({ where: { status: 'RUNNING' }, select: { id: true, userId: true } });
            for (const bot of bots) {
                const stats = { botId: bot.id, cpu: Math.random() * 50, ram: Math.random() * 400 + 100, timestamp: Date.now() };
                io.to(`bot:${bot.id}`).emit('bot:stats', stats);
                io.to(`user:${bot.userId}`).emit('bot:stats', stats);
            }
        }
        catch { }
    }, 10000);
    setInterval(async () => {
        try {
            const runningBots = await prisma_1.prisma.bot.findMany({ where: { status: 'RUNNING' }, select: { id: true, userId: true, coinsPerDay: true } });
            for (const bot of runningBots) {
                const coinsPerHour = Math.ceil(bot.coinsPerDay / 24);
                const user = await prisma_1.prisma.user.findUnique({ where: { id: bot.userId }, select: { coins: true } });
                if (!user || user.coins < coinsPerHour) {
                    await prisma_1.prisma.bot.update({ where: { id: bot.id }, data: { status: 'STOPPED' } });
                    io.to(`user:${bot.userId}`).emit('bot:stopped', { botId: bot.id, reason: 'insufficient_coins' });
                    await prisma_1.prisma.notification.create({
                        data: { userId: bot.userId, title: 'Bot arrêté', message: 'Votre bot a été arrêté par manque de coins.', type: 'WARNING' }
                    });
                }
                else {
                    await prisma_1.prisma.user.update({ where: { id: bot.userId }, data: { coins: { decrement: coinsPerHour } } });
                }
            }
            const onlineServers = await prisma_1.prisma.server.findMany({ where: { status: 'ONLINE' }, select: { id: true, userId: true, coinsPerDay: true } });
            for (const server of onlineServers) {
                const coinsPerHour = Math.ceil(server.coinsPerDay / 24);
                const user = await prisma_1.prisma.user.findUnique({ where: { id: server.userId }, select: { coins: true } });
                if (!user || user.coins < coinsPerHour) {
                    await prisma_1.prisma.server.update({ where: { id: server.id }, data: { status: 'OFFLINE' } });
                    io.to(`user:${server.userId}`).emit('server:stopped', { serverId: server.id, reason: 'insufficient_coins' });
                }
                else {
                    await prisma_1.prisma.user.update({ where: { id: server.userId }, data: { coins: { decrement: coinsPerHour } } });
                }
            }
        }
        catch (err) {
            logger_1.logger.error('Cron error:', err);
        }
    }, 60 * 60 * 1000);
    logger_1.logger.info('WebSocket server initialized');
}
async function sendNotification(io, userId, notification) {
    try {
        const notif = await prisma_1.prisma.notification.create({
            data: { userId, title: notification.title, message: notification.message, type: (notification.type || 'INFO') },
        });
        io.to(`user:${userId}`).emit('notification:new', notif);
    }
    catch { }
}
function broadcastToAdmins(io, event, data) {
    io.emit(`admin:${event}`, data);
}
