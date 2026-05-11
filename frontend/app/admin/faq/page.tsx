'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { HelpCircle, Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminFaqPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ question: '', answer: '', category: 'general' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-faq'],
    queryFn: () => apiClient.get('/admin/faq'),
  });

  const faqs: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/faq', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-faq'] });
      setShowCreate(false);
      setForm({ question: '', answer: '', category: 'general' });
      toast.success('FAQ ajoutée');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/faq/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-faq'] }); toast.success('FAQ supprimée'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">FAQ</h1>
          <p className="text-gray-400 text-sm">Gérez les questions fréquemment posées</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm w-fit">
          <Plus className="w-4 h-4" /> Ajouter une FAQ
        </button>
      </div>

      <div className="bg-[#111118] border border-white/5 rounded-xl px-2 py-2">
        <div className="text-xs text-gray-500 px-3 py-2">{faqs.length} questions</div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#111118] border border-white/5 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-3/4" />
            </div>
          ))
        ) : faqs.length === 0 ? (
          <div className="bg-[#111118] border border-white/5 rounded-xl p-12 text-center text-gray-500">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Aucune FAQ enregistrée
          </div>
        ) : faqs.map((faq: any) => (
          <motion.div
            key={faq.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="text-sm font-medium text-white">{faq.question}</span>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={e => { e.stopPropagation(); if (confirm('Supprimer ?')) deleteMutation.mutate(faq.id); }}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {expanded === faq.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {expanded === faq.id && (
              <div className="px-4 pb-4 text-sm text-gray-400 border-t border-white/5 pt-3">
                {faq.answer}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Ajouter une FAQ</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Question</label>
                <input className="input-field w-full" placeholder="Comment déployer un bot ?" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Réponse</label>
                <textarea className="input-field w-full resize-none" rows={4} placeholder="Réponse détaillée..." value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Catégorie</label>
                <select className="input-field w-full" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="general">Général</option>
                  <option value="bots">Bots</option>
                  <option value="coins">Coins</option>
                  <option value="servers">Serveurs</option>
                  <option value="account">Compte</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.question || !form.answer || createMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
