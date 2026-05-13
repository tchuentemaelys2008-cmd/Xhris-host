'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart2, Download, Search, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  Coins, DollarSign, CreditCard, RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

const TX_TYPES: Record<string, { label: string; color: string; icon: any }> = {
  PURCHASE:          { label: 'Achat Coins',       color: 'text-green-400',  icon: ArrowUpRight },
  TRANSFER_SENT:     { label: 'Envoi',              color: 'text-orange-400', icon: ArrowDownLeft },
  TRANSFER_RECEIVED: { label: 'Réception',          color: 'text-blue-400',   icon: ArrowUpRight },
  DAILY_BONUS:       { label: 'Bonus quotidien',    color: 'text-purple-400', icon: Coins },
  BONUS_CODE:        { label: 'Code bonus',         color: 'text-pink-400',   icon: Coins },
  ADMIN_GRANT:       { label: 'Ajout admin',        color: 'text-yellow-400', icon: TrendingUp },
  ADMIN_DEDUCT:      { label: 'Déduction admin',    color: 'text-red-400',    icon: TrendingDown },
  DEPLOY_BOT:        { label: 'Déploiement bot',    color: 'text-cyan-400',   icon: CreditCard },
  SERVER_COST:       { label: 'Coût serveur',       color: 'text-gray-400',   icon: CreditCard },
  REFERRAL:          { label: 'Parrainage',         color: 'text-emerald-400',icon: ArrowUpRight },
};

export default function AdminFinancialHistoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-financial', page, search, type],
    queryFn: () => apiClient.get('/admin/transactions', {
      params: { page, limit: 25, search: search || undefined, type: type || undefined },
    }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient.get('/admin/stats'),
  });
  const stats = (statsData as any)?.data || {};

  const transactions: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();
  const total: number = (data as any)?.data?.pagination?.total || (data as any)?.data?.total || transactions.length;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const totalPositive = transactions.filter(t => (t.amount || 0) > 0).reduce((a, t) => a + t.amount, 0);
  const totalNegative = transactions.filter(t => (t.amount || 0) < 0).reduce((a, t) => a + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Historique Financier</h1>
          <p className="text-gray-400 text-sm">Toutes les opérations coins de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
          <button className="btn-primary flex items-center gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Exporter CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BarChart2, label: 'Total opérations', value: total.toLocaleString(), color: 'text-white', bg: 'bg-white/5' },
          { icon: ArrowUpRight, label: 'Coins entrants', value: `+${totalPositive.toLocaleString()}`, color: 'text-green-400', bg: 'bg-green-500/10' },
          { icon: ArrowDownLeft, label: 'Coins sortants', value: totalNegative.toLocaleString(), color: 'text-red-400', bg: 'bg-red-500/10' },
          { icon: Coins, label: 'En circulation', value: stats.coinsCirculating?.toLocaleString() || '—', color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${s.bg} border border-white/5 rounded-xl p-4`}
          >
            <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
            <div className={`text-lg font-bold ${s.color}`}>{isLoading ? '...' : s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input-field w-full pl-9"
            placeholder="Rechercher par utilisateur ou description..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input-field sm:w-48"
          value={type}
          onChange={e => { setType(e.target.value); setPage(1); }}
        >
          <option value="">Tous les types</option>
          {Object.entries(TX_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                {['ID', 'Utilisateur', 'Type', 'Description', 'Montant', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucune opération financière trouvée
                  </td>
                </tr>
              ) : transactions.map((tx: any) => {
                const cfg = TX_TYPES[tx.type] || { label: tx.type, color: 'text-gray-400', icon: Coins };
                const Icon = cfg.icon;
                return (
                  <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-purple-400 font-mono">{tx.id?.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <div className="text-white">{tx.user?.name || '—'}</div>
                      <div className="text-gray-500 text-[10px]">{tx.user?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 ${cfg.color}`}>
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate">{tx.description || '—'}</td>
                    <td className={`px-4 py-3 font-bold ${(tx.amount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} coins
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString('fr-FR') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-500">{total} opérations au total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
