'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Save, Database, Clock, CheckCircle, XCircle, Plus,
  Download, RefreshCw, Loader2, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function AdminBackupsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-backups', page],
    queryFn: () => apiClient.get('/admin/backups', { params: { page, limit: 15 } }),
  });

  const backups: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.backups)) return d.backups;
    return [];
  })();
  const total: number = (data as any)?.data?.total || backups.length;
  const totalPages = Math.ceil(total / 15);

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/backups'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-backups'] });
      toast.success('Sauvegarde créée avec succès', { duration: 5000 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de la création'),
  });

  const successCount = backups.filter(b => b.status === 'SUCCESS' || b.status === 'COMPLETED' || b.success).length;
  const failCount = backups.filter(b => b.status === 'FAILED' || b.status === 'ERROR' || (b.success === false)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Sauvegardes</h1>
          <p className="text-gray-400 text-sm">Gérez et créez des sauvegardes de la base de données</p>
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="btn-primary flex items-center gap-2 text-sm w-fit"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Créer une sauvegarde
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total sauvegardes', value: total, icon: Database, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Réussies', value: successCount, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Échouées', value: failCount, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Taux de succès', value: total > 0 ? `${Math.round((successCount / total) * 100)}%` : '—', icon: Save, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-xl font-bold text-white">{isLoading ? '...' : s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Backups table */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Historique des sauvegardes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-white/5">
                {['Date & Heure', 'Type', 'Taille', 'Statut', 'Rétention', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucune sauvegarde enregistrée. Les sauvegardes créées apparaîtront ici.
                  </td>
                </tr>
              ) : backups.map((b: any, i: number) => {
                const isSuccess = b.status === 'SUCCESS' || b.status === 'COMPLETED' || b.success === true;
                const isFailed = b.status === 'FAILED' || b.status === 'ERROR' || b.success === false;
                return (
                  <motion.tr key={b.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-gray-300 font-mono text-[10px]">
                      {b.createdAt ? new Date(b.createdAt).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full', b.type === 'AUTO' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400')}>
                        {b.type === 'AUTO' ? 'Automatique' : b.type === 'MANUAL' ? 'Manuelle' : b.type || 'Manuelle'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{b.size || b.fileSize || '—'}</td>
                    <td className="px-4 py-3">
                      {isSuccess ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full text-green-400 bg-green-500/10 flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" /> Réussie
                        </span>
                      ) : isFailed ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full text-red-400 bg-red-500/10 flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" /> Échouée
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full text-yellow-400 bg-yellow-500/10 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" /> En cours
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{b.retentionDays ? `${b.retentionDays} jours` : b.retention || '30 jours'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {b.downloadUrl && (
                          <a href={b.downloadUrl} className="text-gray-400 hover:text-white transition-colors p-1" title="Télécharger">
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-500">Total : {total} sauvegardes</span>
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
