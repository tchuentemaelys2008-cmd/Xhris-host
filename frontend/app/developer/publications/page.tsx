'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Plus, Eye, BarChart2, Upload, BookOpen, CheckCircle,
  Clock, XCircle, Loader2, Bot, Download, Coins, Zap,
  Trash2, Edit, FileArchive, X,
} from 'lucide-react';
import { developerApi } from '@/lib/api';
import { formatDateTime, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  PUBLISHED: { label: 'Publié', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  PENDING: { label: 'En attente', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  DRAFT: { label: 'Brouillon', icon: Edit, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  REJECTED: { label: 'Rejeté', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function PublicationsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('Tous');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '', description: '', platform: 'WHATSAPP',
    githubUrl: '', demoUrl: '', tags: '', version: '1.0.0',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['dev-publications'],
    queryFn: () => developerApi.getPublications(),
  });

  const { data: statsData } = useQuery({
    queryKey: ['dev-stats'],
    queryFn: () => developerApi.getStats(),
  });

  const _raw_publications = (data as any)?.data?.bots ?? (data as any)?.data ?? [];
  const publications: any[] = Array.isArray(_raw_publications) ? _raw_publications : [];
  const stats = (statsData as any)?.data || {};

  const filtered = activeTab === 'Tous' ? publications
    : publications.filter(p => {
      if (activeTab === 'Publiés') return p.status === 'PUBLISHED';
      if (activeTab === 'En attente') return p.status === 'PENDING';
      if (activeTab === 'Brouillons') return p.status === 'DRAFT';
      return true;
    });

  const submitMutation = useMutation({
    mutationFn: () => developerApi.submitBot({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev-publications'] });
      setShowForm(false);
      setZipFile(null);
      setForm({ name: '', description: '', platform: 'WHATSAPP', githubUrl: '', demoUrl: '', tags: '', version: '1.0.0' });
      toast.success('Bot soumis pour validation !');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de la soumission'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => developerApi.deleteBot(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev-publications'] }); toast.success('Bot supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const TABS = ['Tous', 'Publiés', 'En attente', 'Brouillons'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Mes Publications</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez, suivez et monétisez vos bots publiés.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Nouveau bot
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Bot, label: 'Bots publiés', value: stats.totalBots ?? publications.filter(p => p.status === 'PUBLISHED').length, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { icon: Download, label: 'Téléchargements', value: (stats.totalDownloads ?? 0).toLocaleString(), color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Zap, label: 'Déploiements', value: (stats.totalDeploys ?? 0).toLocaleString(), color: 'text-green-400', bg: 'bg-green-500/10' },
          { icon: Coins, label: 'Coins gagnés', value: (stats.totalEarnings ?? 0).toLocaleString(), color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === t ? 'text-white border-purple-500' : 'text-gray-400 border-transparent hover:text-white'
            }`}>
            {t}
            <span className="ml-1.5 text-xs text-gray-500">
              ({t === 'Tous' ? publications.length
                : t === 'Publiés' ? publications.filter(p => p.status === 'PUBLISHED').length
                : t === 'En attente' ? publications.filter(p => p.status === 'PENDING').length
                : publications.filter(p => p.status === 'DRAFT').length})
            </span>
          </button>
        ))}
      </div>

      {/* Bots list */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 mb-3">Aucun bot trouvé</p>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Soumettre mon premier bot</button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((bot: any) => {
              const st = STATUS_CONFIG[bot.status] || STATUS_CONFIG.DRAFT;
              return (
                <div key={bot.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors">
                  <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{bot.name}</span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                        <st.icon className="w-3 h-3" />
                        {st.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{bot.description}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {bot.downloads != null && <span className="flex items-center gap-1"><Download className="w-3 h-3" />{bot.downloads}</span>}
                      {bot.coins != null && <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" />{bot.coins}</span>}
                      {bot.createdAt && <span>{formatDateTime(bot.createdAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                      <BarChart2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm('Supprimer ce bot ?')) deleteMutation.mutate(bot.id); }}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit bot modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-lg my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Soumettre un bot</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Nom du bot *</label>
                  <input className="input-field w-full" placeholder="Mon Bot"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Version</label>
                  <input className="input-field w-full" placeholder="1.0.0"
                    value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Plateforme *</label>
                <select className="input-field w-full" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="DISCORD">Discord</option>
                  <option value="TELEGRAM">Telegram</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Description *</label>
                <textarea className="input-field w-full resize-none" rows={3}
                  placeholder="Décrivez les fonctionnalités de votre bot..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">GitHub (optionnel)</label>
                  <input className="input-field w-full" placeholder="https://github.com/..."
                    value={form.githubUrl} onChange={e => setForm(f => ({ ...f, githubUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Démo (optionnel)</label>
                  <input className="input-field w-full" placeholder="https://..."
                    value={form.demoUrl} onChange={e => setForm(f => ({ ...f, demoUrl: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Tags (séparés par virgule)</label>
                <input className="input-field w-full" placeholder="IA, automatisation, WhatsApp..."
                  value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              </div>

              {/* ZIP upload */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Fichier du bot (.zip) *</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors',
                    zipFile ? 'border-purple-500/40 bg-purple-500/5' : 'border-white/10 hover:border-white/20'
                  )}
                >
                  {zipFile ? (
                    <div className="flex items-center justify-center gap-2 text-purple-400">
                      <FileArchive className="w-5 h-5" />
                      <span className="text-sm font-medium">{zipFile.name}</span>
                      <span className="text-xs text-gray-500">({(zipFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setZipFile(null); }} className="text-gray-500 hover:text-red-400 ml-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Glissez-déposez ou cliquez pour uploader</p>
                      <p className="text-xs text-gray-600 mt-1">ZIP, max 50 MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 50 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 50 MB)'); return; }
                        setZipFile(f);
                        toast.success(`Fichier prêt : ${f.name}`);
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Le ZIP doit contenir votre code source + un fichier README.md d&apos;instructions.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={!form.name || !form.description || submitMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
                  : <><Upload className="w-4 h-4" /> Soumettre</>
                }
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
