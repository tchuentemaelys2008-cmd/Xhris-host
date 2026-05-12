'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Coins, ArrowUpRight, ArrowDownLeft, Gift, Share2, Tag, Loader2,
  ChevronLeft, ChevronRight, Bot, Server, Search, TrendingUp, TrendingDown,
  Award,
} from 'lucide-react';
import { coinsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const TX_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  DAILY_BONUS:       { label: 'Bonus quotidien',   icon: Gift,          color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  REFERRAL:          { label: 'Parrainage',         icon: Share2,        color: 'text-green-400',  bg: 'bg-green-500/10' },
  TRANSFER_SENT:     { label: 'Envoi de coins',     icon: ArrowUpRight,  color: 'text-red-400',    bg: 'bg-red-500/10' },
  TRANSFER_RECEIVED: { label: 'Réception de coins', icon: ArrowDownLeft, color: 'text-green-400',  bg: 'bg-green-500/10' },
  PURCHASE:          { label: 'Achat de coins',     icon: Coins,         color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  BONUS_CODE:        { label: 'Code bonus',         icon: Tag,           color: 'text-purple-400', bg: 'bg-purple-500/10' },
  DEPLOY_BOT:        { label: 'Déploiement bot',    icon: Bot,           color: 'text-red-400',    bg: 'bg-red-500/10' },
  SERVER_COST:       { label: 'Coût serveur',       icon: Server,        color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ADMIN_GRANT:       { label: 'Ajout admin',        icon: Award,         color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ADMIN_DEDUCT:      { label: 'Déduction admin',    icon: Award,         color: 'text-red-400',    bg: 'bg-red-500/10' },
};

// Map tab names to API type params (matching exact DB enum values)
const TYPE_FILTERS: Record<string, string | undefined> = {
  'Tous': undefined,
  'Reçus': 'TRANSFER_RECEIVED',
  'Envoyés': 'TRANSFER_SENT',
  'Bonus': 'DAILY_BONUS',
  'Achats': 'PURCHASE',
};

const TABS = Object.keys(TYPE_FILTERS);
const LIMIT = 20;

export default function HistoryPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [tab, setTab] = useState('Tous');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['coins-transactions', tab, page],
    queryFn: () => coinsApi.getTransactions({
      type: TYPE_FILTERS[tab],
      page,
      limit: LIMIT,
    }),
    enabled: !!user,
    staleTime: 0,
    keepPreviousData: true,
  } as any);

  // sendPaginated returns: { data: [...], pagination: { total, page, limit, totalPages } }
  const rawData = (data as any)?.data;
  const transactions: any[] = (() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    if (Array.isArray(rawData.data)) return rawData.data;
    return [];
  })();

  const pagination = rawData?.pagination || {};
  const total: number = pagination.total || transactions.length;
  const totalPages: number = pagination.totalPages || Math.ceil(total / LIMIT) || 1;

  // Client-side search filter
  const filtered = search.trim()
    ? transactions.filter(tx =>
        (tx.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.type || '').toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  // Stats from all loaded transactions
  const totalIn  = transactions.filter(t => (t.amount || 0) > 0).reduce((a, t) => a + t.amount, 0);
  const totalOut = Math.abs(transactions.filter(t => (t.amount || 0) < 0).reduce((a, t) => a + t.amount, 0));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Historique</h1>
        <p className="text-gray-400 text-sm mt-0.5">Toutes vos transactions de Coins.</p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: TrendingUp,   label: 'Total reçu',   value: `+${totalIn.toLocaleString('fr-FR')}`,  color: 'text-green-400', bg: 'bg-green-500/10' },
          { icon: TrendingDown, label: 'Total envoyé', value: `-${totalOut.toLocaleString('fr-FR')}`, color: 'text-red-400',   bg: 'bg-red-500/10' },
          { icon: Coins,        label: 'Opérations',   value: total.toLocaleString('fr-FR'),          color: 'text-purple-400',bg: 'bg-purple-500/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-white/5 rounded-xl p-3`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
            <div className={`text-lg font-bold ${s.color}`}>{isLoading ? '…' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Tab filter */}
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-colors flex-shrink-0',
                tab === t ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:ml-auto sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            className="input-field w-full pl-8 text-sm"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Transactions list */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Coins className="w-12 h-12 text-gray-700 mx-auto mb-3 opacity-40" />
            <p className="text-gray-400 text-sm">Aucune transaction trouvée</p>
            <p className="text-gray-600 text-xs mt-1">
              {tab !== 'Tous' ? 'Essayez l\'onglet "Tous"' : 'Vos transactions apparaîtront ici'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((tx: any, i: number) => {
              const cfg = TX_CONFIG[tx.type] || {
                label: tx.type || 'Transaction',
                icon: Coins,
                color: 'text-gray-400',
                bg: 'bg-white/5',
              };
              const Icon = cfg.icon;
              const isPositive = (tx.amount || 0) >= 0;

              return (
                <motion.div
                  key={tx.id || i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  {/* Description + date */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {tx.description || cfg.label}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-600">
                        {tx.createdAt
                          ? new Date(tx.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className={cn('text-sm sm:text-base font-bold flex-shrink-0', isPositive ? 'text-green-400' : 'text-red-400')}>
                    {isPositive ? '+' : ''}{(tx.amount || 0).toLocaleString('fr-FR')}
                    <span className="text-xs font-normal ml-0.5 text-gray-500">C</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-500">
              {total} transaction{total > 1 ? 's' : ''} · page {page}/{totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="btn-secondary px-2 py-1.5 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page - 2 + i;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn('w-8 h-8 rounded-lg text-xs transition-colors', p === page ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10')}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isFetching}
                className="btn-secondary px-2 py-1.5 text-xs disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
