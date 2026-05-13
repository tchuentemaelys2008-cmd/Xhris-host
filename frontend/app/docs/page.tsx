'use client';

import Link from 'next/link';
import { BookOpen, Code, Zap, Server, Bot, Coins, ArrowRight, ExternalLink } from 'lucide-react';

const sections = [
  {
    icon: Zap,
    title: 'Démarrage rapide',
    desc: 'Créez votre compte et déployez votre premier bot en moins de 5 minutes.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    links: ['Créer un compte', 'Premier déploiement', 'Variables d\'environnement'],
  },
  {
    icon: Bot,
    title: 'Bots WhatsApp',
    desc: 'Documentation complète pour héberger et gérer vos bots WhatsApp.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    links: ['Déployer un bot', 'Sessions WhatsApp', 'Reconnexion automatique'],
  },
  {
    icon: Server,
    title: 'Serveurs Cloud',
    desc: 'Créez et configurez vos serveurs VPS avec terminal live.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    links: ['Créer un serveur', 'Terminal SSH', 'Gestionnaire de fichiers'],
  },
  {
    icon: Coins,
    title: 'Système de Coins',
    desc: 'Comprenez comment gagner, dépenser et gérer vos coins.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    links: ['Bonus quotidien', 'Parrainage', 'Transfert de coins'],
  },
  {
    icon: Code,
    title: 'API & Webhooks',
    desc: 'Intégrez XHRIS Host dans vos propres applications.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    links: ['Authentification API', 'Endpoints disponibles', 'Webhooks'],
  },
  {
    icon: BookOpen,
    title: 'Marketplace',
    desc: 'Publiez vos bots et gagnez des coins en les partageant.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    links: ['Publier un bot', 'Programme développeur', 'Revenus & statistiques'],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">XHRIS <span className="text-purple-400">HOST</span></span>
        </Link>
        <Link href="/auth/login" className="btn-primary text-sm">Se connecter</Link>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-sm text-purple-400 mb-6">
          <BookOpen className="w-4 h-4" />
          Documentation
        </div>
        <h1 className="text-5xl font-bold text-white mb-4">Documentation XHRIS Host</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Tout ce dont vous avez besoin pour déployer, gérer et monétiser vos bots WhatsApp et serveurs cloud.
        </p>
      </div>

      {/* Sections */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((s) => (
            <div key={s.title} className={`bg-[#111118] border ${s.border} rounded-xl p-6 hover:bg-[#15151f] transition-colors`}>
              <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-4`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <h3 className="font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-gray-400 mb-4">{s.desc}</p>
              <ul className="space-y-2">
                {s.links.map((link) => (
                  <li key={link}>
                    <a href="#" className={`flex items-center gap-2 text-sm ${s.color} hover:underline`}>
                      <ArrowRight className="w-3 h-3" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-purple-600/10 border border-purple-500/20 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Prêt à commencer ?</h2>
          <p className="text-gray-400 mb-6">Créez votre compte gratuitement et déployez votre premier bot.</p>
          <Link href="/auth/register" className="btn-primary inline-flex items-center gap-2 px-8 py-3">
            <Zap className="w-4 h-4" />
            Démarrer gratuitement
          </Link>
        </div>
      </div>
    </div>
  );
}
