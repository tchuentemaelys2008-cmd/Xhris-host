'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { developerApi } from '@/lib/api';
import {
  LayoutDashboard, Bot, Server, Store, Rocket, Wallet,
  Code, BookOpen, BarChart3, Trophy, Gift, Users, Star,
  Settings, HelpCircle, LogOut, Bell, Crown, ChevronDown,
  Zap, Menu, X, Coins, Download,
} from 'lucide-react';

const navSections = [
  {
    label: 'MENU PRINCIPAL',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/bots', icon: Bot, label: 'Mes Bots' },
      { href: '/dashboard/servers', icon: Server, label: 'Mes Serveurs' },
      { href: '/marketplace', icon: Store, label: 'Marketplace' },
      { href: '/developer/deploy', icon: Rocket, label: 'Déployer un Bot' },
      { href: '/developer/wallet', icon: Wallet, label: 'Wallet & Transactions' },
    ]
  },
  {
    label: 'DÉVELOPPEUR',
    items: [
      { href: '/developer/hub', icon: Code, label: 'Developer Hub' },
      { href: '/developer/publications', icon: BookOpen, label: 'Mes Publications' },
      { href: '/developer/statistics', icon: BarChart3, label: 'Statistiques' },
      { href: '/developer/leaderboard', icon: Trophy, label: 'Classement' },
      { href: '/developer/earnings', icon: Gift, label: 'Gains & Récompenses' },
      { href: '/xhrishost-connector.js', icon: Download, label: 'Connector JS', download: true },
    ]
  },
  {
    label: 'COMMUNAUTÉ',
    items: [
      { href: '/dashboard/community', icon: Users, label: 'Communauté' },
      { href: '/developer/leaderboard', icon: Star, label: 'Classements' },
      { href: '/developer/referral', icon: Gift, label: 'Parrainage', badge: 'Nouveau' },
    ]
  },
  {
    label: 'PARAMÈTRES',
    items: [
      { href: '/dashboard/settings', icon: Settings, label: 'Paramètres' },
      { href: '/dashboard/support', icon: HelpCircle, label: 'Support' },
    ]
  },
];

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: pubData } = useQuery({
    queryKey: ['dev-publications'],
    queryFn: () => developerApi.getPublications(),
    enabled: !!user,
  });
  const _rawPubs = (pubData as any)?.data?.bots ?? (pubData as any)?.data;
  const publications: any[] = Array.isArray(_rawPubs) ? _rawPubs : [];
  const hasApproved = publications.some((p: any) => p.status === 'PUBLISHED' || p.status === 'APPROVED');

  // If on a specific sub-page and no approved bot, redirect to /developer
  const isSubPage = pathname !== '/developer' && !pathname.endsWith('/developer');
  if (isSubPage && pubData !== undefined && !hasApproved) {
    router.replace('/developer');
    return null;
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-[#0D0D14] border-r border-white/5">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/5 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">XHRIS <span className="text-purple-400">HOST</span></span>
        </Link>
      </div>

      {/* User card */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
              {user?.name?.[0] || 'X'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0D0D14]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{user?.name || 'XhrisDev'}</div>
            <div className="badge bg-purple-500/20 text-purple-400 text-xs">Développeur</div>
          </div>
        </div>
        <Link href="/dashboard/coins/buy"
          className="mt-2 flex items-center justify-between bg-[#1A1A24] rounded-lg p-3 hover:bg-[#22223a] transition-colors">
          <div>
            <div className="text-xs text-gray-400 mb-1">SOLDE ACTUEL</div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <div className="text-xl font-bold text-white">{user?.coins?.toLocaleString('fr-FR') ?? 0}</div>
              <span className="text-amber-400 text-xs font-bold">+</span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500 -rotate-90" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 scrollbar-thin">
        {navSections.map(section => (
          <div key={section.label}>
            <div className="text-[10px] font-semibold text-gray-600 px-3 mb-2 tracking-wider">{section.label}</div>
            <div className="space-y-0.5">
              {section.items.map(item => {
                if ((item as any).download) {
                  return (
                    <a key={item.href} href={item.href} download="xhrishost-connector.js"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </a>
                  );
                }
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-all ${isActive ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {(item as any).badge && (
                      <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{(item as any).badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 w-full transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 z-50 flex-col">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              className="fixed left-0 top-0 bottom-0 w-56 z-50 lg:hidden flex flex-col">
              <Sidebar />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 bg-[#0D0D14]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 flex items-center justify-between px-6">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 ml-auto">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                <Bell className="w-4 h-4 text-gray-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">12</div>
              </button>
            </div>

            {/* User */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {user?.name?.[0] || 'X'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-medium text-white">{user?.name || 'XhrisDev'}</div>
                <div className="text-[10px] text-gray-500">Développeur</div>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 px-6 py-4">
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 justify-center">
            <span>© 2024 XHRIS HOST. Tous droits réservés.</span>
            <a href="/terms" className="hover:text-gray-400 transition-colors">Conditions d'utilisation</a>
            <a href="/privacy" className="hover:text-gray-400 transition-colors">Politique de confidentialité</a>
            <a href="/contact" className="hover:text-gray-400 transition-colors">Contact</a>
            <a href="/portfolio" className="hover:text-gray-400 transition-colors">Portfolio</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
