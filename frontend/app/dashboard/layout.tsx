'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bot, Server, Share2,
  User, HelpCircle, LogOut, Menu, X, Bell,
  ChevronDown, Zap, Crown, MessageSquare, Code,
  History, Settings, Wallet, Plus,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { coinsApi, notificationsApi, userApi } from '@/lib/api';
import { SettingsProvider, useSettings } from '@/lib/settingsContext';

// ─── SVG Coin Icon ───────────────────────────────────────────────
function CoinIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" fill="url(#coinGrad)" />
      <circle cx="12" cy="12" r="8" fill="url(#coinInner)" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill="#78350f"
        fontFamily="serif"
      >
        C
      </text>
      <defs>
        <radialGradient id="coinGrad" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
        <radialGradient id="coinInner" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ─── Nav items with translation keys ─────────────────────────────
const NAV_ITEMS = [
  { href: '/dashboard',              icon: LayoutDashboard, key: 'nav.dashboard' },
  { href: '/dashboard/coins',        icon: Wallet,          key: 'nav.coins' },
  { href: '/dashboard/bots',         icon: Bot,             key: 'nav.bots' },
  { href: '/dashboard/servers',      icon: Server,          key: 'nav.servers' },
  { href: '/dashboard/coins/share',  icon: Share2,          key: 'nav.share' },
  { href: '/dashboard/community',    icon: MessageSquare,   key: 'nav.community' },
  { href: '/developer',              icon: Code,            key: 'Développeur' },
  { href: '/dashboard/history',      icon: History,         key: 'Historique' },
  { href: '/dashboard/settings',     icon: Settings,        key: 'nav.settings' },
  { href: '/dashboard/profile',      icon: User,            key: 'nav.profile' },
  { href: '/dashboard/support',      icon: HelpCircle,      key: 'nav.support' },
];

// Outer layout — just provides settings context
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <DashboardInner>{children}</DashboardInner>
    </SettingsProvider>
  );
}

// Inner layout — can use useSettings()
function DashboardInner({ children }: { children: React.ReactNode }) {
  const { t } = useSettings();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [premiumDismissed, setPremiumDismissed] = useState(false);

  const user = session?.user as any;

  // ── Détection compte fantôme (session NextAuth sans entrée en DB) ─
  useEffect(() => {
    if (!user) return;
    userApi.getProfile().catch((err: any) => {
      if (err?.response?.status === 404 || err?.response?.status === 401) {
        signOut({ callbackUrl: '/auth/login?reason=account_not_found' });
      }
    });
  }, [user?.id]);

  // ── Solde coins ────────────────────────────────────────────────
  const { data: balanceData } = useQuery({
    queryKey: ['coins-balance'],
    queryFn: () => coinsApi.getBalance(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // ── Notifications ──────────────────────────────────────────────
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ limit: 10 }),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const balance          = (balanceData as any)?.data?.coins      ?? user?.coins ?? 0;
  const coinsEarnedToday = (balanceData as any)?.data?.earnedToday ?? 0;

  // ── FIX : garantir que notifications est toujours un tableau ──
  const rawNotifs =
    (notifData as any)?.data?.notifications ??
    (notifData as any)?.data               ??
    [];
  const notifications: any[] = Array.isArray(rawNotifs) ? rawNotifs : [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex">

      {/* ── Overlay mobile ─────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className={`
        fixed left-0 top-0 bottom-0 w-64 bg-[#0D0D14] border-r border-white/5 z-50 flex flex-col
        transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">
              XHRIS <span className="text-purple-400">HOST</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0D0D14]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name || 'Utilisateur'}</div>
              <div className="text-xs text-gray-500 truncate">
                ID: #{user?.id?.slice(0, 8) || '--------'}
              </div>
            </div>
            {user?.plan && user.plan !== 'FREE' && (
              <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5">
                <Crown className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-yellow-400">{user.plan}</span>
              </div>
            )}
          </div>

          {/* Solde — avec icône SVG */}
          <div className="mt-3 bg-[#1A1A24] rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">SOLDE ACTUEL</div>
            <div className="flex items-center gap-2">
              <CoinIcon className="w-6 h-6 flex-shrink-0" />
              <div className="text-2xl font-bold text-white">{balance.toLocaleString('fr-FR')}</div>
              <span className="text-xs text-amber-400 font-medium">coins</span>
            </div>
            {coinsEarnedToday > 0 && (
              <div className="text-xs text-green-400 mt-0.5">+{coinsEarnedToday} aujourd'hui</div>
            )}
          </div>

          <Link
            href="/dashboard/coins/buy"
            className="btn-primary w-full mt-3 py-2 text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Acheter des Coins
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={isActive ? 'sidebar-item-active' : 'sidebar-item'}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{t(item.key, item.key)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Premium banner + Déconnexion */}
        <div className="p-4 border-t border-white/5 space-y-2">

          {/* Bannière Premium avec bouton X */}
          {(!user?.plan || user.plan === 'FREE') && !premiumDismissed && (
            <div className="relative bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/20 rounded-xl p-4">
              {/* Bouton fermer */}
              <button
                onClick={() => setPremiumDismissed(true)}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Passer à Premium</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">Profitez d'avantages exclusifs</p>
              <Link
                href="/dashboard/coins"
                className="w-full py-1.5 px-3 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs rounded-lg hover:bg-yellow-500/30 transition-colors flex items-center justify-center"
              >
                Voir les offres
              </Link>
            </div>
          )}

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="sidebar-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">

        {/* Top bar */}
        <header className="h-16 bg-[#0D0D14]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:flex items-center gap-2 text-sm text-gray-400">
            <span>Bienvenue,</span>
            <span className="text-purple-400 font-medium">{user?.name || 'Utilisateur'}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">

            {/* Solde compact cliquable */}
            <Link href="/dashboard/coins/buy"
              className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 hover:bg-amber-500/20 transition-colors">
              <CoinIcon className="w-4 h-4" />
              <span className="text-sm font-semibold text-amber-400">{balance.toLocaleString('fr-FR')}</span>
              <span className="text-amber-400 text-xs font-bold leading-none">+</span>
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-colors"
              >
                <Bell className="w-4 h-4 text-gray-400" />
                {unreadCount > 0 && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-12 w-80 bg-[#1A1A24] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-xs text-gray-400">{unreadCount} non lue(s)</span>
                      )}
                    </div>
                    <div className="divide-y divide-white/5 max-h-80 overflow-y-auto scrollbar-thin">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-xs text-gray-500">
                          Aucune notification
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n: any, i: number) => (
                          <div
                            key={n.id || i}
                            className="flex items-start gap-3 p-4 hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <span className="text-lg">{n.icon || '🔔'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white">{n.title || n.message}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {n.createdAt ? new Date(n.createdAt).toLocaleString('fr-FR') : ''}
                              </p>
                            </div>
                            {!n.read && (
                              <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-white hidden sm:block">{user?.name || 'Utilisateur'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-12 w-52 bg-[#1A1A24] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="text-sm font-medium text-white truncate">{user?.name}</div>
                      <div className="text-xs text-gray-400 truncate">{user?.email}</div>
                    </div>
                    {[
                      { href: '/dashboard/profile', icon: User,     key: 'nav.profile' },
                      { href: '/dashboard/settings', icon: Settings, key: 'nav.settings' },
                      { href: '/dashboard/coins',    icon: Wallet,   key: 'nav.coins' },
                      { href: '/developer',          icon: Code,     key: 'Espace Développeur' },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                        <item.icon className="w-4 h-4 text-gray-500" />
                        {t(item.key, item.key)}
                      </Link>
                    ))}
                    <div className="border-t border-white/10">
                      <button
                        onClick={() => { setProfileOpen(false); signOut({ callbackUrl: '/' }); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
