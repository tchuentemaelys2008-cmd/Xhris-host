'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CreditCard, Search, Filter, Download, ArrowUpRight,
  ArrowDownLeft, Coins, RefreshCw, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

const TX_TYPES: Record<string, { label: string; color: string }> = {
  PURCHASE: { label: 'Achat', color: 'text-green-400' },
  TRANSFER_SENT: { label: 'Envoi', color: 'text-orange-400' },
  TRANSFER_RECEIVED: { label: 'Réception', color: 'text-blue-400' },
  DAILY_BONUS: { label: 'Bonus quotidien', color: 'text-purple-400' },
  BONUS_CODE: { label: 'Code bonus', color: 'text-pink-400' },
  ADMIN_GRANT: { label: 'Grant admin', color: 'text-yellow-400' },
  ADMIN_DEDUCT: { label: 'Déduction admin', color: 'text-red-400' },
  DEPLOY_BOT: { label: 'Déploiement bot', color: 'text-cyan-400' },
  SERVER_COST: { label: 'Coût serveur', color: 'text-gray-400' },
};

export default function AdminTransactionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-transactions', page, search, type],
    queryFn: () => apiClient.get('/admin/transactions', { params: { page, limit: 20, search: search || undefined, type: type || undefined } }),
  });

  const transactions: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.transactions)) return d.transactions;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();
  const total = (data as any)?.data?.total || transactions.length;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Transactions</h1>
          <p className="text-gray-400 text-sm">Toutes les transactions de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
          <button className="btn-primary flex items-center gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Exporter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input-field w-full pl-9"
            placeholder="Rechercher par utilisateur ou référence..."
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
                    <Coins className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucune transaction trouvée
                  </td>
                </tr>
              ) : transactions.map((tx: any) => {
                const txType = TX_TYPES[tx.type] || { label: tx.type, color: 'text-gray-400' };
                return (
                  <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-purple-400 font-mono">{tx.id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-white">{tx.user?.name || tx.userId?.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className={`${txType.color} font-medium`}>{txType.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{tx.description}</td>
                    <td className={`px-4 py-3 font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
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
            <span className="text-xs text-gray-500">Total : {total} transactions</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
