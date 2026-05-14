'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Code, BookOpen, Zap, Trophy, Gift, BarChart3, ExternalLink, CheckCircle, Bot, Coins, Download, Users } from 'lucide-react';

const resources = [
  { icon: BookOpen, title: 'Documentation API', desc: 'Tout sur l\'API XHRIS Host : endpoints, authentification, webhooks.', href: '/docs', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { icon: Code, title: 'SDK & Exemples', desc: 'Exemples de code pour déployer et gérer des bots programmatiquement.', href: '/docs', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { icon: Zap, title: 'Webhooks', desc: 'Recevez des notifications en temps réel sur les événements de votre compte.', href: '/developer/publications', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
];

const steps = [
  { n: 1, title: 'Créer votre bot', desc: 'Développez un bot WhatsApp, Discord ou Telegram.' },
  { n: 2, title: 'Publier sur le Marketplace', desc: 'Soumettez votre bot pour validation et publication.' },
  { n: 3, title: 'Gagner des Coins', desc: 'Recevez des coins à chaque déploiement de votre bot.' },
  { n: 4, title: 'Retirer vos gains', desc: 'Convertissez vos coins en argent réel.' },
];

export default function DeveloperHubPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Developer Hub</h1>
        <p className="text-gray-400 text-sm mt-1">Tous les outils pour créer, publier et monétiser vos bots.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Développeurs actifs', value: '1,248', Icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Bots publiés', value: '324', Icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Coins distribués', value: '48.2K', Icon: Coins, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Déploiements', value: '12.4K', Icon: Zap, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-[#111118] border border-white/5 rounded-xl p-4 text-center">
            <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}>
              <stat.Icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-6">Comment gagner des coins ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={step.n} className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {step.n}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block flex-1 h-px bg-purple-600/30" />
                )}
              </div>
              <div className="text-sm font-medium text-white mb-1">{step.title}</div>
              <div className="text-xs text-gray-400">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* XHRIS Connector */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-purple-400" />
              XHRIS HOST Connector
            </h2>
            <p className="text-sm text-gray-400">
              Ajoutez ce fichier à votre bot WhatsApp pour le rendre compatible avec XHRIS HOST.
              Il permet aux utilisateurs de gérer leur compte directement depuis WhatsApp
              (profil, coins, bots, serveurs) via des commandes simples.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-purple-500/10 text-purple-300 px-2 py-1 rounded-md">Auth par code de vérification</span>
              <span className="text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded-md">Commandes .host .profil .coins</span>
              <span className="text-xs bg-green-500/10 text-green-300 px-2 py-1 rounded-md">Gestion bots et serveurs</span>
            </div>
          </div>
          <a
            href="/api/developer/connector/download"
            download="xhrishost-connector.js"
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Télécharger le Connector
          </a>
        </div>
        <div className="mt-4 bg-black/30 rounded-lg p-4">
          <p className="text-xs text-gray-400 font-medium mb-2">Utilisation rapide :</p>
          <pre className="text-xs text-gray-300 overflow-x-auto"><code>{`const xhris = require('./xhrishost-connector');

// Au démarrage du bot :
await xhris.onBotStart(sock, 'VOTRE_NUMERO@s.whatsapp.net');

// Dans le handler de messages :
const handled = await xhris.handleCommand(sock, msg);
if (handled) return; // Commande XHRIS traitée`}</code></pre>
        </div>
      </div>

      {/* Resources */}
      <div>
        <h2 className="font-semibold text-white mb-4">Ressources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map((r) => (
            <Link key={r.title} href={r.href}
              className={`bg-[#111118] border ${r.border} rounded-xl p-5 hover:bg-[#15151f] transition-colors group`}>
              <div className={`w-10 h-10 ${r.bg} rounded-lg flex items-center justify-center mb-3`}>
                <r.icon className={`w-5 h-5 ${r.color}`} />
              </div>
              <h3 className="font-medium text-white mb-1 flex items-center gap-1">
                {r.title}
                <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors" />
              </h3>
              <p className="text-xs text-gray-400">{r.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/10 border border-purple-500/20 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-white mb-1">Prêt à publier votre bot ?</h2>
            <p className="text-sm text-gray-400">Commencez à gagner des coins dès aujourd&apos;hui.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/developer/publications" className="btn-primary flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4" /> Publier un bot
            </Link>
            <Link href="/developer/statistics" className="btn-secondary flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4" /> Mes stats
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          {['Programme développeur certifié', 'Coins par déploiement', 'Dashboard analytics', 'Support prioritaire'].map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-gray-300">
              <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
