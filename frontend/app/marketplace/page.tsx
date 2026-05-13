'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Star, Download, Zap, Bot, Smartphone, MessageSquare, Music,
  Camera, Gift, Lock, Shield, Coins, Crown, Trophy, ArrowLeft, Filter,
  CheckCircle, Globe, Loader2, Package, BarChart3, Users, TrendingUp,
  Clock, Info,
} from 'lucide-react';
import Link from 'next/link';
import { marketplaceApi } from '@/lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { label: 'Tous', value: '' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'Discord', value: 'discord' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Web', value: 'web' },
  { label: 'Outils', value: 'tools' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Populaires' },
  { value: 'newest', label: 'Nouveautés' },
  { value: 'rating', label: 'Mieux notés' },
  { value: 'deploys', label: 'Plus déployés' },
];

const PLATFORM_ICONS: Record<string, any> = {
  whatsapp: Smartphone,
  telegram: MessageSquare,
  discord: MessageSquare,
  tiktok: Music,
  instagram: Camera,
  twitter: Globe,
  web: Globe,
};

const BADGE_COLORS: Record<string, string> = {
  POPULAIRE: 'bg-purple-600',
  'TOP DÉPLOYÉ': 'bg-blue-600',
  NOUVEAU: 'bg-green-600',
  'EN TÊTE': 'bg-red-600',
};

const FEATURES_INFO = [
  { icon: Zap, title: 'Déploiement en 1 clic', desc: 'Installez et lancez votre bot en quelques secondes.' },
  { icon: Lock, title: 'Sécurisé & Isolé', desc: 'Chaque bot tourne dans un environnement sécurisé.' },
  { icon: TrendingUp, title: 'Performances optimisées', desc: 'Infrastructure rapide et fiable 24/7.' },
  { icon: Coins, title: 'Gagnez des coins', desc: 'Les développeurs gagnent 2 coins par déploiement.' },
];

export default function MarketplacePage() {
  const { data: session } = useSession();
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', activeCategory, sort, searchQuery],
    queryFn: () => marketplaceApi.getAll({ category: activeCategory, sort, search: searchQuery }),
  });

  const _raw_bots = (data as any)?.data?.bots ?? (data as any)?.data ?? [];
  const bots: any[] = Array.isArray(_raw_bots) ? _raw_bots : [];
  const _raw_leaderboard = (data as any)?.data?.topDevelopers ?? [];
  const leaderboard: any[] = Array.isArray(_raw_leaderboard) ? _raw_leaderboard : [];
  const _raw_recentActivity = (data as any)?.data?.recentActivity ?? [];
  const recentActivity: any[] = Array.isArray(_raw_recentActivity) ? _raw_recentActivity : [];

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#0A0A0F]/90 backdrop-blur border-b border-white/5">
        <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mr-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:block">Dashboard</span>
          </Link>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-white">Marketplace</span>
          </div>
          <div className="flex-1" />
          <Link href="/developer/publications"
            className="hidden sm:flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors">
            <Bot className="w-3.5 h-3.5" /> Publier un bot
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Hero */}
        <div className="relative bg-gradient-to-r from-purple-900/40 via-[#111118] to-blue-900/20 border border-purple-500/20 rounded-2xl p-6 sm:p-8 mb-6 overflow-hidden">
          <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            <Bot className="w-32 h-32 text-purple-400" />
          </div>
          <div className="relative z-10 max-w-lg">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Des bots puissants, prêts à être déployés.</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300 mb-4">
              <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-400" /> Déployez en 1 clic</div>
              <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-yellow-400" /> Sécurisé & Performant</div>
              <div className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-amber-400" /> Gagnez des coins</div>
            </div>
            <div className="flex gap-3">
              <Link href="/developer/publications"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Publier votre bot
              </Link>
              <Link href="/developer"
                className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors">
                Comment ça marche ?
              </Link>
            </div>
          </div>
        </div>

        {/* Search + filter row */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un bot..."
              className="w-full bg-[#111118] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFilters ? 'bg-purple-600 border-purple-600 text-white' : 'bg-[#111118] border-white/5 text-gray-400 hover:text-white'}`}>
            <Filter className="w-4 h-4" />
            <span className="hidden sm:block">Filtres</span>
          </button>
        </div>

        {/* Category + sort bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex gap-2 flex-wrap flex-1">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setActiveCategory(c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === c.value ? 'bg-purple-600 text-white' : 'bg-[#111118] border border-white/5 text-gray-400 hover:text-white'}`}>
                {c.label}
              </button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="bg-[#111118] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none flex-shrink-0">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Bot grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : bots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Bot className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-sm">Aucun bot disponible pour le moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {bots.map((bot: any, i: number) => {
                  const PIcon = PLATFORM_ICONS[bot.platform?.toLowerCase()] || Bot;
                  const badgeColor = bot.badge ? (BADGE_COLORS[bot.badge] || 'bg-gray-600') : '';
                  return (
                    <motion.div key={bot.id || bot.slug || i}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/20 transition-all group">
                      {bot.badge && (
                        <div className={`${badgeColor} text-white text-[10px] font-bold px-3 py-1 text-center`}>{bot.badge}</div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-center mb-3">
                          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                            <PIcon className="w-7 h-7 text-purple-400" />
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-1.5">
                          <span className="font-semibold text-white text-sm truncate max-w-[140px]">{bot.name}</span>
                          {bot.version && <span className="badge bg-purple-500/20 text-purple-400 text-[10px] flex-shrink-0">{bot.version}</span>}
                        </div>
                        <p className="text-xs text-gray-400 text-center mb-3 line-clamp-2">{bot.description || bot.desc}</p>
                        <div className="flex flex-wrap gap-1 justify-center mb-3">
                          {(bot.tags || []).slice(0, 3).map((t: string) => (
                            <span key={t} className="badge bg-white/5 text-gray-400 text-[10px]">{t}</span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-white">{bot.rating ?? '—'}</span>
                            <span>({bot.reviews ?? 0})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            <span>{bot.downloads ?? 0}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 text-center mb-3">Déployé {bot.deploys ?? 0} fois</div>
                        <Link href={`/marketplace/bot/${bot.slug || bot.id}`}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 group-hover:bg-purple-500">
                          <Zap className="w-3.5 h-3.5" /> Déployer
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
              {FEATURES_INFO.map(f => (
                <div key={f.title} className="bg-[#111118] border border-white/5 rounded-xl p-4 flex gap-3 items-start">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white mb-0.5">{f.title}</div>
                    <div className="text-xs text-gray-400">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats bar */}
            <div className="bg-[#111118] border border-white/5 rounded-xl p-4 mt-4 flex flex-wrap gap-6 items-center justify-between">
              <div className="text-sm text-gray-400">Vous ne trouvez pas ce que vous cherchez ?</div>
              <div className="flex flex-wrap gap-6">
                {[
                  { v: (data as any)?.data?.stats?.totalBots ?? '—', l: 'Bots disponibles' },
                  { v: (data as any)?.data?.stats?.totalDeploys ?? '—', l: 'Déploiements' },
                  { v: (data as any)?.data?.stats?.activeDevelopers ?? '—', l: 'Développeurs actifs' },
                  { v: '99.9%', l: 'Uptime' },
                ].map(s => (
                  <div key={s.l} className="text-center">
                    <div className="text-base font-bold text-white">{s.v}</div>
                    <div className="text-xs text-gray-500">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Developer reward info */}
            <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
              <div className="text-sm font-semibold text-purple-400 mb-3">Soutenez les développeurs</div>
              <p className="text-xs text-gray-400 mb-3">Déployez ou téléchargez un bot et récompensez son créateur.</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-green-400">+2 Coins</div>
                    <div className="text-xs text-gray-500">Par déploiement</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-400">+1 Coin</div>
                    <div className="text-xs text-gray-500">Par téléchargement ZIP</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top developers */}
            <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> Top Développeurs
                </h3>
                <Link href="/developer/leaderboard" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Voir tout</Link>
              </div>
              {leaderboard.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-3">Aucun développeur classé</div>
              ) : (
                leaderboard.slice(0, 5).map((d: any, i: number) => (
                  <div key={d.id || i} className="flex items-center gap-2.5 mb-3 last:mb-0">
                    <span className="text-xs text-gray-500 w-4 flex-shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {(d.name || d.developer || '?')[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{d.name || d.developer}</div>
                      <div className="text-xs text-gray-500 truncate">{d.deploys ?? 0} déploiements</div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold flex-shrink-0">
                      <Coins className="w-3 h-3" />{(d.coins || 0).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent activity */}
            <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Activité récente
              </h3>
              {recentActivity.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-3">Aucune activité récente</div>
              ) : (
                recentActivity.slice(0, 4).map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 mb-3 last:mb-0">
                    <div className="w-7 h-7 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{a.bot || a.name}</div>
                      <div className="text-xs text-gray-500 truncate">{a.action}</div>
                      <div className="text-xs text-gray-600">{a.time}</div>
                    </div>
                    <span className="text-xs font-bold text-green-400 flex-shrink-0">{a.coins}</span>
                  </div>
                ))
              )}
            </div>

            {/* Dev program CTA */}
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/15 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-400">Dev Program</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">Plus vous créez, plus vous gagnez des Coins !</p>
              <Link href="/developer"
                className="block w-full text-center bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs py-2 rounded-lg hover:bg-yellow-500/30 transition-colors">
                En savoir plus
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
