import 'dotenv/config';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { rateLimit } from 'express-rate-limit';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { setupWebSockets } from './websockets';
import { setIO } from './utils/io-instance';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import botRoutes from './routes/bots';
import serverRoutes from './routes/servers';
import marketplaceRoutes from './routes/marketplace';
import coinsRoutes from './routes/coins';
import communityRoutes from './routes/community';
import developerRoutes from './routes/developer';
import apiKeyRoutes from './routes/apiKeys';
import webhookRoutes from './routes/webhooks';
import notificationRoutes from './routes/notifications';
import supportRoutes from './routes/support';
import paymentRoutes from './routes/payments';
import adminRoutes from './routes/admin';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://xhris-host-frontend.vercel.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
];

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

// ─── CORS MANUEL — PREMIER middleware, avant tout ────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string | undefined;

  const allowed =
    !origin ||
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
// ─────────────────────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
        cb(null, true);
      } else {
        cb(new Error('CORS not allowed'));
      }
    },
    credentials: true,
  },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join('/tmp', 'xhris-uploads')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { success: false, message: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many auth attempts' } });
app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/bots', authMiddleware, botRoutes);
app.use('/api/servers', authMiddleware, serverRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/coins', authMiddleware, coinsRoutes);
app.use('/api/community', authMiddleware, communityRoutes);

// Public developer route — no auth required (browser <a href> link, no token sent)
app.get('/api/developer/connector/download', (_req, res) => {
  const filePath = path.join(__dirname, '../public/xhrishost-connector.js');
  if (!require('fs').existsSync(filePath)) return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
  res.download(filePath, 'xhrishost-connector.js');
});

app.use('/api/developer', authMiddleware, developerRoutes);
app.use('/api/api-keys', authMiddleware, apiKeyRoutes);
app.use('/api/webhooks', authMiddleware, webhookRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/support', authMiddleware, supportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

app.use('*', (_, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

setIO(io);
setupWebSockets(io);

const PORT = parseInt(process.env.PORT || '3001');
httpServer.listen(PORT, () => {
  logger.info(`XHRIS Host Backend started on port ${PORT}`);
});

export { io };
