import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

const router = Router();

// GET /api/community/channels
router.get('/channels', async (_req: AuthRequest, res: Response) => {
  try {
    const channels = await prisma.channel.findMany({ orderBy: { position: 'asc' } });
    sendSuccess(res, channels);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/community/channels
router.post('/channels', async (req: AuthRequest, res: Response) => {
  try {
    if (!['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(req.user!.role)) return sendError(res, 'Accès refusé', 403);
    const { name, description, type } = req.body;
    if (!name) return sendError(res, 'Nom requis', 400);
    const channel = await prisma.channel.create({ data: { name, description, type: type || 'TEXT' } });
    sendSuccess(res, channel, 'Salon créé', 201);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/community/channels/:id/messages
router.get('/channels/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { channelId: req.params.id },
        include: {
          user: { select: { id: true, name: true, avatar: true, role: true, plan: true } },
          reactions: true,
        },
        orderBy: { createdAt: 'asc' },
        skip: (page-1)*limit, take: limit,
      }),
      prisma.message.count({ where: { channelId: req.params.id } }),
    ]);
    sendPaginated(res, messages, total, page, limit);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/community/channels/:id/messages
router.post('/channels/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { content, attachments } = req.body;
    if (!content?.trim()) return sendError(res, 'Message vide', 400);
    if (content.length > 2000) return sendError(res, 'Message trop long (max 2000 caractères)', 400);

    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    if (!channel) return sendError(res, 'Salon non trouvé', 404);

    const message = await prisma.message.create({
      data: { channelId: req.params.id, userId: req.user!.id, content, attachments: attachments || [] },
      include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
    });
    sendSuccess(res, message, 'Message envoyé', 201);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// PATCH /api/community/messages/:id
router.patch('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!msg) return sendError(res, 'Message non trouvé', 404);
    if (msg.userId !== req.user!.id) return sendError(res, 'Non autorisé', 403);

    const updated = await prisma.message.update({
      where: { id: msg.id },
      data: { content, edited: true, editedAt: new Date() },
    });
    sendSuccess(res, updated, 'Message modifié');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// DELETE /api/community/messages/:id
router.delete('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!msg) return sendError(res, 'Message non trouvé', 404);
    const canDelete = msg.userId === req.user!.id || ['ADMIN','SUPERADMIN','MODERATOR'].includes(req.user!.role);
    if (!canDelete) return sendError(res, 'Non autorisé', 403);
    await prisma.message.delete({ where: { id: msg.id } });
    sendSuccess(res, null, 'Message supprimé');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/community/messages/:id/reactions
router.post('/messages/:id/reactions', async (req: AuthRequest, res: Response) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return sendError(res, 'Emoji requis', 400);

    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId: req.params.id, userId: req.user!.id, emoji } },
    });

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
      return sendSuccess(res, { removed: true }, 'Réaction retirée');
    }

    const reaction = await prisma.messageReaction.create({
      data: { messageId: req.params.id, userId: req.user!.id, emoji },
    });
    sendSuccess(res, reaction, 'Réaction ajoutée');
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// PATCH /api/community/presence  — heartbeat, updates lastLogin to mark user as online
router.patch('/presence', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return sendSuccess(res, null);
    await prisma.user.update({ where: { id: req.user.id }, data: { lastLogin: new Date() } });
    sendSuccess(res, null);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/community/online
router.get('/online', async (_req: AuthRequest, res: Response) => {
  try {
    const recent = new Date(Date.now() - 10 * 60 * 1000); // 10 min window
    const users = await prisma.user.findMany({
      where: { lastLogin: { gte: recent } },
      select: { id: true, name: true, avatar: true, role: true, plan: true },
      take: 100,
    });
    sendSuccess(res, users);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

export default router;
