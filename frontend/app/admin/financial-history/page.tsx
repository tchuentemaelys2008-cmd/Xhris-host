'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, Download, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function AdminFinancialHistoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-financial-history', page, search],
    queryFn: () => apiClient.get('/admin/transactions', { params: { page, limit: 20, search: search || undefined } }),
  });

  const transactions: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();
  const total = (data as any)?.data?.total || transactions.length;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Historique Financier</h1>
          <p className="text-gray-400 text-sm">Suivi complet de toutes les opérations financières</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm w-fit">
          <Download className="w-4 h-4" /> Exporter CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total opérations', value: total.toLocaleString() },
          { label: 'Entrées (+)', value: transactions.filter(t => (t.amount || 0) > 0).length.toString() },
          { label: 'Sorties (-)', value: transactions.filter(t => (t.amount || 0) < 0).length.toString() },
          { label: 'Solde net', value: `${transactions.reduce((acc, t) => acc + (t.amount || 0), 0)} Coins` },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className="text-xl font-bold text-white">{isLoading ? '...' : s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          className="input-field w-full pl-9"
          placeholder="Rechercher..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                {['ID', 'Utilisateur', 'Type', 'Montant', 'Description', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucune opération financière
                  </td>
                </tr>
              ) : transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-purple-400 font-mono">{tx.id?.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-white">{tx.user?.name || tx.userId?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-400">{tx.type}</td>
                  <td className={`px-4 py-3 font-bold ${(tx.amount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate">{tx.description}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-500">Total : {total} opérations</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white">{page} / {totalPages}</span>
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
