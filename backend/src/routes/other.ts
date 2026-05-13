import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ========== DEVELOPER ==========
export const developerRouter = Router();

developerRouter.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    let profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      profile = await prisma.developerProfile.create({ data: { userId: req.user!.id } });
    }
    sendSuccess(res, profile);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

developerRouter.patch('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, bio, website, github, twitter, discord, whatsapp, public: isPublic } = req.body;
    const profile = await prisma.developerProfile.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, displayName, bio, website, github, twitter, discord, whatsapp, public: isPublic },
      update: { displayName, bio, website, github, twitter, discord, whatsapp, public: isPublic },
    });
    sendSuccess(res, profile, 'Profil mis à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

developerRouter.get('/bots', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return sendError(res, 'Profil développeur non trouvé', 404);
    const bots = await prisma.marketplaceBot.findMany({ where: { developerId: profile.id }, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, bots);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

developerRouter.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return sendError(res, 'Profil non trouvé', 404);
    const [botsCount, totalDownloads, avgRating] = await Promise.all([
      prisma.marketplaceBot.count({ where: { developerId: profile.id, status: 'PUBLISHED' } }),
      prisma.marketplaceBot.aggregate({ where: { developerId: profile.id }, _sum: { downloads: true } }),
      prisma.marketplaceBot.aggregate({ where: { developerId: profile.id }, _avg: { rating: true } }),
    ]);
    sendSuccess(res, { botsPublished: botsCount, totalDownloads: totalDownloads._sum.downloads || 0, avgRating: avgRating._avg.rating || 0 });
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ─── Multer for bot ZIP uploads ───────────────────────────────────────────────
const botStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    const dir = '/tmp/xhris-uploads/bots';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const botUpload = multer({
  storage: botStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/zip' || file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers ZIP sont acceptés'), false);
    }
  },
});

async function notifyAdmins(title: string, message: string, link = '/admin/bots') {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(a => ({ userId: a.id, title, message, link, type: 'INFO' as any })),
      });
    }
  } catch {}
}

// POST /developer/bots — Submit bot (text)
developerRouter.post('/bots', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, platform, tags, version, githubUrl, demoUrl } = req.body;
    if (!name || !description || !platform) return sendError(res, 'Nom, description et plateforme requis', 400);

    let profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) profile = await prisma.developerProfile.create({ data: { userId: req.user!.id } });

    const bot = await prisma.marketplaceBot.create({
      data: {
        name,
        description,
        platform: platform.toUpperCase() as any,
        tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map((t: string) => t.trim()).filter(Boolean) : []),
        version: version || '1.0.0',
        githubUrl: githubUrl || null,
        demoUrl: demoUrl || null,
        status: 'PENDING',
        developerId: profile.id,
      },
    });

    await notifyAdmins('🤖 Nouveau bot en attente', `"${name}" soumis — en attente de validation`);
    sendSuccess(res, bot, 'Bot soumis pour validation', 201);
  } catch (err) { sendError(res, 'Erreur lors de la soumission', 500); }
});

// POST /developer/bots/upload — Submit bot with ZIP
developerRouter.post('/bots/upload', botUpload.single('botZip'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, platform, tags, version, githubUrl } = req.body;
    if (!name || !description || !platform) return sendError(res, 'Nom, description et plateforme requis', 400);

    let profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) profile = await prisma.developerProfile.create({ data: { userId: req.user!.id } });

    const setupFile = req.file ? `/uploads/bots/${req.file.filename}` : null;

    const bot = await prisma.marketplaceBot.create({
      data: {
        name,
        description,
        platform: platform.toUpperCase() as any,
        tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map((t: string) => t.trim()).filter(Boolean) : []),
        version: version || '1.0.0',
        githubUrl: githubUrl || null,
        setupFile,
        status: 'PENDING',
        developerId: profile.id,
      },
    });

    await notifyAdmins('📦 Nouveau bot ZIP en attente', `"${name}" (avec fichier ZIP) soumis — en attente de validation`);
    sendSuccess(res, bot, 'Bot soumis pour validation', 201);
  } catch (err) { sendError(res, 'Erreur lors de la soumission', 500); }
});

// DELETE /developer/bots/:id
developerRouter.delete('/bots/:id', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return sendError(res, 'Profil développeur non trouvé', 404);
    const bot = await prisma.marketplaceBot.findFirst({ where: { id: req.params.id, developerId: profile.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    if (bot.status === 'PUBLISHED') return sendError(res, 'Impossible de supprimer un bot publié', 400);
    if (bot.setupFile) {
      const filePath = path.join('/tmp/xhris-uploads', bot.setupFile.replace('/uploads/', ''));
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    }
    await prisma.marketplaceBot.delete({ where: { id: bot.id } });
    sendSuccess(res, null, 'Bot supprimé');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// PATCH /developer/bots/:id
developerRouter.patch('/bots/:id', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return sendError(res, 'Profil non trouvé', 404);
    const bot = await prisma.marketplaceBot.findFirst({ where: { id: req.params.id, developerId: profile.id } });
    if (!bot) return sendError(res, 'Bot non trouvé', 404);
    const allowed = ['name', 'description', 'longDescription', 'tags', 'version', 'githubUrl', 'demoUrl', 'icon'];
    const data: any = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
    const updated = await prisma.marketplaceBot.update({ where: { id: bot.id }, data });
    sendSuccess(res, updated, 'Bot mis à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// GET /developer/connector/download
developerRouter.get('/connector/download', (_req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="xhrishost-connector.js"');
  res.send(CONNECTOR_CONTENT);
});

const CONNECTOR_CONTENT = `/**
 * XHRIS HOST Connector v1.0
 * Ajoutez ce fichier à votre bot pour le rendre compatible avec XHRIS HOST.
 *
 * Usage:
 *   const xhris = require('./xhrishost-connector');
 *   // Au démarrage:
 *   xhris.onBotStart(sock, 'VOTRE_NUMERO@s.whatsapp.net');
 *   // Dans votre handler de messages:
 *   const handled = await xhris.handleCommand(sock, msg);
 *   if (handled) return;
 */

const API_BASE = process.env.XHRIS_API_URL || 'https://api.xhrishost.site/api';
let connectedUser = null;
let userApiKey = process.env.XHRIS_API_KEY || null;

async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (userApiKey) headers['x-api-key'] = userApiKey;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API_BASE + endpoint, opts);
    return res.json();
  } catch (e) {
    return { success: false, message: 'Erreur réseau' };
  }
}

async function onBotStart(sock, ownerJid) {
  if (!userApiKey) return;
  try {
    const res = await apiCall('/users/me');
    if (res.success) {
      connectedUser = res.data;
      const deployType = process.env.XHRIS_DEPLOY_TYPE || 'upload';
      await sock.sendMessage(ownerJid, { text:
        '✅ *XHRIS HOSTING Connecté !*\\n\\n' +
        '👤 Utilisateur: ' + connectedUser.name + '\\n' +
        '🤖 Bot: ' + (process.env.BOT_NAME || 'Mon Bot') + '\\n' +
        '📦 Déploiement: ' + (deployType === 'zip' ? '📁 Upload fichier' : '🚀 1-Click Deploy') + '\\n' +
        '🔑 Clé API: ' + userApiKey.slice(0, 12) + '...' + userApiKey.slice(-4) + '\\n\\n' +
        'Tapez *.host* pour accéder au menu de gestion.'
      });
    }
  } catch (e) { console.error('[XHRIS connector] onBotStart error:', e.message); }
}

async function handleCommand(sock, msg) {
  const text = msg?.message?.conversation ||
               msg?.message?.extendedTextMessage?.text || '';
  const jid = msg.key.remoteJid;

  if (text.startsWith('.xhrishost ')) {
    const key = text.split(' ')[1]?.trim();
    if (!key) { await sock.sendMessage(jid, { text: '❌ Usage: .xhrishost <votre-clé-api>' }); return true; }
    userApiKey = key;
    const res = await apiCall('/users/me');
    if (res.success) {
      connectedUser = res.data;
      await sock.sendMessage(jid, { text:
        '✅ *XHRIS HOSTING Connecté !*\\n\\n' +
        '👤 Utilisateur: ' + connectedUser.name + '\\n' +
        '🤖 Bot: ' + (process.env.BOT_NAME || 'Mon Bot') + '\\n' +
        '🔑 Clé: ' + key.slice(0, 12) + '...' + key.slice(-4) + '\\n\\n' +
        'Tapez *.host* pour le menu.'
      });
    } else {
      await sock.sendMessage(jid, { text: '❌ Clé API invalide.' });
      userApiKey = null;
    }
    return true;
  }

  if (text === '.host') {
    if (!userApiKey || !connectedUser) {
      await sock.sendMessage(jid, { text: '❌ Non connecté. Utilisez: .xhrishost <clé-api>' });
      return true;
    }
    await sock.sendMessage(jid, { text:
      '╔══════════════════════╗\\n' +
      '║  🌐 *XHRIS HOST*     ║\\n' +
      '╠══════════════════════╣\\n' +
      '║ .profil — Mon profil  ║\\n' +
      '║ .coins  — Mes coins   ║\\n' +
      '║ .serveurs — Serveurs  ║\\n' +
      '║ .bots   — Mes bots    ║\\n' +
      '║ .market — Marketplace ║\\n' +
      '║ .historique — Txns    ║\\n' +
      '║ .transfert — Coins    ║\\n' +
      '║ .acheter — Acheter    ║\\n' +
      '╚══════════════════════╝'
    });
    return true;
  }

  if (text === '.profil') {
    if (!userApiKey) return false;
    const res = await apiCall('/users/me');
    if (res.success) {
      const u = res.data;
      await sock.sendMessage(jid, { text:
        '👤 *Profil XHRIS HOST*\\n\\n' +
        '📛 Nom: ' + u.name + '\\n' +
        '📧 Email: ' + u.email + '\\n' +
        '💰 Coins: ' + u.coins + '\\n' +
        '⭐ Niveau: ' + u.level + ' (' + u.xp + ' XP)\\n' +
        '📦 Plan: ' + u.plan
      });
    }
    return true;
  }

  if (text === '.coins') {
    if (!userApiKey) return false;
    const res = await apiCall('/coins/balance');
    if (res.success) await sock.sendMessage(jid, { text: '💰 *Solde:* ' + (res.data.coins || res.data.balance) + ' coins' });
    return true;
  }

  if (text === '.serveurs') {
    if (!userApiKey) return false;
    const res = await apiCall('/servers');
    if (res.success) {
      const servers = res.data?.servers || res.data?.data || [];
      if (!servers.length) { await sock.sendMessage(jid, { text: '📡 Aucun serveur.' }); return true; }
      let txt = '📡 *Mes Serveurs*\\n\\n';
      servers.forEach((s, i) => { txt += (i+1) + '. *' + s.name + '*\\n   ' + s.status + ' | ' + s.plan + '\\n\\n'; });
      txt += 'Commandes: .start-srv <id> | .stop-srv <id>';
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text === '.bots') {
    if (!userApiKey) return false;
    const res = await apiCall('/bots');
    if (res.success) {
      const bots = res.data?.data || res.data || [];
      if (!bots.length) { await sock.sendMessage(jid, { text: '🤖 Aucun bot déployé.' }); return true; }
      let txt = '🤖 *Mes Bots*\\n\\n';
      bots.forEach((b, i) => { txt += (i+1) + '. *' + b.name + '* [' + b.status + ']\\n   ' + b.platform + '\\n\\n'; });
      txt += 'Commandes: .start-bot <id> | .stop-bot <id> | .restart-bot <id>';
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text === '.market') {
    if (!userApiKey) return false;
    const res = await apiCall('/marketplace');
    if (res.success) {
      const bots = res.data?.bots || res.data || [];
      let txt = '🏪 *Marketplace XHRIS HOST*\\n\\n';
      bots.slice(0, 8).forEach((b, i) => {
        txt += (i+1) + '. *' + b.name + '* ⭐' + b.rating + '\\n   ' + (b.description || '').slice(0, 40) + '...\\n\\n';
      });
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text === '.historique') {
    if (!userApiKey) return false;
    const res = await apiCall('/coins/transactions?limit=10');
    if (res.success) {
      const txs = res.data?.transactions || res.data?.data || [];
      let txt = '📜 *Historique (10 dernières)*\\n\\n';
      txs.forEach(t => { txt += (t.amount > 0 ? '➕' : '➖') + ' ' + Math.abs(t.amount) + ' — ' + t.description + '\\n'; });
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text.startsWith('.transfert ')) {
    if (!userApiKey) return false;
    const parts = text.split(' ');
    const recipientId = parts[1]; const amount = parseInt(parts[2]);
    if (!recipientId || !amount || amount <= 0) { await sock.sendMessage(jid, { text: '❌ Usage: .transfert <userId> <montant>' }); return true; }
    const res = await apiCall('/coins/transfer', 'POST', { recipientId, amount });
    await sock.sendMessage(jid, { text: res.success ? '✅ ' + amount + ' coins envoyés à ' + recipientId : '❌ ' + (res.message || 'Erreur') });
    return true;
  }

  if (text.startsWith('.start-bot ')) { const id = text.split(' ')[1]; const res = await apiCall('/bots/' + id + '/start', 'POST'); await sock.sendMessage(jid, { text: res.success ? '✅ Bot démarré' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.stop-bot ')) { const id = text.split(' ')[1]; const res = await apiCall('/bots/' + id + '/stop', 'POST'); await sock.sendMessage(jid, { text: res.success ? '✅ Bot arrêté' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.restart-bot ')) { const id = text.split(' ')[1]; const res = await apiCall('/bots/' + id + '/restart', 'POST'); await sock.sendMessage(jid, { text: res.success ? '✅ Bot redémarré' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.start-srv ')) { const id = text.split(' ')[1]; const res = await apiCall('/servers/' + id + '/start', 'POST'); await sock.sendMessage(jid, { text: res.success ? '✅ Serveur démarré' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.stop-srv ')) { const id = text.split(' ')[1]; const res = await apiCall('/servers/' + id + '/stop', 'POST'); await sock.sendMessage(jid, { text: res.success ? '✅ Serveur arrêté' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.delete-srv ')) { const id = text.split(' ')[1]; const res = await apiCall('/servers/' + id, 'DELETE'); await sock.sendMessage(jid, { text: res.success ? '✅ Serveur supprimé' : '❌ ' + res.message }); return true; }

  if (text === '.acheter') {
    await sock.sendMessage(jid, { text:
      '💳 *Acheter des Coins*\\n\\n' +
      'Rendez-vous sur:\\n🔗 https://xhrishost.site/dashboard/coins/buy\\n\\n' +
      'Moyens acceptés:\\n• 📱 Mobile Money (Fapshi)\\n• 💳 Carte bancaire\\n• 🏦 GeniusPay'
    });
    return true;
  }

  return false;
}

module.exports = { handleCommand, apiCall, onBotStart };
`;

// ========== API KEYS ==========
export const apiKeysRouter = Router();

apiKeysRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    // Mask keys
    const masked = keys.map(k => ({ ...k, key: k.key.slice(0, 12) + '•'.repeat(16) + k.key.slice(-6) }));
    sendSuccess(res, masked);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

apiKeysRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, permissions } = req.body;
    if (!name) return sendError(res, 'Nom requis', 400);
    const rawKey = `xhs_live_${crypto.randomBytes(20).toString('hex')}`;
    const key = await prisma.apiKey.create({
      data: { userId: req.user!.id, name, key: rawKey, permissions: permissions || ['read'] },
    });
    sendSuccess(res, { ...key }, 'Clé créée — sauvegardez-la maintenant, elle ne sera plus affichée', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

apiKeysRouter.post('/:id/revoke', async (req: AuthRequest, res: Response) => {
  try {
    const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!key) return sendError(res, 'Clé non trouvée', 404);
    await prisma.apiKey.update({ where: { id: key.id }, data: { status: 'REVOKED' } });
    sendSuccess(res, null, 'Clé révoquée');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

apiKeysRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.apiKey.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    sendSuccess(res, null, 'Clé supprimée');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ========== WEBHOOKS ==========
export const webhooksRouter = Router();

webhooksRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const webhooks = await prisma.webhook.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, webhooks);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

webhooksRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, url, events } = req.body;
    if (!name || !url || !events?.length) return sendError(res, 'Nom, URL et événements requis', 400);
    if (!url.startsWith('https://')) return sendError(res, 'URL HTTPS requise', 400);
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const webhook = await prisma.webhook.create({
      data: { userId: req.user!.id, name, url, events, secret },
    });
    sendSuccess(res, webhook, 'Webhook créé', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

webhooksRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const wh = await prisma.webhook.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!wh) return sendError(res, 'Webhook non trouvé', 404);
    const updated = await prisma.webhook.update({ where: { id: wh.id }, data: req.body });
    sendSuccess(res, updated, 'Webhook mis à jour');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

webhooksRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.webhook.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    sendSuccess(res, null, 'Webhook supprimé');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

webhooksRouter.post('/:id/test', async (req: AuthRequest, res: Response) => {
  try {
    const wh = await prisma.webhook.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!wh) return sendError(res, 'Webhook non trouvé', 404);

    const payload = { event: 'test', timestamp: new Date().toISOString(), data: { message: 'Test webhook from XHRIS HOST' } };
    const sig = crypto.createHmac('sha256', wh.secret).update(JSON.stringify(payload)).digest('hex');

    try {
      const resp = await fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XHRIS-Signature': `sha256=${sig}` },
        body: JSON.stringify(payload),
      });
      await prisma.webhook.update({ where: { id: wh.id }, data: { lastActivity: new Date(), lastStatus: `${resp.status} ${resp.statusText}` } });
      sendSuccess(res, { status: resp.status }, `Test envoyé: ${resp.status}`);
    } catch {
      sendError(res, 'Impossible de joindre l\'URL', 400);
    }
  } catch (err) { sendError(res, 'Erreur', 500); }
});

webhooksRouter.post('/secret/regenerate', async (req: AuthRequest, res: Response) => {
  try {
    const newSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    await prisma.webhook.updateMany({ where: { userId: req.user!.id }, data: { secret: newSecret } });
    sendSuccess(res, { secret: newSecret }, 'Secret régénéré');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ========== NOTIFICATIONS ==========
export const notificationsRouter = Router();

notificationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unread === 'true';

    const where: any = { userId: req.user!.id };
    if (unreadOnly) where.read = false;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit }),
      prisma.notification.count({ where }),
    ]);
    sendPaginated(res, notifications, total, page, limit);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

notificationsRouter.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { read: true } });
    sendSuccess(res, null, 'Notification lue');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

notificationsRouter.post('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    sendSuccess(res, null, 'Toutes les notifications lues');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ========== SUPPORT ==========
export const supportRouter = Router();

supportRouter.get('/articles', async (req: AuthRequest, res: Response) => {
  try {
    const { category, search } = req.query;
    const where: any = { published: true };
    if (category) where.category = category;
    if (search) where.OR = [{ title: { contains: search as string, mode: 'insensitive' } }, { content: { contains: search as string, mode: 'insensitive' } }];

    const articles = await prisma.supportArticle.findMany({ where, orderBy: { views: 'desc' }, take: 20 });
    sendSuccess(res, articles);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.get('/articles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const article = await prisma.supportArticle.findUnique({ where: { id: req.params.id } });
    if (!article) return sendError(res, 'Article non trouvé', 404);
    await prisma.supportArticle.update({ where: { id: article.id }, data: { views: { increment: 1 } } });
    sendSuccess(res, article);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.get('/faq', async (_req: AuthRequest, res: Response) => {
  try {
    const faq = await prisma.faq.findMany({ where: { active: true }, orderBy: { position: 'asc' } });
    sendSuccess(res, faq);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.post('/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const { subject, message, category, priority } = req.body;
    if (!subject || !message) return sendError(res, 'Sujet et message requis', 400);

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user!.id,
        subject,
        category,
        priority: priority?.toUpperCase() || 'MEDIUM',
        messages: { create: { senderId: req.user!.id, content: message } },
      },
      include: { messages: true },
    });
    sendSuccess(res, ticket, 'Ticket créé', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.get('/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user!.id },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
    sendSuccess(res, tickets);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.get('/tickets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) return sendError(res, 'Ticket non trouvé', 404);
    sendSuccess(res, ticket);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

supportRouter.post('/tickets/:id/reply', async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    const ticket = await prisma.supportTicket.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!ticket) return sendError(res, 'Ticket non trouvé', 404);
    if (ticket.status === 'CLOSED') return sendError(res, 'Ticket fermé', 400);

    await prisma.$transaction([
      prisma.ticketMessage.create({ data: { ticketId: ticket.id, senderId: req.user!.id, content: message } }),
      prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'WAITING', updatedAt: new Date() } }),
    ]);
    sendSuccess(res, null, 'Réponse envoyée');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// ========== PAYMENTS ==========
export const paymentsRouter = Router();

paymentsRouter.post('/initiate', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, packId } = req.body;
    if (!amount || !method) return sendError(res, 'Montant et méthode requis', 400);

    const reference = `XH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        userId: req.user!.id,
        amount,
        method: method.toUpperCase() as any,
        reference,
        packId,
        status: 'PENDING',
      },
    });

    sendSuccess(res, { payment, reference, paymentUrl: `https://pay.xhris.host/checkout/${reference}` }, 'Paiement initié');
  } catch (err) { sendError(res, 'Erreur', 500); }
});

// POST /api/payments/fapshi/initiate — Fapshi automatic payment
paymentsRouter.post('/fapshi/initiate', async (req: AuthRequest, res: Response) => {
  try {
    const { packId, coins, amount, phone } = req.body;
    if (!packId || !coins || !amount || !phone) return sendError(res, 'Paramètres manquants', 400);

    const FAPSHI_API_KEY = process.env.FAPSHI_API_KEY || '';
    const FAPSHI_API_USER = process.env.FAPSHI_API_USER || '';
    const amountXAF = Math.round(amount * 655);
    const reference = `XH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create pending payment in DB
    await prisma.payment.create({
      data: { userId: req.user!.id, amount, method: 'FAPSHI' as any, reference, packId, status: 'PENDING' },
    });

    // Call Fapshi API if credentials available
    if (FAPSHI_API_KEY && FAPSHI_API_USER) {
      const fapshiRes = await fetch('https://live.fapshi.com/initiate-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiuser': FAPSHI_API_USER,
          'apikey': FAPSHI_API_KEY,
        },
        body: JSON.stringify({
          amount: amountXAF,
          phone: phone.replace(/\s/g, '').replace(/^\+/, ''),
          message: `XHRIS Host - ${coins} Coins (${packId})`,
          externalId: reference,
          redirectUrl: `${process.env.FRONTEND_URL || 'https://xhris-host-frontend.vercel.app'}/dashboard/coins/buy?success=1`,
        }),
      });
      const fapshiData: any = await fapshiRes.json();
      if (!fapshiRes.ok) return sendError(res, fapshiData?.message || 'Erreur Fapshi', 400);
      sendSuccess(res, { reference, link: fapshiData?.link }, 'Paiement Fapshi initié');
    } else {
      // No API key — return a placeholder response
      sendSuccess(res, { reference, link: null }, 'Paiement en attente de configuration Fapshi');
    }
  } catch (err) { sendError(res, 'Erreur lors de l\'initiation Fapshi', 500); }
});

// POST /api/payments/geniuspay/initiate — GeniusPay checkout
paymentsRouter.post('/geniuspay/initiate', async (req: AuthRequest, res: Response) => {
  try {
    const { packId, coins, amount, currency = 'XOF', description, successUrl, errorUrl } = req.body;
    if (!packId || !coins || !amount) return sendError(res, 'Paramètres manquants', 400);

    const GP_PUBLIC_KEY = process.env.GENIUSPAY_PUBLIC_KEY || '';
    const GP_SECRET_KEY = process.env.GENIUSPAY_SECRET_KEY || '';
    const reference = `XH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    await prisma.payment.create({
      data: { userId: req.user!.id, amount, method: 'GENIUSPAY' as any, reference, packId, status: 'PENDING' },
    });

    if (GP_PUBLIC_KEY && GP_SECRET_KEY) {
      const gpRes = await fetch('https://pay.genius.ci/api/v1/merchant/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': GP_PUBLIC_KEY,
          'X-API-Secret': GP_SECRET_KEY,
        },
        body: JSON.stringify({
          amount,
          currency,
          description: description || `XHRIS Host - ${coins} Coins (${packId})`,
          customer: { email: req.user!.email },
          metadata: { order_id: reference, pack_id: packId, coins, user_id: req.user!.id },
          success_url: successUrl || `${process.env.FRONTEND_URL}/dashboard/coins/buy?success=1&ref=${reference}`,
          error_url: errorUrl || `${process.env.FRONTEND_URL}/dashboard/coins/buy?error=1&ref=${reference}`,
        }),
      });
      const gpData: any = await gpRes.json();
      if (!gpRes.ok) return sendError(res, gpData?.error?.message || 'Erreur GeniusPay', 400);

      sendSuccess(res, {
        reference,
        checkoutUrl: gpData.data?.checkout_url,
        paymentUrl: gpData.data?.payment_url,
        gpReference: gpData.data?.reference,
      }, 'Paiement GeniusPay initié');
    } else {
      sendSuccess(res, { reference, checkoutUrl: null }, 'GeniusPay non configuré — mode dev');
    }
  } catch (err) { sendError(res, 'Erreur GeniusPay', 500); }
});

// POST /api/payments/fapshi/webhook — NO AUTH (called by Fapshi)
paymentsRouter.post('/fapshi/webhook', async (req: any, res: Response) => {
  try {
    const { transId, status, externalId } = req.body;
    if (!externalId) return res.json({ success: true });

    const FAPSHI_API_KEY = process.env.FAPSHI_API_KEY || '';
    const FAPSHI_API_USER = process.env.FAPSHI_API_USER || '';

    let paymentStatus = status;
    if (FAPSHI_API_KEY && FAPSHI_API_USER && transId) {
      try {
        const verifyRes = await fetch(`https://live.fapshi.com/payment-status/${transId}`, {
          headers: { apiuser: FAPSHI_API_USER, apikey: FAPSHI_API_KEY },
        });
        const d: any = await verifyRes.json();
        paymentStatus = d?.status || status;
      } catch {}
    }

    const PACK_COINS: Record<string, number> = {
      'pack-100': 100, 'pack-250': 250, 'pack-500': 500, 'pack-1000': 1000, 'pack-2500': 2500,
    };

    if (paymentStatus === 'SUCCESSFUL') {
      const payment = await prisma.payment.findUnique({ where: { reference: externalId } });
      if (payment && payment.status === 'PENDING') {
        const coins = payment.packId ? (PACK_COINS[payment.packId] || 0) : 0;
        await prisma.$transaction([
          prisma.payment.update({ where: { reference: externalId }, data: { status: 'COMPLETED' } }),
          ...(coins > 0 ? [
            prisma.user.update({ where: { id: payment.userId }, data: { coins: { increment: coins } } }),
            prisma.transaction.create({
              data: {
                userId: payment.userId,
                type: 'PURCHASE' as any,
                amount: coins,
                description: `Achat ${coins} coins via Fapshi Mobile Money`,
                reference: externalId,
              },
            }),
            prisma.notification.create({
              data: {
                userId: payment.userId,
                title: '✅ Paiement confirmé',
                message: `${coins} coins ont été ajoutés à votre compte via Mobile Money`,
                type: 'PAYMENT' as any,
                link: '/dashboard/coins',
              },
            }),
          ] : []),
        ]);
      }
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
      await prisma.payment.updateMany({
        where: { reference: externalId, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
    }
    res.json({ success: true });
  } catch { res.status(500).json({ success: false }); }
});

// GET /api/payments/fapshi/verify/:reference
paymentsRouter.get('/fapshi/verify/:reference', async (req: any, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { reference: req.params.reference } });
    if (!payment) return sendError(res, 'Paiement non trouvé', 404);
    sendSuccess(res, { status: payment.status, reference: payment.reference, amount: payment.amount, packId: payment.packId });
  } catch { sendError(res, 'Erreur', 500); }
});

// POST /api/payments/geniuspay/webhook — Receive GeniusPay webhook (no auth)
paymentsRouter.post('/geniuspay/webhook', async (req: any, res: Response) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const event = req.headers['x-webhook-event'] as string;
    const webhookSecret = process.env.GENIUSPAY_WEBHOOK_SECRET || '';

    // Verify signature
    if (webhookSecret && signature && timestamp) {
      const { createHmac } = await import('crypto');
      const data = `${timestamp}.${JSON.stringify(req.body)}`;
      const expected = createHmac('sha256', webhookSecret).update(data).digest('hex');
      if (expected !== signature) {
        return res.status(401).json({ success: false, message: 'Signature invalide' });
      }
      // Replay attack protection (5 min)
      if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) {
        return res.status(400).json({ success: false, message: 'Timestamp expiré' });
      }
    }

    const payload = req.body;
    const gpRef = payload?.data?.metadata?.order_id as string | undefined;

    if (event === 'payment.success' && gpRef) {
      const payment = await prisma.payment.findUnique({ where: { reference: gpRef } });
      if (payment && payment.status === 'PENDING') {
        const coinsToCredit = Number(payload?.data?.metadata?.coins) || 0;
        await prisma.$transaction([
          prisma.payment.update({ where: { reference: gpRef }, data: { status: 'COMPLETED' } }),
          ...(coinsToCredit > 0 ? [
            prisma.user.update({ where: { id: payment.userId }, data: { coins: { increment: coinsToCredit } } }),
            prisma.transaction.create({
              data: {
                userId: payment.userId,
                type: 'PURCHASE' as any,
                amount: coinsToCredit,
                description: `Achat ${coinsToCredit} coins via GeniusPay`,
                reference: gpRef,
              },
            }),
          ] : []),
        ]);
      }
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

paymentsRouter.get('/verify/:reference', async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { reference: req.params.reference } });
    if (!payment) return sendError(res, 'Paiement non trouvé', 404);
    sendSuccess(res, payment);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

paymentsRouter.post('/withdraw', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, details } = req.body;
    if (!amount || amount < 10) return sendError(res, 'Montant minimum: €10', 400);
    if (!method) return sendError(res, 'Méthode requise', 400);

    const fees: Record<string, number> = { CARD: 0.015, PAYPAL: 0.025, CRYPTO: 0.010, BANK_TRANSFER: 0.005 };
    const fee = amount * (fees[method.toUpperCase()] || 0.015);
    const net = amount - fee;

    const withdrawal = await prisma.withdrawal.create({
      data: { userId: req.user!.id, amount, fee, net, method: method.toUpperCase() as any, details: details || {} },
    });

    sendSuccess(res, withdrawal, 'Demande de retrait soumise', 201);
  } catch (err) { sendError(res, 'Erreur', 500); }
});

paymentsRouter.get('/withdrawals', async (req: AuthRequest, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, withdrawals);
  } catch (err) { sendError(res, 'Erreur', 500); }
});
