'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Search, CheckCircle, XCircle, Clock, Eye, ExternalLink,
  Loader2, Download, Github, Tag, Filter, Mail,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  PUBLISHED: 'text-green-400  bg-green-500/10  border-green-500/20',
  REJECTED:  'text-red-400    bg-red-500/10    border-red-500/20',
  DRAFT:     'text-gray-400   bg-gray-500/10   border-gray-500/20',
};

const STATUS_ICONS: Record<string, any> = {
  PENDING:   Clock,
  PUBLISHED: CheckCircle,
  REJECTED:  XCircle,
  DRAFT:     Clock,
};

export default function AdminMarketplacePage() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('PENDING');
  const [page, setPage]           = useState(1);
  const [selected, setSelected]   = useState<any>(null);
  const [rejectReason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-marketplace-bots', search, statusFilter, page],
    queryFn: () => adminApi.getMarketplaceBots({ search: search || undefined, status: statusFilter || undefined, page, limit: 12 }),
  });

  const bots: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.bots)) return d.bots;
    return [];
  })();
  const total = (data as any)?.data?.pagination?.total ?? (data as any)?.data?.total ?? bots.length;
  const totalPages = Math.max(1, Math.ceil(total / 12));

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: 'PUBLISHED' | 'REJECTED'; reason?: string }) =>
      adminApi.reviewMarketplaceBot(id, status, reason),
    onSuccess: (_d, vars) => {
      toast.success(vars.status === 'PUBLISHED' ? '✅ Bot approuvé — email envoyé' : '❌ Bot rejeté — email envoyé');
      qc.invalidateQueries({ queryKey: ['admin-marketplace-bots'] });
      setSelected(null);
      setShowReject(false);
      setReason('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  const approve = (bot: any) => reviewMutation.mutate({ id: bot.id, status: 'PUBLISHED' });
  const reject  = (bot: any) => reviewMutation.mutate({ id: bot.id, status: 'REJECTED', reason: rejectReason || undefined });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace — Revue des Bots</h1>
          <p className="text-gray-400 text-sm mt-1">Approuvez ou rejetez les soumissions de bots. Un email est envoyé automatiquement.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
          <Clock className="w-4 h-4" />
          <span>{bots.filter((b: any) => b.status === 'PENDING').length} en attente</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input-field w-full pl-10"
            placeholder="Rechercher un bot..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          {['PENDING', 'PUBLISHED', 'REJECTED', ''].map(s => (
            <button
              key={s || 'all'}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                statusFilter === s
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {s || 'Tous'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
      ) : bots.length === 0 ? (
        <div className="bg-[#111118] border border-white/5 rounded-xl p-12 text-center">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucun bot {statusFilter === 'PENDING' ? 'en attente' : 'trouvé'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bots.map((bot: any) => {
            const StatusIcon = STATUS_ICONS[bot.status] || Clock;
            return (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111118] border border-white/5 rounded-xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{bot.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      par <span className="text-purple-400">{bot.developer?.user?.name || bot.developer?.displayName || '?'}</span>
                      {' · '}{bot.developer?.user?.email && (
                        <span className="text-gray-600">{bot.developer.user.email}</span>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 flex-shrink-0 ${STATUS_COLORS[bot.status] || STATUS_COLORS.DRAFT}`}>
                    <StatusIcon className="w-3 h-3" />
                    {bot.status}
                  </span>
                </div>

                <p className="text-xs text-gray-400 line-clamp-2">{bot.description}</p>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-md">{bot.platform}</span>
                  {(bot.tags || []).slice(0, 3).map((t: string) => (
                    <span key={t} className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {bot.githubUrl && (
                    <a href={bot.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                      <Github className="w-3.5 h-3.5" /> GitHub
                    </a>
                  )}
                  {bot.demoUrl && (
                    <a href={bot.demoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> Démo
                    </a>
                  )}
                  {bot.setupFile && (
                    <span className="flex items-center gap-1 text-green-400">
                      <Download className="w-3.5 h-3.5" /> ZIP fourni
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
                  <button
                    onClick={() => setSelected(bot)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Détails
                  </button>
                  {bot.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => approve(bot)}
                        disabled={reviewMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs border border-green-500/20 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approuver
                      </button>
                      <button
                        onClick={() => { setSelected(bot); setShowReject(true); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs border border-red-500/20 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejeter
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${page === p ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >{p}</button>
          ))}
        </div>
      )}

      {/* Detail / Reject modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                  <p className="text-sm text-gray-400 mt-0.5">v{selected.version} · {selected.platform}</p>
                </div>
                <button onClick={() => { setSelected(null); setShowReject(false); setReason(''); }} className="text-gray-500 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Developer */}
                <div className="bg-[#1A1A24] rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1">Développeur</div>
                  <div className="font-medium text-white">{selected.developer?.user?.name || '?'}</div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    {selected.developer?.user?.email || 'Email non disponible'}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="text-xs text-gray-500 mb-2">Description</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selected.description}</p>
                </div>

                {/* Tags */}
                {selected.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((t: string) => (
                      <span key={t} className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-md">{t}</span>
                    ))}
                  </div>
                )}

                {/* Links */}
                <div className="flex gap-3">
                  {selected.githubUrl && (
                    <a href={selected.githubUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
                      <Github className="w-4 h-4" /> GitHub
                    </a>
                  )}
                  {selected.demoUrl && (
                    <a href={selected.demoUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
                      <ExternalLink className="w-4 h-4" /> Démo
                    </a>
                  )}
                  {selected.setupFile && (
                    <span className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg px-3 py-2">
                      <Download className="w-4 h-4" /> ZIP disponible
                    </span>
                  )}
                </div>

                {/* Reject reason input */}
                {showReject && selected.status === 'PENDING' && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Raison du rejet (optionnel — envoyée par email au développeur)</label>
                    <textarea
                      className="input-field w-full resize-none text-sm"
                      rows={4}
                      placeholder="Ex: Documentation insuffisante, code non fonctionnel, bot dupliqué..."
                      value={rejectReason}
                      onChange={e => setReason(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Cette raison sera envoyée à {selected.developer?.user?.email}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {selected.status === 'PENDING' && (
                  <div className="flex gap-3 pt-2">
                    {!showReject ? (
                      <>
                        <button
                          onClick={() => approve(selected)}
                          disabled={reviewMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-400 font-medium border border-green-500/20 transition-colors disabled:opacity-50"
                        >
                          {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Approuver & Publier
                        </button>
                        <button
                          onClick={() => setShowReject(true)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium border border-red-500/20 transition-colors"
                        >
                          <XCircle className="w-4 h-4" /> Rejeter
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setShowReject(false); setReason(''); }}
                          className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => reject(selected)}
                          disabled={reviewMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
                        >
                          {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Confirmer le rejet
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
