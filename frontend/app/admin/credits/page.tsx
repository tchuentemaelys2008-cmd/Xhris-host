'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Coins, Plus, Trash2, Edit, Loader2, Star, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const DEFAULT_PACKS = [
  { id: 'pack-100', name: '100 Coins', coins: 100, price: 2.49, currency: 'EUR', label: 'Idéal pour commencer' },
  { id: 'pack-250', name: '250 Coins', coins: 250, price: 4.99, currency: 'EUR', label: 'Petits projets' },
  { id: 'pack-500', name: '500 Coins', coins: 500, price: 9.99, currency: 'EUR', label: 'Le plus populaire', popular: true },
  { id: 'pack-1000', name: '1 000 Coins', coins: 1000, price: 17.99, currency: 'EUR', label: 'Utilisateurs réguliers' },
  { id: 'pack-2500', name: '2 500 Coins', coins: 2500, price: 39.99, currency: 'EUR', label: 'Pour les pros' },
];

export default function AdminCreditsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', coins: 100, price: 2.49, currency: 'EUR', label: '', popular: false });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-credit-packs'],
    queryFn: () => apiClient.get('/coins/packs'),
  });

  const packs: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return DEFAULT_PACKS;
    if (Array.isArray(d)) return d.length > 0 ? d : DEFAULT_PACKS;
    return DEFAULT_PACKS;
  })();

  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient.get('/admin/stats'),
  });
  const stats = (statsData as any)?.data || {};

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/credit-packs', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-credit-packs'] });
      setShowCreate(false);
      toast.success('Pack créé');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Crédits & Packs</h1>
          <p className="text-gray-400 text-sm">Gérez les packs de coins disponibles à l'achat</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm w-fit">
          <Plus className="w-4 h-4" /> Créer un pack
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Coins en circulation', value: stats.coinsCirculating?.toLocaleString() || '—', color: 'text-amber-400' },
          { label: 'Utilisateurs premium', value: stats.premiumUsers?.toLocaleString() || '—', color: 'text-purple-400' },
          { label: 'Revenus Coins', value: stats.totalRevenue ? `€${Number(stats.totalRevenue).toFixed(0)}` : '—', color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Packs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[#111118] border border-white/5 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-white/5 rounded mb-3" />
              <div className="h-8 bg-white/5 rounded mb-2" />
              <div className="h-3 bg-white/5 rounded" />
            </div>
          ))
        ) : packs.map((pack: any) => (
          <motion.div
            key={pack.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'bg-[#111118] border rounded-xl p-5 relative',
              pack.popular ? 'border-purple-500/50' : 'border-white/5'
            )}
          >
            {pack.popular && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] px-3 py-0.5 rounded-full flex items-center gap-1">
                <Star className="w-2.5 h-2.5" /> Populaire
              </div>
            )}
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-white">€{pack.price}</div>
                <div className="text-xs text-gray-500">{pack.currency || 'EUR'}</div>
              </div>
            </div>
            <div className="text-lg font-semibold text-amber-400 mb-1">{pack.coins?.toLocaleString()} Coins</div>
            <div className="text-xs text-gray-400">{pack.label || pack.name}</div>
          </motion.div>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Créer un pack de Coins</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Nom du pack</label>
                <input className="input-field w-full" placeholder="500 Coins" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Coins offerts</label>
                  <input type="number" min="1" className="input-field w-full" value={form.coins} onChange={e => setForm(f => ({ ...f, coins: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Prix (€)</label>
                  <input type="number" min="0.01" step="0.01" className="input-field w-full" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Description</label>
                <input className="input-field w-full" placeholder="Le plus populaire" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.popular} onChange={e => setForm(f => ({ ...f, popular: e.target.checked }))} className="rounded" />
                <span className="text-sm text-white">Marquer comme populaire</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || !form.coins || createMutation.isPending}
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
