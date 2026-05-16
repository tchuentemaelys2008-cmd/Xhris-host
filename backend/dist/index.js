"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express_rate_limit_1 = require("express-rate-limit");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
const websockets_1 = require("./websockets");
const io_instance_1 = require("./utils/io-instance");
const auth_2 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const bots_1 = __importDefault(require("./routes/bots"));
const servers_1 = __importDefault(require("./routes/servers"));
const marketplace_1 = __importDefault(require("./routes/marketplace"));
const coins_1 = __importDefault(require("./routes/coins"));
const community_1 = __importDefault(require("./routes/community"));
const developer_1 = __importDefault(require("./routes/developer"));
const apiKeys_1 = __importDefault(require("./routes/apiKeys"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const support_1 = __importDefault(require("./routes/support"));
const payments_1 = __importDefault(require("./routes/payments"));
const admin_1 = __importDefault(require("./routes/admin"));
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://xhris-host-frontend.vercel.app',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
];
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = !origin ||
        ALLOWED_ORIGINS.includes(origin) ||
        (origin !== undefined && origin.endsWith('.vercel.app'));
    if (allowed && origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
});
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: (origin, cb) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
                cb(null, true);
            }
            else {
                cb(new Error('CORS not allowed'));
            }
        },
        credentials: true,
    },
});
exports.io = io;
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined', { stream: { write: (msg) => logger_1.logger.info(msg.trim()) } }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express_1.default.static(path_1.default.join('/tmp', 'xhris-uploads')));
const limiter = (0, express_rate_limit_1.rateLimit)({ windowMs: 15 * 60 * 1000, max: 200, message: { success: false, message: 'Too many requests' } });
const authLimiter = (0, express_rate_limit_1.rateLimit)({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many auth attempts' } });
app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }));
app.use('/api/auth', auth_2.default);
app.use('/api/users', auth_1.authMiddleware, users_1.default);
app.use('/api/bots', auth_1.authMiddleware, bots_1.default);
app.use('/api/servers', auth_1.authMiddleware, servers_1.default);
app.use('/api/marketplace', marketplace_1.default);
app.use('/api/coins', auth_1.authMiddleware, coins_1.default);
app.use('/api/community', auth_1.authMiddleware, community_1.default);
app.get('/api/developer/connector/download', (_req, res) => {
    const filePath = path_1.default.join(__dirname, '../public/xhrishost-connector.js');
    if (!require('fs').existsSync(filePath))
        return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    res.download(filePath, 'xhrishost-connector.js');
});
app.use('/api/developer', auth_1.authMiddleware, developer_1.default);
app.use('/api/api-keys', auth_1.authMiddleware, apiKeys_1.default);
app.use('/api/webhooks', auth_1.authMiddleware, webhooks_1.default);
app.use('/api/notifications', auth_1.authMiddleware, notifications_1.default);
app.use('/api/support', auth_1.authMiddleware, support_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/admin', auth_1.authMiddleware, admin_1.default);
app.use('*', (_, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler_1.errorHandler);
(0, io_instance_1.setIO)(io);
(0, websockets_1.setupWebSockets)(io);
const PORT = parseInt(process.env.PORT || '3001');
httpServer.listen(PORT, () => {
    logger_1.logger.info(`XHRIS Host Backend started on port ${PORT}`);
});
