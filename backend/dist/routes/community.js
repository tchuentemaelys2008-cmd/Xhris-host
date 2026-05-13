"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const getUploadDir = () => {
    const dir = path_1.default.join('/tmp', 'xhris-uploads', 'community');
    try {
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
    }
    catch { }
    return dir;
};
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = getUploadDir();
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        cb(null, `${unique}${path_1.default.extname(file.originalname)}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|pdf|zip|mp4|mp3|txt|doc|docx/i;
        cb(null, allowed.test(path_1.default.extname(file.originalname)));
    },
});
const router = (0, express_1.Router)();
router.get('/channels', async (_req, res) => {
    try {
        const channels = await prisma_1.prisma.channel.findMany({ orderBy: { position: 'asc' } });
        (0, response_1.sendSuccess)(res, channels);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/channels', async (req, res) => {
    try {
        if (!['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(req.user.role))
            return (0, response_1.sendError)(res, 'Accès refusé', 403);
        const { name, description, type } = req.body;
        if (!name)
            return (0, response_1.sendError)(res, 'Nom requis', 400);
        const channel = await prisma_1.prisma.channel.create({ data: { name, description, type: type || 'TEXT' } });
        (0, response_1.sendSuccess)(res, channel, 'Salon créé', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/channels/:id/messages', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const [messages, total] = await Promise.all([
            prisma_1.prisma.message.findMany({
                where: { channelId: req.params.id },
                include: {
                    user: { select: { id: true, name: true, avatar: true, role: true, plan: true } },
                    reactions: true,
                },
                orderBy: { createdAt: 'asc' },
                skip: (page - 1) * limit, take: limit,
            }),
            prisma_1.prisma.message.count({ where: { channelId: req.params.id } }),
        ]);
        (0, response_1.sendPaginated)(res, messages, total, page, limit);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/channels/:id/messages', async (req, res) => {
    try {
        const { content, attachments } = req.body;
        if (!content?.trim())
            return (0, response_1.sendError)(res, 'Message vide', 400);
        if (content.length > 2000)
            return (0, response_1.sendError)(res, 'Message trop long (max 2000 caractères)', 400);
        const channel = await prisma_1.prisma.channel.findUnique({ where: { id: req.params.id } });
        if (!channel)
            return (0, response_1.sendError)(res, 'Salon non trouvé', 404);
        const message = await prisma_1.prisma.message.create({
            data: { channelId: req.params.id, userId: req.user.id, content, attachments: attachments || [] },
            include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
        });
        const count = await prisma_1.prisma.message.count({ where: { channelId: req.params.id } });
        if (count > 150) {
            const oldest = await prisma_1.prisma.message.findMany({
                where: { channelId: req.params.id },
                orderBy: { createdAt: 'asc' },
                take: 140,
                select: { id: true },
            });
            await prisma_1.prisma.message.deleteMany({ where: { id: { in: oldest.map((m) => m.id) } } });
        }
        (0, response_1.sendSuccess)(res, message, 'Message envoyé', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.patch('/messages/:id', async (req, res) => {
    try {
        const { content } = req.body;
        const msg = await prisma_1.prisma.message.findUnique({ where: { id: req.params.id } });
        if (!msg)
            return (0, response_1.sendError)(res, 'Message non trouvé', 404);
        if (msg.userId !== req.user.id)
            return (0, response_1.sendError)(res, 'Non autorisé', 403);
        const updated = await prisma_1.prisma.message.update({
            where: { id: msg.id },
            data: { content, edited: true, editedAt: new Date() },
        });
        (0, response_1.sendSuccess)(res, updated, 'Message modifié');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.delete('/messages/:id', async (req, res) => {
    try {
        const msg = await prisma_1.prisma.message.findUnique({ where: { id: req.params.id } });
        if (!msg)
            return (0, response_1.sendError)(res, 'Message non trouvé', 404);
        const canDelete = msg.userId === req.user.id || ['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(req.user.role);
        if (!canDelete)
            return (0, response_1.sendError)(res, 'Non autorisé', 403);
        await prisma_1.prisma.message.delete({ where: { id: msg.id } });
        (0, response_1.sendSuccess)(res, null, 'Message supprimé');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/messages/:id/reactions', async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!emoji)
            return (0, response_1.sendError)(res, 'Emoji requis', 400);
        const existing = await prisma_1.prisma.messageReaction.findUnique({
            where: { messageId_userId_emoji: { messageId: req.params.id, userId: req.user.id, emoji } },
        });
        if (existing) {
            await prisma_1.prisma.messageReaction.delete({ where: { id: existing.id } });
            return (0, response_1.sendSuccess)(res, { removed: true }, 'Réaction retirée');
        }
        const reaction = await prisma_1.prisma.messageReaction.create({
            data: { messageId: req.params.id, userId: req.user.id, emoji },
        });
        (0, response_1.sendSuccess)(res, reaction, 'Réaction ajoutée');
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.patch('/presence', async (req, res) => {
    try {
        if (!req.user?.id)
            return (0, response_1.sendSuccess)(res, null);
        await prisma_1.prisma.user.update({ where: { id: req.user.id }, data: { lastLogin: new Date() } });
        (0, response_1.sendSuccess)(res, null);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/online', async (_req, res) => {
    try {
        const recent = new Date(Date.now() - 10 * 60 * 1000);
        const users = await prisma_1.prisma.user.findMany({
            where: { lastLogin: { gte: recent } },
            select: { id: true, name: true, avatar: true, role: true, plan: true },
            take: 100,
        });
        (0, response_1.sendSuccess)(res, users);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/channels/:id/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file)
            return (0, response_1.sendError)(res, 'Aucun fichier reçu', 400);
        const channel = await prisma_1.prisma.channel.findUnique({ where: { id: req.params.id } });
        if (!channel)
            return (0, response_1.sendError)(res, 'Salon non trouvé', 404);
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
        const fileUrl = `${backendUrl}/uploads/community/${req.file.filename}`;
        const attachment = JSON.stringify({ url: fileUrl, name: req.file.originalname, size: req.file.size, type: req.file.mimetype });
        const message = await prisma_1.prisma.message.create({
            data: {
                channelId: req.params.id,
                userId: req.user.id,
                content: req.file.originalname,
                attachments: [attachment],
            },
            include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
        });
        (0, response_1.sendSuccess)(res, message, 'Fichier envoyé', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur upload', 500);
    }
});
exports.default = router;
