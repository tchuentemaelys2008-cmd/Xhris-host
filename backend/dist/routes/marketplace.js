"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.get('/bots', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const platform = req.query.platform;
        const search = req.query.search;
        const sort = req.query.sort || 'downloads';
        const where = { status: 'PUBLISHED' };
        if (platform)
            where.platform = platform.toUpperCase();
        if (search)
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        const orderBy = sort === 'rating' ? { rating: 'desc' } : sort === 'newest' ? { createdAt: 'desc' } : { downloads: 'desc' };
        const [bots, total, activeDevelopers] = await Promise.all([
            prisma_1.prisma.marketplaceBot.findMany({
                where, orderBy, skip: (page - 1) * limit, take: limit,
                include: { developer: { select: { displayName: true, verified: true } } },
            }),
            prisma_1.prisma.marketplaceBot.count({ where }),
            prisma_1.prisma.developerProfile.count({ where: { bots: { some: { status: 'PUBLISHED' } } } }),
        ]);
        res.json({
            success: true,
            data: {
                bots,
                stats: {
                    totalBots: total,
                    totalDeploys: bots.reduce((sum, bot) => sum + (bot.downloads || 0), 0),
                    activeDevelopers,
                },
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            },
        });
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/bots/:id', async (req, res) => {
    try {
        const bot = await prisma_1.prisma.marketplaceBot.findUnique({
            where: { id: req.params.id },
            include: {
                developer: { select: { displayName: true, verified: true, github: true, discord: true } },
                reviews: { include: { user: { select: { name: true, avatar: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
            },
        });
        if (!bot)
            return (0, response_1.sendError)(res, 'Bot non trouvé', 404);
        (0, response_1.sendSuccess)(res, bot);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.get('/categories', async (_req, res) => {
    try {
        const categories = await prisma_1.prisma.marketplaceBot.groupBy({
            by: ['platform'],
            where: { status: 'PUBLISHED' },
            _count: { platform: true },
        });
        (0, response_1.sendSuccess)(res, categories);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
router.post('/bots/:id/reviews', auth_1.authMiddleware, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5)
            return (0, response_1.sendError)(res, 'Note invalide (1-5)', 400);
        const review = await prisma_1.prisma.botReview.upsert({
            where: { botId_userId: { botId: req.params.id, userId: req.user.id } },
            create: { botId: req.params.id, userId: req.user.id, rating, comment },
            update: { rating, comment },
        });
        const stats = await prisma_1.prisma.botReview.aggregate({ where: { botId: req.params.id }, _avg: { rating: true }, _count: true });
        await prisma_1.prisma.marketplaceBot.update({
            where: { id: req.params.id },
            data: { rating: stats._avg.rating || 0, reviewCount: stats._count },
        });
        (0, response_1.sendSuccess)(res, review, 'Avis soumis', 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, 'Erreur', 500);
    }
});
exports.default = router;
