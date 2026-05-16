"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.premiumMiddleware = exports.adminMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const response_1 = require("../utils/response");
const prisma_1 = require("../utils/prisma");
const authMiddleware = async (req, res, next) => {
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    const authHeader = req.headers.authorization || (queryToken ? `Bearer ${queryToken}` : undefined);
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        try {
            const keyRecord = await prisma_1.prisma.apiKey.findFirst({
                where: { key: apiKey, status: 'ACTIVE' },
                include: { user: { select: { id: true, email: true, role: true, plan: true, status: true } } },
            });
            if (!keyRecord)
                return (0, response_1.sendError)(res, 'Clé API invalide', 401);
            if (keyRecord.user.status === 'BANNED')
                return (0, response_1.sendError)(res, 'Compte suspendu', 403);
            prisma_1.prisma.apiKey.update({
                where: { id: keyRecord.id },
                data: { lastUsed: new Date(), requestCount: { increment: 1 } },
            }).catch(() => { });
            req.user = {
                id: keyRecord.user.id,
                email: keyRecord.user.email,
                role: keyRecord.user.role,
                plan: keyRecord.user.plan || 'FREE',
            };
            return next();
        }
        catch {
            return (0, response_1.sendError)(res, 'Clé API invalide', 401);
        }
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return (0, response_1.sendError)(res, 'Token d\'authentification manquant', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'xhris-secret-key');
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role, plan: decoded.plan };
        next();
    }
    catch {
        return (0, response_1.sendError)(res, 'Token invalide ou expiré', 401);
    }
};
exports.authMiddleware = authMiddleware;
const adminMiddleware = (req, res, next) => {
    if (!req.user || !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
        return (0, response_1.sendError)(res, 'Accès administrateur requis', 403);
    }
    next();
};
exports.adminMiddleware = adminMiddleware;
const premiumMiddleware = (req, res, next) => {
    if (!req.user || req.user.plan === 'FREE') {
        return (0, response_1.sendError)(res, 'Abonnement Premium requis', 403);
    }
    next();
};
exports.premiumMiddleware = premiumMiddleware;
