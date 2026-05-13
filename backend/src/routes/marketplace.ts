import { Router, Response, Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

const router = Router();

// GET /api/marketplace/bots
router.get('/bots', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const platform = req.query.platform as string;
    const search = req.query.search as string;
    const sort = req.query.sort as string || 'downloads';

    const where: any = { status: 'PUBLISHED' };
    if (platform) where.platform = platform.toUpperCase();
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];

    const orderBy: any = sort === 'rating' ? { rating: 'desc' } : sort === 'newest' ? { createdAt: 'desc' } : { downloads: 'desc' };

    const [bots, total] = await Promise.all([
      prisma.marketplaceBot.findMany({
        where, orderBy, skip: (page-1)*limit, take: limit,
        include: { developer: { select: { displayName: true, verified: true } } },
      }),
      prisma.marketplaceBot.count({ where }),
    ]);

    sendPaginated(res, bots, total, page, limit);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/marketplace/bots/:id
router.get('/bots/:id', async (req: Request, res: Response) => {
  try {
    const bot = await prisma.marketplaceBot.findUnique({
      where: { id: req.params.id },
      include: {
        developer: { select: { displayName: true, verified: true, github: true, discord: true } },
        reviews: { include: { user: { select: { name: true, avatar: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    sendSuccess(res, bot);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// GET /api/marketplace/categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.marketplaceBot.groupBy({
      by: ['platform'],
      where: { status: 'PUBLISHED' },
      _count: { platform: true },
    });
    sendSuccess(res, categories);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

// POST /api/marketplace/bots/:id/reviews
router.post('/bots/:id/reviews', async (req: AuthRequest, res: Response) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return sendError(res, 'Note invalide (1-5)', 400);

    const review = await prisma.botReview.upsert({
      where: { botId_userId: { botId: req.params.id, userId: req.user!.id } },
      create: { botId: req.params.id, userId: req.user!.id, rating, comment },
      update: { rating, comment },
    });

    // Update bot average rating
    const stats = await prisma.botReview.aggregate({ where: { botId: req.params.id }, _avg: { rating: true }, _count: true });
    await prisma.marketplaceBot.update({
      where: { id: req.params.id },
      data: { rating: stats._avg.rating || 0, reviewCount: stats._count },
    });

    sendSuccess(res, review, 'Avis soumis', 201);
  } catch (err) {
    sendError(res, 'Erreur', 500);
  }
});

export default router;
