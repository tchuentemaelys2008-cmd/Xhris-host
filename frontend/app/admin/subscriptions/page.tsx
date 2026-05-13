'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Package, Search, Eye, MoreVertical, Loader2, Plus,
  TrendingUp, Users, DollarSign, RefreshCw
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'text-gray-400 bg-white/5',
  PRO: 'text-blue-400 bg-blue-500/10',
  ADVANCED: 'text-purple-400 bg-purple-500/10',
  ELITE: 'text-yellow-400 bg-yellow-500/10',
  FREE: 'text-gray-500 bg-white/5',
};

const MOCK_REVENUE = Array.from({ length: 30 }, (_, i) => ({
  d: i + 1,
  v: Math.round(300 + Math.random() * 500),
}));

export default function AdminSubscriptionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', search, statusFilter, planFilter, page],
    queryFn: () => adminApi.getSubscriptions({ page, limit: 10, status: statusFilter || undefined }),
  });

  const _raw_subs = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();
  const subs: any[] = _raw_subs;
  const total: number = (data as any)?.data?.pagination?.total || (data as any)?.data?.total || subs.length;
  const totalPages = Math.max(1, Math.ceil(total / 10));

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'text-green-400 bg-green-500/10',
    PENDING: 'text-yellow-400 bg-yellow-500/10',
    CANCELLED: 'text-red-400 bg-red-500/10',
    EXPIRED: 'text-gray-400 bg-white/5',
  };

  const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Actif',
    PENDING: 'En attente',
    CANCELLED: 'Annulé',
    EXPIRED: 'Expiré',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Abonnements</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez et surveillez tous les abonnements actifs et passés.</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Nouvel abonnement</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Abonnements actifs', value: total || 632, icon: Package, color: 'text-purple-400', bg: 'bg-purple-500/10', sub: '+18 ce mois-ci' },
          { label: 'Nouveaux ce mois', value: 128, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', sub: '+24.5%' },
          { label: 'MRR', value: '€12,458', icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10', sub: '+12.3%' },
          { label: 'Taux de rétention', value: '89.7%', icon: RefreshCw, color: 'text-orange-400', bg: 'bg-orange-500/10', sub: '+2.1%' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
            <div className="text-xs text-green-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input className="input-field pl-10 w-full" placeholder="Rechercher un abonnement..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input-field w-full sm:w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Statut</option>
              <option value="ACTIVE">Actif</option>
              <option value="PENDING">En attente</option>
              <option value="CANCELLED">Annulé</option>
              <option value="EXPIRED">Expiré</option>
            </select>
            <select className="input-field w-full sm:w-36" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
              <option value="">Tous les plans</option>
              <option value="STARTER">Starter</option>
              <option value="PRO">Pro</option>
              <option value="ADVANCED">Advanced</option>
              <option value="ELITE">Elite</option>
            </select>
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 text-sm font-medium text-white">Liste des abonnements</div>
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
            ) : subs.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                Aucun abonnement trouvé
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/5">
                        <th className="text-left p-4 font-medium">ID ABONNEMENT</th>
                        <th className="text-left p-4 font-medium hidden sm:table-cell">UTILISATEUR</th>
                        <th className="text-left p-4 font-medium">PLAN</th>
                        <th className="text-left p-4 font-medium hidden md:table-cell">MONTANT</th>
                        <th className="text-left p-4 font-medium hidden md:table-cell">CYCLE</th>
                        <th className="text-left p-4 font-medium hidden lg:table-cell">PROCHAIN PAIEMENT</th>
                        <th className="text-left p-4 font-medium">STATUT</th>
                        <th className="text-right p-4 font-medium">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {subs.map((sub: any) => (
                        <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-purple-400 font-mono">#{sub.id?.slice(0, 8)}</td>
                          <td className="p-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-[10px] text-purple-400">
                                {sub.user?.name?.[0] || 'U'}
                              </div>
                              <span className="text-white">{sub.user?.name || 'Utilisateur'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={cn('px-2 py-0.5 rounded-full', PLAN_COLORS[sub.plan] || 'text-gray-400 bg-white/5')}>{sub.plan}</span>
                          </td>
                          <td className="p-4 text-white hidden md:table-cell">{formatCurrency(sub.amount || 0)}</td>
                          <td className="p-4 text-gray-400 hidden md:table-cell capitalize">{sub.cycle === 'MONTHLY' ? 'Mensuel' : sub.cycle === 'ANNUAL' ? 'Annuel' : sub.cycle}</td>
                          <td className="p-4 text-gray-400 hidden lg:table-cell">{sub.nextPayment ? formatDate(sub.nextPayment) : '—'}</td>
                          <td className="p-4">
                            <span className={cn('px-2 py-0.5 rounded-full', STATUS_COLORS[sub.status] || 'text-gray-400 bg-white/5')}>{STATUS_LABELS[sub.status] || sub.status}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><Eye className="w-3.5 h-3.5" /></button>
                              <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><MoreVertical className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-white/5">
                    <div className="text-xs text-gray-400">Affichage de {(page-1)*10+1} à {Math.min(page*10, total)} sur {total}</div>
                    <div className="flex gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Précédent</button>
                      <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Suivant</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <h4 className="text-sm font-medium text-white mb-1">Aperçu des revenus</h4>
            <div className="text-2xl font-bold text-white my-2">€12,458.50</div>
            <div className="text-xs text-green-400 mb-3">+12.3% vs mois dernier</div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={MOCK_REVENUE}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#a855f7" strokeWidth={1.5} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <h4 className="text-sm font-medium text-white mb-3">Répartition par plan</h4>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={52} dataKey="value" paddingAngle={3}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-gray-400">{d.name}</span></div>
                  <span className="text-white">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
