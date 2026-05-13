/**
 * XHRIS HOST Connector v1.0
 * Ajoutez ce fichier à votre bot pour le rendre compatible avec XHRIS HOST.
 *
 * Usage:
 *   const xhris = require('./xhrishost-connector');
 *   // Au démarrage du bot:
 *   await xhris.onBotStart(sock, 'VOTRE_NUMERO@s.whatsapp.net');
 *   // Dans votre handler de messages:
 *   const handled = await xhris.handleCommand(sock, msg);
 *   if (handled) return;
 */

'use strict';

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
    return { success: false, message: 'Erreur réseau: ' + e.message };
  }
}

async function onBotStart(sock, ownerJid) {
  if (!userApiKey) return;
  try {
    const res = await apiCall('/users/me');
    if (res.success) {
      connectedUser = res.data;
      const deployType = process.env.XHRIS_DEPLOY_TYPE || 'upload';
      await sock.sendMessage(ownerJid, {
        text:
          '✅ *XHRIS HOSTING Connecté !*\n\n' +
          '👤 Utilisateur: ' + connectedUser.name + '\n' +
          '🤖 Bot: ' + (process.env.BOT_NAME || 'Mon Bot') + '\n' +
          '📦 Déploiement: ' + (deployType === '1click' ? '🚀 1-Click Deploy' : '📁 Upload fichier') + '\n' +
          '🔑 Clé API: ' + userApiKey.slice(0, 12) + '...' + userApiKey.slice(-4) + '\n\n' +
          'Tapez *.host* pour accéder au menu de gestion.',
      });
    }
  } catch (e) {
    console.error('[XHRIS connector] onBotStart error:', e.message);
  }
}

async function handleCommand(sock, msg) {
  const text =
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    '';
  const jid = msg.key.remoteJid;

  if (text.startsWith('.xhrishost ')) {
    const key = text.split(' ')[1]?.trim();
    if (!key) {
      await sock.sendMessage(jid, { text: '❌ Usage: .xhrishost <votre-clé-api>' });
      return true;
    }
    userApiKey = key;
    const res = await apiCall('/users/me');
    if (res.success) {
      connectedUser = res.data;
      await sock.sendMessage(jid, {
        text:
          '✅ *XHRIS HOSTING Connecté !*\n\n' +
          '👤 Utilisateur: ' + connectedUser.name + '\n' +
          '🤖 Bot: ' + (process.env.BOT_NAME || 'Mon Bot') + '\n' +
          '🔑 Clé: ' + key.slice(0, 12) + '...' + key.slice(-4) + '\n\n' +
          'Tapez *.host* pour le menu.',
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
        '╚══════════════════════╝',
    });
    return true;
  }

  if (text === '.profil') {
    if (!userApiKey) return false;
    const res = await apiCall('/users/me');
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
    if (!userApiKey) return false;
    const res = await apiCall('/coins/balance');
    if (res.success) {
      await sock.sendMessage(jid, { text: '💰 *Solde:* ' + (res.data.coins || res.data.balance || 0) + ' coins' });
    }
    return true;
  }

  if (text === '.serveurs') {
    if (!userApiKey) return false;
    const res = await apiCall('/servers');
    if (res.success) {
      const servers = res.data?.servers || res.data?.data || [];
      if (!servers.length) {
        await sock.sendMessage(jid, { text: '📡 Aucun serveur.' });
        return true;
      }
      let txt = '📡 *Mes Serveurs*\n\n';
      servers.forEach((s, i) => {
        txt += (i + 1) + '. *' + s.name + '*\n   ' + s.status + ' | ' + s.plan + '\n\n';
      });
      txt += 'Cmds: .start-srv <id> | .stop-srv <id>';
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text === '.bots') {
    if (!userApiKey) return false;
    const res = await apiCall('/bots');
    if (res.success) {
      const bots = res.data?.data || res.data || [];
      if (!bots.length) {
        await sock.sendMessage(jid, { text: '🤖 Aucun bot déployé.' });
        return true;
      }
      let txt = '🤖 *Mes Bots*\n\n';
      bots.forEach((b, i) => {
        txt += (i + 1) + '. *' + b.name + '* [' + b.status + ']\n   ' + b.platform + '\n\n';
      });
      txt += 'Cmds: .start-bot <id> | .stop-bot <id> | .restart-bot <id>';
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text === '.market') {
    if (!userApiKey) return false;
    const res = await apiCall('/marketplace/bots');
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
    if (!userApiKey) return false;
    const res = await apiCall('/coins/transactions?limit=10');
    if (res.success) {
      const txs = res.data?.transactions || res.data?.data || [];
      let txt = '📜 *Historique (10 dernières)*\n\n';
      txs.forEach(t => {
        txt += (t.amount > 0 ? '➕' : '➖') + ' ' + Math.abs(t.amount) + ' — ' + t.description + '\n';
      });
      await sock.sendMessage(jid, { text: txt });
    }
    return true;
  }

  if (text.startsWith('.transfert ')) {
    if (!userApiKey) return false;
    const parts = text.split(' ');
    const recipientId = parts[1];
    const amount = parseInt(parts[2]);
    if (!recipientId || !amount || amount <= 0) {
      await sock.sendMessage(jid, { text: '❌ Usage: .transfert <userId> <montant>' });
      return true;
    }
    const res = await apiCall('/coins/transfer', 'POST', { recipientId, amount });
    await sock.sendMessage(jid, {
      text: res.success ? '✅ ' + amount + ' coins envoyés à ' + recipientId : '❌ ' + (res.message || 'Erreur'),
    });
    return true;
  }

  if (text.startsWith('.start-bot ')) { const id = text.split(' ')[1]; const res = await apiCall('/bots/' + id + '/start', 'POST'); await sock.sendMessage(jid, { text: res.success ? '✅ Bot démarré' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.stop-bot ')) { const id = text.split(' ')[1]; const res = await apiCall('/bots/' + id + '/stop', 'POST'); await sock.sendMessage(jid, { text: res.success ? '✅ Bot arrêté' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.restart-bot ')) { const id = text.split(' ')[1]; const res = await apiCall('/bots/' + id + '/restart', 'POST'); await sock.sendMessage(jid, { text: res.success ? '✅ Bot redémarré' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.start-srv ')) { const id = text.split(' ')[1]; const res = await apiCall('/servers/' + id + '/start', 'POST'); await sock.sendMessage(jid, { text: res.success ? '✅ Serveur démarré' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.stop-srv ')) { const id = text.split(' ')[1]; const res = await apiCall('/servers/' + id + '/stop', 'POST'); await sock.sendMessage(jid, { text: res.success ? '✅ Serveur arrêté' : '❌ ' + res.message }); return true; }
  if (text.startsWith('.delete-srv ')) { const id = text.split(' ')[1]; const res = await apiCall('/servers/' + id, 'DELETE'); await sock.sendMessage(jid, { text: res.success ? '✅ Serveur supprimé' : '❌ ' + res.message }); return true; }

  if (text === '.acheter') {
    await sock.sendMessage(jid, {
      text:
        '💳 *Acheter des Coins*\n\n' +
        'Rendez-vous sur:\n🔗 https://xhrishost.site/dashboard/coins/buy\n\n' +
        'Moyens acceptés:\n• 📱 Mobile Money (Fapshi)\n• 💳 Carte bancaire\n• 🏦 GeniusPay',
    });
    return true;
  }

  return false;
}

module.exports = { handleCommand, apiCall, onBotStart };
