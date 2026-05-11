'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Bot, Server, CreditCard, Package,
  Tag, Coins, DollarSign, ArrowDownLeft, BarChart2, Megaphone,
  FileText, HelpCircle, MessageSquare, Settings, BookOpen,
  Shield, Save, Zap, Crown, ChevronRight, Search, Bell,
  Menu, X, Home, LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const navGroups = [
  {
    label: 'GESTION',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Vue d\'ensemble' },
      { href: '/admin/users', icon: Users, label: 'Utilisateurs' },
      { href: '/admin/bots', icon: Bot, label: 'Bots' },
      { href: '/admin/servers', icon: Server, label: 'Serveurs' },
      { href: '/admin/transactions', icon: CreditCard, label: 'Transactions' },
      { href: '/admin/subscriptions', icon: Package, label: 'Abonnements' },
      { href: '/admin/promo', icon: Tag, label: 'Codes Promo' },
    ]
  },
  {
    label: 'FINANCES',
    items: [
      { href: '/admin/credits', icon: Coins, label: 'Crédits & Packs' },
      { href: '/admin/revenue', icon: DollarSign, label: 'Revenus' },
      { href: '/admin/withdrawals', icon: ArrowDownLeft, label: 'Retraits' },
      { href: '/admin/financial', icon: BarChart2, label: 'Historique financier' },
    ]
  },
  {
    label: 'CONTENU',
    items: [
      { href: '/admin/announcements', icon: Megaphone, label: 'Annonces' },
      { href: '/admin/pages', icon: FileText, label: 'Pages' },
      { href: '/admin/faq', icon: HelpCircle, label: 'FAQ' },
      { href: '/admin/messages', icon: MessageSquare, label: 'Messages' },
    ]
  },
  {
    label: 'SYSTÈME',
    items: [
      { href: '/admin/settings', icon: Settings, label: 'Paramètres' },
      { href: '/admin/logs', icon: BookOpen, label: 'Journaux' },
      { href: '/admin/security', icon: Shield, label: 'Sécurité' },
      { href: '/admin/backups', icon: Save, label: 'Sauvegardes' },
    ]
  },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 bottom-0 w-52 bg-[#0D0D14] border-r border-white/5 z-50 flex flex-col overflow-y-auto
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 flex-shrink-0">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">XHRIS HOST</div>
              <div className="text-[10px] text-purple-400">Admin Panel</div>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="text-[10px] font-semibold text-gray-600 px-3 mb-2 tracking-wider">{group.label}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom links */}
        <div className="p-3 border-t border-white/5 space-y-1 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-white/5 rounded-lg px-3 py-2">
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-white/5 rounded-lg px-3 py-2">
            <span>Voir le site</span>
            <ChevronRight className="w-3 h-3 ml-auto" />
          </Link>
        </div>
      </aside>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = user?.name || 'Admin';
  const initials = displayName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main */}
      <div className="flex-1 lg:ml-52 min-w-0">
        {/* Top bar */}
        <header className="h-14 sm:h-16 bg-[#0D0D14]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 bg-white/5 border border-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold text-white">Dashboard Admin</h2>
              <p className="text-xs text-gray-500">Vue d'ensemble de la plateforme</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search desktop */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                className="bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-48"
                placeholder="Rechercher..."
              />
            </div>
            {/* Notifications */}
            <button className="relative w-9 h-9 bg-white/5 border border-white/5 rounded-lg flex items-center justify-center">
              <Bell className="w-4 h-4 text-gray-400" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            {/* Admin user */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-2 sm:px-3 py-2">
              <div className="w-6 h-6 bg-yellow-500/20 border border-yellow-500/20 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-400">
                {initials || <Crown className="w-3.5 h-3.5" />}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-medium text-white">{displayName}</div>
                <div className="text-[10px] text-gray-500">{user?.role === 'SUPERADMIN' ? 'Super Admin' : 'Administrateur'}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-3 sm:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 px-6 py-4 text-center text-xs text-gray-600">
          © 2024 XHRIS HOST — Tous droits réservés.
        </footer>
      </div>
    </div>
  );
}
