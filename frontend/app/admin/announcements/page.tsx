'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Megaphone, Plus, Edit, Trash2, Loader2, ChevronLeft, ChevronRight,
  Eye, EyeOff, AlertCircle, CheckCircle, Clock, X
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const PLACEMENTS = ['HOMEPAGE', 'DASHBOARD', 'ALL'];
const PLACEMENT_LABELS: Record<string, string> = {
  HOMEPAGE: "Page d'accueil",
  DASHBOARD: 'Tableau de bord',
  ALL: 'Partout',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SCHEDULED: 'Planifiée',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-500/10',
  INACTIVE: 'text-gray-400 bg-white/5',
  SCHEDULED: 'text-blue-400 bg-blue-500/10',
};

const PRIORITY_LABELS: Record<number, string> = { 1: 'Haute', 2: 'Moyenne', 3: 'Basse' };
const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-red-400 bg-red-500/10',
  2: 'text-yellow-400 bg-yellow-500/10',
  3: 'text-gray-400 bg-white/5',
};

const emptyForm = { title: '', description: '', placement: 'DASHBOARD', priority: 2, startDate: '', endDate: '' };

export default function AdminAnnouncementsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements', page],
    queryFn: () => apiClient.get('/admin/announcements', { params: { page, limit: 15 } }),
  });

  const announcements: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.announcements)) return d.announcements;
    return [];
  })();
  const total: number = (data as any)?.data?.total || announcements.length;
  const totalPages = Math.ceil(total / 15);

  const createMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/announcements', {
      ...form,
      priority: Number(form.priority),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      setShowModal(false);
      setForm({ ...emptyForm });
      toast.success('Annonce créée avec succès', { duration: 5000 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de la création'),
  });

  const editMutation = useMutation({
    mutationFn: () => apiClient.patch(`/admin/announcements/${editItem?.id}`, {
      ...form,
      priority: Number(form.priority),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      setEditItem(null);
      setShowModal(false);
      toast.success('Annonce modifiée', { duration: 5000 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de la modification'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/announcements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Annonce supprimée');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      title: item.title || '',
      description: item.description || '',
      placement: item.placement || 'DASHBOARD',
      priority: item.priority || 2,
      startDate: item.startDate?.slice(0, 10) || '',
      endDate: item.endDate?.slice(0, 10) || '',
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Annonces</h1>
          <p className="text-gray-400 text-sm">Créez et gérez les annonces de la plateforme</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm w-fit">
          <Plus className="w-4 h-4" /> Ajouter une annonce
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total annonces', value: total, icon: Megaphone, color: 'text-purple-400' },
          { label: 'Actives', value: announcements.filter(a => a.status === 'ACTIVE' || a.active).length, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Inactives', value: announcements.filter(a => a.status === 'INACTIVE' || (!a.active && a.status !== 'ACTIVE')).length, icon: EyeOff, color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${s.color}`}>{isLoading ? '...' : s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5">
                {['Titre', 'Description', 'Emplacement', 'Priorité', 'Statut', 'Période', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aucune annonce
                  </td>
                </tr>
              ) : announcements.map((a: any) => (
                <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-white font-medium max-w-[150px] truncate">{a.title}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{a.description}</td>
                  <td className="px-4 py-3 text-gray-400">{PLACEMENT_LABELS[a.placement] || a.placement}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', PRIORITY_COLORS[a.priority] || 'text-gray-400 bg-white/5')}>
                      {PRIORITY_LABELS[a.priority] || `Priorité ${a.priority}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', STATUS_COLORS[a.status] || 'text-gray-400 bg-white/5')}>
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-[10px]">
                    {a.startDate ? new Date(a.startDate).toLocaleDateString('fr-FR') : '—'}
                    {a.endDate ? ` → ${new Date(a.endDate).toLocaleDateString('fr-FR')}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Supprimer cette annonce ?')) deleteMutation.mutate(a.id); }}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
            <span>Total : {total} annonces</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-white">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A24] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {editItem ? 'Modifier l\'annonce' : 'Créer une annonce'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditItem(null); }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Titre *</label>
                <input
                  className="input-field w-full"
                  placeholder="Titre de l'annonce"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Description</label>
                <textarea
                  className="input-field w-full resize-none"
                  rows={3}
                  placeholder="Description de l'annonce"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Emplacement</label>
                  <select
                    className="input-field w-full"
                    value={form.placement}
                    onChange={e => setForm(f => ({ ...f, placement: e.target.value }))}
                  >
                    {PLACEMENTS.map(p => (
                      <option key={p} value={p}>{PLACEMENT_LABELS[p]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Priorité</label>
                  <select
                    className="input-field w-full"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                  >
                    <option value={1}>Haute</option>
                    <option value={2}>Moyenne</option>
                    <option value={3}>Basse</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Date de début</label>
                  <input
                    type="date"
                    className="input-field w-full"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Date de fin</label>
                  <input
                    type="date"
                    className="input-field w-full"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1 btn-secondary text-sm">Annuler</button>
              <button
                onClick={() => editItem ? editMutation.mutate() : createMutation.mutate()}
                disabled={!form.title || createMutation.isPending || editMutation.isPending}
                className="flex-1 btn-primary text-sm flex items-center justify-center gap-2"
              >
                {(createMutation.isPending || editMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  editItem ? 'Enregistrer' : "Créer l'annonce"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
