"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = exports.optionalAuth = exports.requireModerator = exports.requireAdmin = exports.requireRole = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const prisma_1 = require("../utils/prisma");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Token manquant' });
        }
        const token = authHeader.slice(7);
        const payload = (0, jwt_1.verifyToken)(token);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, name: true, coins: true, plan: true, status: true },
        });
        if (!user)
            return res.status(401).json({ success: false, message: 'Utilisateur non trouvé' });
        if (user.status === 'BANNED')
            return res.status(403).json({ success: false, message: 'Compte banni' });
        req.user = { id: user.id, email: user.email, role: user.role, name: user.name, coins: user.coins, plan: user.plan };
        next();
    }
    catch {
        return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
    }
};
exports.authenticate = authenticate;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ success: false, message: 'Non authentifié' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Accès refusé' });
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)('ADMIN', 'SUPERADMIN');
exports.requireModerator = (0, exports.requireRole)('MODERATOR', 'ADMIN', 'SUPERADMIN');
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer '))
            return next();
        const token = authHeader.slice(7);
        const payload = (0, jwt_1.verifyToken)(token);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, name: true, coins: true, plan: true, status: true },
        });
        if (user && user.status !== 'BANNED') {
            req.user = { id: user.id, email: user.email, role: user.role, name: user.name, coins: user.coins, plan: user.plan };
        }
    }
    catch { }
    next();
};
exports.optionalAuth = optionalAuth;
const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey)
            return res.status(401).json({ success: false, message: 'Clé API manquante' });
        const key = await prisma_1.prisma.apiKey.findUnique({
            where: { key: apiKey },
            include: { user: { select: { id: true, email: true, role: true, name: true, coins: true, plan: true, status: true } } },
        });
        if (!key || key.status !== 'ACTIVE') {
            return res.status(401).json({ success: false, message: 'Clé API invalide ou révoquée' });
        }
        if (key.user.status === 'BANNED') {
            return res.status(403).json({ success: false, message: 'Compte banni' });
        }
        await prisma_1.prisma.apiKey.update({
            where: { id: key.id },
            data: { lastUsed: new Date(), requestCount: { increment: 1 } },
        });
        req.user = key.user;
        next();
    }
    catch {
        return res.status(401).json({ success: false, message: 'Erreur d\'authentification API' });
    }
};
exports.apiKeyAuth = apiKeyAuth;
