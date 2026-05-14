/**
 * XHRIS HOST Connector v2.0
 * Ajoutez ce fichier à votre bot pour le rendre compatible avec XHRIS HOST.
 *
 * Usage:
 *   const xhris = require('./xhrishost-connector');
 *   // Au démarrage:
 *   await xhris.onBotStart(sock, 'OWNER_JID@s.whatsapp.net');
 *   // Dans le handler de messages:
 *   const handled = await xhris.handleCommand(sock, msg);
 *   if (handled) return;
 *
 * Authentification par JID — chaque utilisateur WhatsApp a sa propre session.
 * Aucune clé API n'est partagée dans les messages.
 */

'use strict';

const API_BASE = process.env.XHRIS_API_URL || 'https://api.xhrishost.site/api';

// Per-JID session store: { [jid]: { apiKey, user, connectedAt } }
const sessions = new Map();

// Pending verification: { [jid]: requestId }
const awaitingCode = new Map();

function getSession(jid) {
  return sessions.get(jid) || null;
}

async function apiCall(endpoint, method = 'GET', body = null, apiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API_BASE + endpoint, opts);
    return res.json();
  } catch (e) {
    return { success: false, message: 'Erreur réseau: ' + e.message };
  }
}

async function onBotStart(sock, ownerJid) {
  // If env key present (server-deployed bot), use it for owner JID automatically
  const envKey = process.env.XHRIS_API_KEY || null;
  if (envKey && ownerJid) {
    const res = await apiCall('/users/me', 'GET', null, envKey);
    if (res.success) {
      sessions.set(ownerJid, { apiKey: envKey, user: res.data, connectedAt: new Date() });
      const deployType = process.env.XHRIS_DEPLOY_TYPE || 'upload';
      await sock.sendMessage(ownerJid, {
        text:
          '✅ *XHRIS HOSTING Connecté !*\n\n' +
          '👤 Utilisateur: ' + res.data.name + '\n' +
          '🤖 Bot: ' + (process.env.BOT_NAME || 'Mon Bot') + '\n' +
          '📦 Mode: ' + (deployType === '1click' ? '🚀 1-Click Deploy' : '📁 Upload') + '\n\n' +
          'Tapez *.host* pour le menu.',
      });
    }
  } else {
    console.log('[XHRIS HOST] Aucune clé env — les utilisateurs doivent s\'authentifier via .xhrishost');
  }
}

async function handleCommand(sock, msg) {
  const text =
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    '';
  const jid = msg.key.remoteJid;
  const session = getSession(jid);

  // ── Vérification du code (état en attente) ──────────────────────────────────
  if (awaitingCode.has(jid) && /^\d{6}$/.test(text.trim())) {
    const requestId = awaitingCode.get(jid);
    const code = text.trim();
    awaitingCode.delete(jid);

    await sock.sendMessage(jid, { text: '🔄 Vérification en cours...' });
    const res = await apiCall('/auth/whatsapp/verify', 'POST', { requestId, code, whatsappJid: jid });

    if (res.success) {
      const { apiKey, user } = res.data;
      sessions.set(jid, { apiKey, user, connectedAt: new Date() });
      await sock.sendMessage(jid, {
        text:
          '✅ *Connexion réussie !*\n\n' +
          '👤 ' + user.name + '\n' +
          '💰 ' + user.coins + ' coins\n' +
          '📦 Plan: ' + user.plan + '\n\n' +
          'Tapez *.host* pour le menu complet.',
      });
    } else {
      await sock.sendMessage(jid, {
        text: '❌ ' + (res.message || 'Code incorrect ou expiré') + '\n\nTapez *.xhrishost* pour recommencer.',
      });
    }
    return true;
  }

  // ── .xhrishost — Démarrer l'authentification ─────────────────────────────
  if (text.trim() === '.xhrishost') {
    if (session) {
      await sock.sendMessage(jid, {
        text:
          '✅ Déjà connecté en tant que *' + session.user.name + '*\n' +
          'Tapez *.host* pour le menu ou *.deconnexion* pour vous déconnecter.',
      });
      return true;
    }

    await sock.sendMessage(jid, { text: '🔄 Génération du code de vérification...' });
    const res = await apiCall('/auth/whatsapp/request', 'POST', { whatsappJid: jid });

    if (!res.success) {
      await sock.sendMessage(jid, { text: '❌ ' + (res.message || 'Erreur') });
      return true;
    }

    awaitingCode.set(jid, res.data.requestId);

    // Auto-cleanup after 3 minutes (code expiry)
    var capturedRequestId = res.data.requestId;
    setTimeout(function() {
      if (awaitingCode.get(jid) === capturedRequestId) {
        awaitingCode.delete(jid);
      }
    }, 3 * 60 * 1000);

    await sock.sendMessage(jid, {
      text:
        '🔐 *Authentification XHRIS HOST*\n\n' +
        '1️⃣ Ouvrez ce lien dans votre navigateur:\n' +
        '🔗 ' + res.data.verifyLink + '\n\n' +
        '2️⃣ Connectez-vous à votre compte\n' +
        '3️⃣ Copiez le code à 6 chiffres affiché\n' +
        '4️⃣ Envoyez-le ici dans ce chat\n\n' +
        '⏱️ Le code expire dans 3 minutes.',
    });
    return true;
  }

  // ── .deconnexion ─────────────────────────────────────────────────────────
  if (text === '.deconnexion') {
    sessions.delete(jid);
    await sock.sendMessage(jid, { text: '👋 Déconnecté. Tapez *.xhrishost* pour vous reconnecter.' });
    return true;
  }

  // ── .host ─────────────────────────────────────────────────────────────────
  if (text === '.host') {
    if (!session) {
      await sock.sendMessage(jid, { text: '🔒 Non connecté. Tapez *.xhrishost* pour vous authentifier.' });
      return true;
    }
    await sock.sendMessage(jid, {
      text:
        '╔══════════════════════╗\n' +
        '║  🌐 *XHRIS HOST*     ║\n' +
        '╠══════════════════════╣\n' +
        '║ .profil  — Profil    ║\n' +
        '║ .coins   — Solde     ║\n' +
        '║ .serveurs — Servers  ║\n' +
        '║ .bots    — Mes bots  ║\n' +
        '║ .market  — Marketplace║\n' +
        '║ .historique — Txns   ║\n' +
        '║ .transfert — Envoyer ║\n' +
        '║ .acheter  — Acheter  ║\n' +
        '║ .deconnexion — Quitter║\n' +
        '╚══════════════════════╝\n\n' +
        '👤 Connecté: ' + session.user.name,
    });
    return true;
  }

  // Commands requiring authentication
  if (!session) return false;
  const key = session.apiKey;

  if (text === '.profil') {
    const res = await apiCall('/users/me', 'GET', null, key);
    if (res.success) {
      const u = res.data;
      await sock.sendMessage(jid, {
        text:
          '👤 *Profil XHRIS HOST*\n\n' +
          '📛 Nom: ' + u.name + '\n' +
          '📧 Email: ' + u.email + '\n' +
          '💰 Coins: ' + u.coins + '\n' +
          '⭐ Niveau: ' + u.level + ' (' + u.xp + ' XP)\n' +
          '📦 Plan: ' + u.plan,
      });
    }
    return true;
  }

  if (text === '.coins') {
    const res = await apiCall('/coins/balance', 'GET', null, key);
    if (res.success) {
      await sock.sendMessage(jid, { text: '💰 *Solde:* ' + (res.data.coins || 0) + ' coins' });
    }
    return true;
  }

  if (text === '.serveurs') {
    const res = await apiCall('/servers', 'GET', null, key);
    if (res.success) {
      const servers = res.data?.servers || res.data?.data || [];
      if (!servers.length) { await sock.sendMessage(jid, { text: '📡 Aucun serveur.' }); return true; }
      let txt = '📡 *Mes Serveurs*\n\n';
      servers.forEach((s, i) => { txt += (i + 1) + '. *' + s.name + '*\n   ' + s.status + ' | ' + s.plan + '\n\n'; });
      txt += 'Cmds: .start-srv <id> | .stop-srv <id>';
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text === '.bots') {
    const res = await apiCall('/bots', 'GET', null, key);
    if (res.success) {
      const bots = res.data?.data || res.data || [];
      if (!bots.length) { await sock.sendMessage(jid, { text: '🤖 Aucun bot déployé.' }); return true; }
      let txt = '🤖 *Mes Bots*\n\n';
      bots.forEach((b, i) => { txt += (i + 1) + '. *' + b.name + '* [' + b.status + ']\n   ' + b.platform + '\n\n'; });
      txt += 'Cmds: .start-bot <id> | .stop-bot <id> | .restart-bot <id>';
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text === '.market') {
    const res = await apiCall('/marketplace/bots', 'GET', null, key);
    if (res.success) {
      const bots = res.data?.data || res.data || [];
      let txt = '🏪 *Marketplace XHRIS HOST*\n\n';
      bots.slice(0, 8).forEach((b, i) => {
        txt += (i + 1) + '. *' + b.name + '* ⭐' + b.rating + '\n   ' + (b.description || '').slice(0, 40) + '...\n\n';
      });
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text === '.historique') {
    const res = await apiCall('/coins/transactions?limit=10', 'GET', null, key);
    if (res.success) {
      const txs = res.data?.transactions || res.data?.data || [];
      let txt = '📜 *Historique (10 dernières)*\n\n';
      txs.forEach(t => { txt += (t.amount > 0 ? '➕' : '➖') + ' ' + Math.abs(t.amount) + ' — ' + t.description + '\n'; });
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text.startsWith('.transfert ')) {
    const parts = text.split(' ');
    const recipientId = parts[1];
    const amount = parseInt(parts[2]);
    if (!recipientId || !amount || amount <= 0) { await sock.sendMessage(jid, { text: '❌ Usage: .transfert <userId> <montant>' }); return true; }
    const res = await apiCall('/coins/transfer', 'POST', { recipientId, amount }, key);
    await sock.sendMessage(jid, { text: res.success ? '✅ ' + amount + ' coins envoyés' : '❌ ' + (res.message || 'Erreur') });
    return true;
  }

  if (text === '.acheter') {
    await sock.sendMessage(jid, {
      text:
        '💳 *Acheter des Coins*\n\n' +
        'Rendez-vous sur:\n🔗 https://xhrishost.site/dashboard/coins/buy\n\n' +
        'Moyens acceptés:\n• 📱 Mobile Money (Fapshi)\n• 💳 Carte bancaire\n• 🏦 GeniusPay',
    });
    return true;
  }

  if (text.startsWith('.start-bot ')) { const id = text.split(' ')[1]; const res = await apiCall('/bots/' + id + '/start', 'POST', null, key); await sock.sendMessage(jid, { text: res.success ? '✅ Bot démarré' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.stop-bot ')) { const id = text.split(' ')[1]; const res = await apiCall('/bots/' + id + '/stop', 'POST', null, key); await sock.sendMessage(jid, { text: res.success ? '✅ Bot arrêté' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.restart-bot ')) { const id = text.split(' ')[1]; const res = await apiCall('/bots/' + id + '/restart', 'POST', null, key); await sock.sendMessage(jid, { text: res.success ? '✅ Bot redémarré' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.start-srv ')) { const id = text.split(' ')[1]; const res = await apiCall('/servers/' + id + '/start', 'POST', null, key); await sock.sendMessage(jid, { text: res.success ? '✅ Serveur démarré' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.stop-srv ')) { const id = text.split(' ')[1]; const res = await apiCall('/servers/' + id + '/stop', 'POST', null, key); await sock.sendMessage(jid, { text: res.success ? '✅ Serveur arrêté' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.delete-srv ')) { const id = text.split(' ')[1]; const res = await apiCall('/servers/' + id, 'DELETE', null, key); await sock.sendMessage(jid, { text: res.success ? '✅ Serveur supprimé' : '❌ ' + res.message }); return true; }

  return false;
}

console.log('[XHRIS HOST] ✅ Connector v2.0 chargé — Auth par JID activée');
console.log('[XHRIS HOST] Tapez .xhrishost dans WhatsApp pour démarrer l\'authentification');

module.exports = { handleCommand, apiCall, onBotStart, getSession };
