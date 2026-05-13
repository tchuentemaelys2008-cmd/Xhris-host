'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CreditCard, CheckCircle, XCircle, Clock, Loader2, Search,
  DollarSign, TrendingDown, AlertCircle, Filter
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  PROCESSING: 'En cours',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-500/10',
  APPROVED: 'text-green-400 bg-green-500/10',
  REJECTED: 'text-red-400 bg-red-500/10',
  PROCESSING: 'text-blue-400 bg-blue-500/10',
};

export default function AdminWithdrawalsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-withdrawals', statusFilter, page],
    queryFn: () => apiClient.get('/admin/withdrawals', { params: { page, limit: 20, status: statusFilter || undefined } }),
  });

  const withdrawals: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.withdrawals)) return d.withdrawals;
    return [];
  })();
  const total: number = (data as any)?.data?.total || withdrawals.length;
  const totalPages = Math.ceil(total / 20);

  const filteredWithdrawals = search
    ? withdrawals.filter(w =>
        w.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        w.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        w.id?.toLowerCase().includes(search.toLowerCase())
      )
    : withdrawals;

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/admin/withdrawals/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      toast.success('Retrait approuvé', { duration: 5000 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de l\'approbation'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/admin/withdrawals/${id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      setRejectId(null);
      setRejectReason('');
      toast.success('Retrait rejeté', { duration: 5000 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors du rejet'),
  });

  const pendingCount = withdrawals.filter(w => w.status === 'PENDING').length;
  const approvedCount = withdrawals.filter(w => w.status === 'APPROVED').length;
  const rejectedCount = withdrawals.filter(w => w.status === 'REJECTED').length;
  const totalAmount = withdrawals.reduce((acc, w) => acc + (w.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Retraits</h1>
        <p className="text-gray-400 text-sm mt-1">Gérez les demandes de retrait des utilisateurs.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'En attente', value: pendingCount, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Approuvés', value: approvedCount, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Rejetés', value: rejectedCount, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Montant total', value: `€${totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input-field pl-10 w-full"
            placeholder="Rechercher par utilisateur ou ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-full sm:w-40"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Approuvé</option>
          <option value="REJECTED">Rejeté</option>
          <option value="PROCESSING">En cours</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5">
                {['ID', 'Utilisateur', 'Montant', 'Méthode', 'Statut', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucun retrait trouvé
                  </td>
                </tr>
              ) : filteredWithdrawals.map((w: any) => (
                <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-purple-400 font-mono">#{w.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-[10px] text-purple-400 flex-shrink-0">
                        {w.user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-white">{w.user?.name || '—'}</div>
                        <div className="text-gray-500 text-[10px]">{w.user?.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    €{(w.amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{w.method || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', STATUS_COLORS[w.status] || 'text-gray-400 bg-white/5')}>
                      {STATUS_LABELS[w.status] || w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {w.createdAt ? new Date(w.createdAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {w.status === 'PENDING' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => approveMutation.mutate(w.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                          title="Approuver"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Approuver
                        </button>
                        <button
                          onClick={() => { setRejectId(w.id); setRejectReason(''); }}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                          title="Rejeter"
                        >
                          <XCircle className="w-3 h-3" />
                          Rejeter
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-500">Total : {total} retraits</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Précédent</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Rejeter le retrait</h3>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Raison du rejet</label>
              <textarea
                className="input-field w-full resize-none"
                rows={3}
                placeholder="Expliquez pourquoi ce retrait est rejeté..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectId(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Rejeter</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
