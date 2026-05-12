'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, Server, Bot, Coins, DollarSign, TrendingUp,
  Crown, Download, Bell, CheckCircle, AlertTriangle,
  Activity, Monitor, Database, Cpu, Globe, CreditCard,
  UserPlus, ServerCrash, ArrowUpRight,
} from 'lucide-react';
import { adminApi } from '@/lib/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#1A1A24] border border-white/10 rounded-lg p-3 text-xs">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color || p.stroke }}>{p.name}: {p.value?.toLocaleString()}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboardPage() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getDashboardStats(),
    refetchInterval: 30000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-recent'],
    queryFn: () => adminApi.getUsers({ limit: 5, page: 1 }),
  });

  const stats = (statsData as any)?.data?.data || {};
  const recentUsers: any[] = (() => {
    const d = (usersData as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.users)) return d.users;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();

  const topStats = [
    { icon: Users, label: 'Utilisateurs', value: stats.totalUsers?.toLocaleString() || '—', sub: stats.newUsers ? `+${stats.newUsers} ce mois` : '', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { icon: Server, label: 'Serveurs actifs', value: stats.activeServers?.toLocaleString() || '—', sub: '', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { icon: Bot, label: 'Bots déployés', value: stats.deployedBots?.toLocaleString() || '—', sub: '', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { icon: Coins, label: 'Coins circulation', value: stats.coinsCirculating?.toLocaleString() || '—', sub: '', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { icon: DollarSign, label: 'Revenus totaux', value: stats.totalRevenue ? `€${Number(stats.totalRevenue).toFixed(0)}` : '—', sub: '', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            Dashboard Admin <Crown className="w-5 h-5 text-yellow-400" />
          </h1>
          <p className="text-gray-400 text-sm">Vue d'ensemble de la plateforme</p>
        </div>
        <button className="btn-primary text-xs flex items-center gap-1.5 w-fit">
          <Download className="w-3.5 h-3.5" />
          Exporter le rapport
        </button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {topStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-[#111118] border border-white/5 rounded-xl p-3 sm:p-4"
          >
            <div className={`w-8 h-8 ${stat.bg} ${stat.border} border rounded-lg flex items-center justify-center mb-2 sm:mb-3`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-xs text-gray-400 mb-1 truncate">{stat.label}</div>
            <div className="text-lg sm:text-xl font-bold text-white">{isLoading ? '...' : stat.value}</div>
            {stat.sub && (
              <div className="text-xs mt-1 text-green-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{stat.sub}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Recent users + system metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-[#111118] border border-white/5 rounded-xl p-4 sm:p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Utilisateurs récents</h3>
            <Link href="/admin/users" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
              Voir tous <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[400px]">
              <thead>
                <tr className="border-b border-white/5">
                  {['Utilisateur', 'Email', 'Plan', 'Coins', 'Statut'].map(h => (
                    <th key={h} className="pb-3 text-left text-gray-500 font-medium pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentUsers.length === 0 ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="py-3">
                        <div className="h-3 bg-white/5 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : recentUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                          {user.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-white truncate max-w-[80px]">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 truncate max-w-[120px]">{user.email}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${user.plan !== 'FREE' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500'}`}>
                        {user.plan || 'FREE'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-amber-400 font-medium">{user.coins?.toLocaleString() || 0}</td>
                    <td className="py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${user.status === 'BANNED' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                        {user.status === 'BANNED' ? 'Banni' : 'Actif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* System health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-[#111118] border border-white/5 rounded-xl p-4 sm:p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Santé du système</h3>
          <div className="space-y-3">
            {[
              { icon: Cpu, label: 'Charge CPU', value: 23, color: 'bg-blue-500' },
              { icon: Database, label: 'Mémoire', value: 42, color: 'bg-purple-500' },
              { icon: Server, label: 'Stockage', value: 67, color: 'bg-yellow-500' },
              { icon: Globe, label: 'Bande passante', value: 31, color: 'bg-green-500' },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <m.icon className="w-3.5 h-3.5" /> {m.label}
                  </span>
                  <span className="text-white font-medium">{m.value}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            {[
              { icon: CheckCircle, label: `${stats.activeServers || 0} serveurs actifs`, color: 'text-green-400' },
              { icon: AlertTriangle, label: '0 alertes en cours', color: 'text-yellow-400' },
              { icon: Users, label: `${stats.activeUsers || 0} utilisateurs actifs`, color: 'text-blue-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <s.icon className={`w-3.5 h-3.5 ${s.color} flex-shrink-0`} />
                <span className="text-gray-300">{isLoading ? '...' : s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick access */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-[#111118] border border-white/5 rounded-xl p-4 sm:p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-4">Accès rapide</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/admin/users', icon: Users, label: 'Utilisateurs', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { href: '/admin/transactions', icon: CreditCard, label: 'Transactions', color: 'text-green-400', bg: 'bg-green-500/10' },
            { href: '/admin/messages', icon: Bell, label: 'Support', color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { href: '/admin/logs', icon: Monitor, label: 'Journaux', color: 'text-orange-400', bg: 'bg-orange-500/10' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-center"
            >
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <span className="text-xs text-gray-300">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
