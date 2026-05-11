'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Tag, Plus, Trash2, RefreshCw, Loader2, Copy,
  CheckCircle, XCircle, Calendar,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function AdminPromoPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', coins: 10, usageLimit: '', expiresAt: '' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: () => apiClient.get('/admin/bonus-codes'),
  });

  const codes: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/bonus-codes', {
      code: form.code.toUpperCase(),
      coins: Number(form.coins),
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      expiresAt: form.expiresAt || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      setShowCreate(false);
      setForm({ code: '', coins: 10, usageLimit: '', expiresAt: '' });
      toast.success('Code promo créé');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/bonus-codes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-promo-codes'] }); toast.success('Code supprimé'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiClient.patch(`/admin/bonus-codes/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promo-codes'] }),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Codes Promo</h1>
          <p className="text-gray-400 text-sm">Gérez les codes bonus de la plateforme</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm w-fit">
          <Plus className="w-4 h-4" /> Créer un code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total codes', value: codes.length, color: 'text-purple-400' },
          { label: 'Codes actifs', value: codes.filter(c => c.active).length, color: 'text-green-400' },
          { label: 'Total utilisations', value: codes.reduce((acc, c) => acc + (c.usageCount || 0), 0), color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Codes list */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                {['Code', 'Coins', 'Utilisations', 'Limite', 'Expiration', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucun code promo
                  </td>
                </tr>
              ) : codes.map((code: any) => (
                <tr key={code.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white font-bold">{code.code}</span>
                      <button onClick={() => { navigator.clipboard.writeText(code.code); toast.success('Copié'); }} className="text-gray-500 hover:text-white">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-amber-400 font-medium">+{code.coins}</td>
                  <td className="px-4 py-3 text-white">{code.usageCount || 0}</td>
                  <td className="px-4 py-3 text-gray-400">{code.usageLimit || '∞'}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMutation.mutate({ id: code.id, active: !code.active })}
                      className={cn('text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1', code.active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}
                    >
                      {code.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {code.active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { if (confirm('Supprimer ce code ?')) deleteMutation.mutate(code.id); }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Créer un code promo</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Code (majuscules)</label>
                <input
                  className="input-field w-full uppercase"
                  placeholder="EX: WELCOME2024"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Coins offerts</label>
                <input type="number" min="1" className="input-field w-full" value={form.coins} onChange={e => setForm(f => ({ ...f, coins: Number(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Limite utilisations</label>
                  <input type="number" min="1" className="input-field w-full" placeholder="Illimitée" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Expiration</label>
                  <input type="date" className="input-field w-full" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.code || !form.coins || createMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
