'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, Zap, Bot, Coins, Loader2, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { developerApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const CT = ({ active, payload, label }: any) => active && payload?.length ? (
  <div className="bg-[#1A1A24] border border-white/10 rounded-lg p-2.5 text-xs">
    <p className="text-gray-400 mb-1">{label}</p>
    {payload.map((p: any) => <p key={p.name} style={{ color: p.stroke || p.fill || p.color }}>{p.name}: {p.value}</p>)}
  </div>
) : null;

export default function StatisticsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [period, setPeriod] = useState('30J');

  const { data, isLoading } = useQuery({
    queryKey: ['dev-stats', period],
    queryFn: () => developerApi.getStats(),
    enabled: !!user,
  });

  const stats = (data as any)?.data || {};
  const _raw_chart = stats.chart ?? [];
  const chart: any[] = Array.isArray(_raw_chart) ? _raw_chart : [];
  const _raw_botStats = stats.botStats ?? [];
  const botStats: any[] = Array.isArray(_raw_botStats) ? _raw_botStats : [];

  const kpis = [
    { icon: Bot, label: 'Bots actifs', value: stats.activeBots ?? 0, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { icon: Download, label: 'Téléchargements', value: (stats.totalDownloads ?? 0).toLocaleString(), color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: Zap, label: 'Déploiements', value: (stats.totalDeploys ?? 0).toLocaleString(), color: 'text-green-400', bg: 'bg-green-500/10' },
    { icon: Coins, label: 'Coins gagnés', value: (stats.totalCoins ?? 0).toLocaleString(), color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { icon: TrendingUp, label: 'Taux de conversion', value: `${stats.conversionRate ?? 0}%`, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Statistiques</h1>
          <p className="text-gray-400 text-sm mt-1">Analysez les performances de vos bots.</p>
        </div>
        <div className="flex gap-1 bg-[#111118] border border-white/5 rounded-lg p-0.5">
          {['7J', '30J', '90J'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                period === p ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-2`}>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <div className={`text-xl font-bold ${k.color}`}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : k.value}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{k.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Downloads + deploys chart */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Téléchargements & Déploiements</h3>
          {chart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-gray-500">
              <BarChart3 className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs">Aucune donnée disponible</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CT />} />
                <Area type="monotone" dataKey="downloads" name="Téléchargements" stroke="#3B82F6" fill="url(#dlGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="deploys" name="Déploiements" stroke="#22C55E" fill="url(#depGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bot performance */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Performance par bot</h3>
          {botStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-gray-500">
              <Bot className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs">Aucune donnée disponible</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={botStats} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CT />} />
                <Bar dataKey="deploys" name="Déploiements" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Coins chart */}
      <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Évolution des revenus (Coins)</h3>
        {chart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Coins className="w-8 h-8 opacity-20 mb-2" />
            <p className="text-xs">Aucune donnée disponible</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
              <Area type="monotone" dataKey="coins" name="Coins" stroke="#F59E0B" fill="url(#coinGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
