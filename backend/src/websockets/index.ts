import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { sendPushToUser } from '../utils/push';

interface AuthSocket extends Socket {
  userId?: string;
  userName?: string;
  userRole?: string;
}

const onlineUsers = new Map<string, { socketId: string; userId: string; name: string; role: string }>();

export function setupWebSockets(io: Server) {
  // Auth middleware
  io.use(async (socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'xhris-secret-key') as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, name: true, role: true, status: true },
      });

      if (!user || user.status === 'BANNED') return next(new Error('Access denied'));

      socket.userId = user.id;
      socket.userName = user.name;
      socket.userRole = user.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.userId!;
    const userName = socket.userName!;
    const userRole = socket.userRole!;

    logger.info(`User connected: ${userName} (${userId})`);

    // Track online users
    onlineUsers.set(userId, { socketId: socket.id, userId, name: userName, role: userRole });
    io.emit('users:online', { count: onlineUsers.size, users: Array.from(onlineUsers.values()) });

    // Update last login
    await prisma.user.update({ where: { id: userId }, data: { lastLogin: new Date() } }).catch(() => {});

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // ============ COMMUNITY ============

    // Join channel
    socket.on('channel:join', (channelId: string) => {
      socket.join(`channel:${channelId}`);
      socket.emit('channel:joined', { channelId });
    });

    // Leave channel
    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    // Send message
    socket.on('message:send', async (data: { channelId: string; content: string; attachments?: string[] }) => {
      try {
        if (!data.content?.trim() || data.content.length > 2000) return;

        const channel = await prisma.channel.findUnique({ where: { id: data.channelId } });
        if (!channel) return;

        const message = await prisma.message.create({
          data: { channelId: data.channelId, userId, content: data.content, attachments: data.attachments || [] },
          include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
        });

        io.to(`channel:${data.channelId}`).emit('message:new', message);
      } catch (err) {
        socket.emit('error', { message: 'Erreur envoi message' });
      }
    });

    // Edit message
    socket.on('message:edit', async (data: { messageId: string; content: string }) => {
      try {
        const msg = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (!msg || msg.userId !== userId) return;

        const updated = await prisma.message.update({
          where: { id: data.messageId },
          data: { content: data.content, edited: true, editedAt: new Date() },
          include: { user: { select: { id: true, name: true } } },
        });

        io.to(`channel:${msg.channelId}`).emit('message:edited', updated);
      } catch {}
    });

    // Delete message
    socket.on('message:delete', async (data: { messageId: string }) => {
      try {
        const msg = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (!msg) return;
        const canDelete = msg.userId === userId || ['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(userRole);
        if (!canDelete) return;

        await prisma.message.delete({ where: { id: data.messageId } });
        io.to(`channel:${msg.channelId}`).emit('message:deleted', { messageId: data.messageId });
      } catch {}
    });

    // Reaction
    socket.on('message:react', async (data: { messageId: string; emoji: string }) => {
      try {
        const msg = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (!msg) return;

        const existing = await prisma.messageReaction.findUnique({
          where: { messageId_userId_emoji: { messageId: data.messageId, userId, emoji: data.emoji } },
        });

        if (existing) {
          await prisma.messageReaction.delete({ where: { id: existing.id } });
          io.to(`channel:${msg.channelId}`).emit('message:reaction:removed', { messageId: data.messageId, userId, emoji: data.emoji });
        } else {
          await prisma.messageReaction.create({ data: { messageId: data.messageId, userId, emoji: data.emoji } });
          io.to(`channel:${msg.channelId}`).emit('message:reaction:added', { messageId: data.messageId, userId, emoji: data.emoji });
        }
      } catch {}
    });

    // Typing indicator
    socket.on('typing:start', (channelId: string) => {
      socket.to(`channel:${channelId}`).emit('typing:start', { userId, userName });
    });

    socket.on('typing:stop', (channelId: string) => {
      socket.to(`channel:${channelId}`).emit('typing:stop', { userId });
    });

    // ============ BOT MONITORING ============

    socket.on('bot:subscribe', (botId: string) => {
      socket.join(`bot:${botId}`);
    });

    socket.on('bot:unsubscribe', (botId: string) => {
      socket.leave(`bot:${botId}`);
    });

    // ============ SERVER MONITORING ============

    socket.on('server:subscribe', (serverId: string) => {
      socket.join(`server:${serverId}`);
    });

    // ============ NOTIFICATIONS ============

    // Mark notification as read
    socket.on('notification:read', async (notifId: string) => {
      try {
        await prisma.notification.updateMany({ where: { id: notifId, userId }, data: { read: true } });
      } catch {}
    });

    // Get unread count
    socket.on('notification:count', async () => {
      try {
        const count = await prisma.notification.count({ where: { userId, read: false } });
        socket.emit('notification:count', { count });
      } catch {}
    });

    // ============ DISCONNECT ============
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('users:online', { count: onlineUsers.size, users: Array.from(onlineUsers.values()) });
      logger.info(`User disconnected: ${userName} (${userId})`);
    });
  });

  // Periodic bot/server stats emission
  setInterval(async () => {
    try {
      const bots = await prisma.bot.findMany({ where: { status: 'RUNNING' }, select: { id: true, userId: true } });
      for (const bot of bots) {
        // Simulate live stats
        const stats = { botId: bot.id, cpu: Math.random() * 50, ram: Math.random() * 400 + 100, timestamp: Date.now() };
        io.to(`bot:${bot.id}`).emit('bot:stats', stats);
        io.to(`user:${bot.userId}`).emit('bot:stats', stats);
      }
    } catch {}
  }, 10000); // every 10 seconds

  // Coin deduction cron - every hour check active bots/servers
  setInterval(async () => {
    try {
      const runningBots = await prisma.bot.findMany({ where: { status: 'RUNNING' }, select: { id: true, userId: true, coinsPerDay: true } });
      for (const bot of runningBots) {
        const coinsPerHour = Math.ceil(bot.coinsPerDay / 24);
        const user = await prisma.user.findUnique({ where: { id: bot.userId }, select: { coins: true } });
        if (!user || user.coins < coinsPerHour) {
          await prisma.bot.update({ where: { id: bot.id }, data: { status: 'STOPPED' } });
          io.to(`user:${bot.userId}`).emit('bot:stopped', { botId: bot.id, reason: 'insufficient_coins' });
          await prisma.notification.create({
            data: { userId: bot.userId, title: 'Bot arrêté', message: 'Votre bot a été arrêté par manque de coins.', type: 'WARNING' }
          });
        } else {
          await prisma.user.update({ where: { id: bot.userId }, data: { coins: { decrement: coinsPerHour } } });
        }
      }

      const onlineServers = await prisma.server.findMany({ where: { status: 'ONLINE' }, select: { id: true, userId: true, coinsPerDay: true } });
      for (const server of onlineServers) {
        const coinsPerHour = Math.ceil(server.coinsPerDay / 24);
        const user = await prisma.user.findUnique({ where: { id: server.userId }, select: { coins: true } });
        if (!user || user.coins < coinsPerHour) {
          await prisma.server.update({ where: { id: server.id }, data: { status: 'OFFLINE' } });
          io.to(`user:${server.userId}`).emit('server:stopped', { serverId: server.id, reason: 'insufficient_coins' });
        } else {
          await prisma.user.update({ where: { id: server.userId }, data: { coins: { decrement: coinsPerHour } } });
        }
      }
    } catch (err) {
      logger.error('Cron error:', err);
    }
  }, 60 * 60 * 1000); // every hour

  logger.info('WebSocket server initialized');
}

// Helper to send notification via socket + push
export async function sendNotification(io: Server, userId: string, notification: { title: string; message: string; type?: string; link?: string }) {
  try {
    const notif = await prisma.notification.create({
      data: { userId, title: notification.title, message: notification.message, type: (notification.type || 'INFO') as any, link: notification.link },
    });
    io.to(`user:${userId}`).emit('notification:new', notif);
    // Fire-and-forget push notification
    sendPushToUser(userId, {
      title: notification.title,
      body: notification.message,
      url: notification.link || '/dashboard',
    }).catch(() => {});
  } catch {}
}

// Helper to broadcast to all admins
export function broadcastToAdmins(io: Server, event: string, data: any) {
  io.emit(`admin:${event}`, data);
}
