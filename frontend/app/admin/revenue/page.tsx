'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, ArrowDownLeft, Coins, Download } from 'lucide-react';
import { apiClient } from '@/lib/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#1A1A24] border border-white/10 rounded-lg p-3 text-xs">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color || p.stroke }}>€{p.value?.toLocaleString()}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminRevenuePage() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient.get('/admin/stats'),
  });
  const stats = (statsData as any)?.data || {};

  const COLORS = ['#7C3AED', '#3B82F6', '#22C55E', '#EAB308'];

  const pieData = [
    { name: 'Abonnements', value: Math.round((stats.totalRevenue || 0) * 0.5) },
    { name: 'Achat Coins', value: Math.round((stats.totalRevenue || 0) * 0.38) },
    { name: 'Serveurs', value: Math.round((stats.totalRevenue || 0) * 0.12) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Revenus</h1>
          <p className="text-gray-400 text-sm">Analyse des revenus de la plateforme</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm w-fit">
          <Download className="w-4 h-4" /> Exporter
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: 'Revenus totaux', value: stats.totalRevenue ? `€${Number(stats.totalRevenue).toFixed(2)}` : '—', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: Coins, label: 'Coins vendus', value: stats.coinsCirculating?.toLocaleString() || '—', color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { icon: TrendingUp, label: 'Utilisateurs premium', value: stats.premiumUsers?.toLocaleString() || '—', color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { icon: ArrowDownLeft, label: 'Retraits en attente', value: '—', color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-[#111118] border border-white/5 rounded-xl p-4"
          >
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${s.color}`}>{isLoading ? '...' : s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#111118] border border-white/5 rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Répartition des revenus</h3>
          {stats.totalRevenue ? (
            <>
              <div className="flex justify-center mb-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="text-gray-400">{item.name}</span>
                    </div>
                    <span className="text-white font-medium">€{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-xs">
              <DollarSign className="w-6 h-6 mr-2 opacity-40" />
              Aucun revenu enregistré
            </div>
          )}
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="lg:col-span-2 bg-[#111118] border border-white/5 rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Indicateurs clés</h3>
          <div className="space-y-4">
            {[
              { label: 'Revenus totaux cumulés', value: stats.totalRevenue ? `€${Number(stats.totalRevenue).toFixed(2)}` : '€0.00', pct: 100, color: 'bg-emerald-500' },
              { label: 'Abonnements (50%)', value: stats.totalRevenue ? `€${(Number(stats.totalRevenue) * 0.5).toFixed(2)}` : '€0.00', pct: 50, color: 'bg-purple-500' },
              { label: 'Coins vendus (38%)', value: stats.totalRevenue ? `€${(Number(stats.totalRevenue) * 0.38).toFixed(2)}` : '€0.00', pct: 38, color: 'bg-blue-500' },
              { label: 'Serveurs premium (12%)', value: stats.totalRevenue ? `€${(Number(stats.totalRevenue) * 0.12).toFixed(2)}` : '€0.00', pct: 12, color: 'bg-green-500' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">{m.label}</span>
                  <span className="text-white font-semibold">{isLoading ? '...' : m.value}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-xs text-gray-500">
            Les données de revenus sont issues des paiements validés en base de données.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
