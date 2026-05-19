'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift, Plus, Trash2, Loader2, Copy, CheckCircle,
  Calendar, Users, Link as LinkIcon, Power, XCircle, Trophy,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const DEFAULT_FORM = {
  title: 'Cadeau XHRIS-MD',
  description: '',
  mainReward: 100,
  consolationReward: 20,
  winnersLimit: 5,
  totalCapacity: 50,
  expiresAt: '',
  requireChannelJoin: true,
  distributionMode: 'site' as 'site' | 'channel',
};

// ─── Claims modal ─────────────────────────────────────────────────────────────
function ClaimsModal({ giftId, onClose }: { giftId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-gift-claims', giftId],
    queryFn: () => apiClient.get(`/admin/gifts/${giftId}/claims`),
  });
  const claims: any[] = (data as any)?.data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0D0D14] border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full p-5 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Gagnants ({claims.length})
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin w-6 h-6 text-pink-400" /></div>
        ) : !claims.length ? (
          <p className="text-center py-8 text-gray-500 text-sm">Aucun gagnant pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {claims.map((c: any) => (
              <div
                key={c.id}
                className={cn('flex items-center gap-3 p-3 rounded-xl', c.rewardType === 'main' ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-white/5')}
              >
                <div className="text-xl w-8 text-center">
                  {c.rewardType === 'main' && c.position === 1 && '🥇'}
                  {c.rewardType === 'main' && c.position === 2 && '🥈'}
                  {c.rewardType === 'main' && c.position === 3 && '🥉'}
                  {c.rewardType === 'main' && c.position > 3 && `#${c.position}`}
                  {c.rewardType === 'consolation' && '🎁'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{c.user?.name || 'Inconnu'}</div>
                  <div className="text-xs text-gray-500 truncate">{c.user?.email}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-yellow-400 text-sm">+{c.coinsEarned}</div>
                  <div className="text-[10px] text-gray-600">{new Date(c.claimedAt).toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AdminGiftsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewClaimsId, setViewClaimsId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-gifts'],
    queryFn: () => apiClient.get('/admin/gifts'),
    refetchInterval: 15000,
  });
  const gifts: any[] = (data as any)?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/gifts', { ...form, mainReward: Number(form.mainReward), consolationReward: Number(form.consolationReward), winnersLimit: Number(form.winnersLimit), totalCapacity: Number(form.totalCapacity) }),
    onSuccess: (r: any) => {
      const g = r?.data?.data;
      qc.invalidateQueries({ queryKey: ['admin-gifts'] });
      setShowCreate(false);
      setForm({ ...DEFAULT_FORM });
      toast.success(`Cadeau créé ! Code : ${g?.code}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/gifts/${id}/toggle`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-gifts'] }); toast.success('Statut modifié'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/gifts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-gifts'] }); toast.success('Supprimé'); },
  });

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copié !');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-pink-400" /> Cadeaux Bonus
          </h1>
          <p className="text-sm text-gray-500 mt-1">Top N gagnants = lot principal · Reste = consolation</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau cadeau
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-pink-400" /></div>
      ) : !gifts.length ? (
        <div className="text-center py-16 text-gray-500">
          <Gift className="w-14 h-14 mx-auto mb-3 opacity-30" />
          <p>Aucun cadeau. Crée le premier !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gifts.map((g: any) => {
            const isExpired = new Date(g.expiresAt) <= new Date();
            const isFull = g.claimsCount >= g.totalCapacity;
            return (
              <div
                key={g.id}
                className={cn(
                  'bg-[#0D0D14] border rounded-2xl p-4 space-y-3',
                  g.active && !isExpired && !isFull ? 'border-pink-500/30' : 'border-white/5 opacity-70'
                )}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{g.title}</h3>
                    {g.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{g.description}</p>}
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full whitespace-nowrap border', g.distributionMode === 'channel' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400')}>
                    {g.distributionMode === 'channel' ? '📢 Chaîne' : '🌐 Site'}
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <Trophy className="w-3.5 h-3.5" />
                    <span><strong>{g.winnersLimit}</strong> × {g.mainReward} coins</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Gift className="w-3.5 h-3.5" />
                    <span>+{g.consolationReward} consolation</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{g.claimsCount}/{g.totalCapacity}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(g.expiresAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                {/* Code + link */}
                <div className="space-y-1.5">
                  {[{ label: 'CODE', value: g.code, id: `code-${g.id}` }, { label: 'LIEN', value: g.link, id: `link-${g.id}` }].map(item => (
                    <div key={item.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                      <span className="text-[10px] text-gray-600 font-mono w-8">{item.label}</span>
                      <span className="flex-1 text-xs font-mono text-gray-300 truncate">{item.value}</span>
                      <button onClick={() => copy(item.value, item.id)} className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white">
                        {copied === item.id ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {isExpired ? <span className="text-xs px-2 py-0.5 bg-gray-500/10 border border-gray-500/20 text-gray-500 rounded-full">⏱️ Expiré</span>
                    : isFull ? <span className="text-xs px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full">🔒 Plein</span>
                    : g.active ? <span className="text-xs px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full">✅ Actif</span>
                    : <span className="text-xs px-2 py-0.5 bg-white/5 border border-white/10 text-gray-500 rounded-full">⏸️ Pause</span>}
                  {g.requireChannelJoin && <span className="text-xs px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full">📢 Chaîne requise</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setViewClaimsId(g.id)}
                    className="flex-1 py-2 text-xs bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-xl font-medium transition-colors"
                  >
                    👥 Gagnants ({g.claimsCount})
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate(g.id)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    title={g.active ? 'Désactiver' : 'Activer'}
                  >
                    <Power className={cn('w-4 h-4', g.active ? 'text-green-400' : 'text-gray-600')} />
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Supprimer ce cadeau et tous ses claims ?')) deleteMutation.mutate(g.id); }}
                    className="p-2 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0D0D14] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-5 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-400" /> Nouveau cadeau
                </h2>
                <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Titre</label>
                  <input className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Description (optionnel)</label>
                  <textarea className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500 resize-none" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">🏆 Lot principal (coins)</label>
                    <input type="number" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500" value={form.mainReward} onChange={e => setForm({ ...form, mainReward: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">🎁 Consolation (coins)</label>
                    <input type="number" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500" value={form.consolationReward} onChange={e => setForm({ ...form, consolationReward: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nb gagnants (lot principal)</label>
                    <input type="number" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500" value={form.winnersLimit} onChange={e => setForm({ ...form, winnersLimit: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Capacité totale</label>
                    <input type="number" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500" value={form.totalCapacity} onChange={e => setForm({ ...form, totalCapacity: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Expire le</label>
                  <input type="datetime-local" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Distribution</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['site', 'channel'] as const).map(mode => (
                      <button key={mode} type="button" onClick={() => setForm({ ...form, distributionMode: mode })}
                        className={cn('py-2 rounded-xl text-xs font-medium border transition-colors', form.distributionMode === mode ? (mode === 'site' ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-green-500/20 border-green-500/40 text-green-400') : 'border-white/10 text-gray-500 hover:text-white')}>
                        {mode === 'site' ? '🌐 Site (notif users)' : '📢 Chaîne WA (lien)'}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-pink-500" checked={form.requireChannelJoin} onChange={e => setForm({ ...form, requireChannelJoin: e.target.checked })} />
                  <span className="text-gray-300 text-xs">Exiger d'avoir rejoint la chaîne WhatsApp</span>
                </label>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-sm transition-colors">Annuler</button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.expiresAt || form.mainReward <= 0}
                  className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center"
                >
                  {createMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : 'Créer le cadeau'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Claims modal */}
      {viewClaimsId && <ClaimsModal giftId={viewClaimsId} onClose={() => setViewClaimsId(null)} />}
    </div>
  );
}
