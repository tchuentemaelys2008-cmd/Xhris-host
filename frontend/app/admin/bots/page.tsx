'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Bot, Search, Play, Square, Settings, MoreVertical,
  CheckCircle, XCircle, Loader2, Plus, Cpu, HardDrive, TrendingUp
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatRelative, getStatusDot, getStatusLabel, cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function AdminBotsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bots', search, statusFilter, platformFilter, page],
    queryFn: () => adminApi.getBots({ search: search || undefined, status: statusFilter || undefined, platform: platformFilter || undefined, page, limit: 10 }),
  });

  const { data: statsData } = useQuery({ queryKey: ['admin-stats'], queryFn: () => adminApi.getDashboardStats() });

  const _raw_bots = (data as any)?.data?.bots ?? [];
  const bots: any[] = Array.isArray(_raw_bots) ? _raw_bots : [];
  const total: number = (data as any)?.data?.total || 0;
  const totalPages = Math.ceil(total / 10);
  const stats = (statsData as any)?.data || {};

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => adminApi.reviewBot(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bots'] }),
  });

  const pieData = [
    { name: 'En ligne', value: stats.deployedBots || 0, color: '#22c55e' },
    { name: 'En pause', value: Math.round((stats.deployedBots || 0) * 0.11), color: '#f59e0b' },
    { name: 'Hors ligne', value: Math.round((stats.deployedBots || 0) * 0.07), color: '#ef4444' },
  ];

  const PLATFORM_LABELS: Record<string, string> = {
    WHATSAPP: 'WhatsApp',
    DISCORD: 'Discord',
    TELEGRAM: 'Telegram',
    INSTAGRAM: 'Instagram',
    TIKTOK: 'TikTok',
    OTHER: 'Autre',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bots</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez, déployez et surveillez tous les bots.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Créer un bot
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Bots totaux', value: total || 0, icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/10', sub: '+8.4%' },
          { label: 'Bots en ligne', value: stats.deployedBots || 0, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', sub: '83.0%' },
          { label: 'Bots en pause', value: Math.round((stats.deployedBots || 0) * 0.11), icon: XCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', sub: '9.6%' },
          { label: 'Bots hors ligne', value: Math.round((stats.deployedBots || 0) * 0.07), icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', sub: '7.4%' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-xl font-bold text-white">{s.value.toLocaleString()}</div>
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
              <input className="input-field pl-10 w-full" placeholder="Rechercher un bot..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input-field w-full sm:w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Statut</option>
              <option value="RUNNING">En ligne</option>
              <option value="STOPPED">Arrêté</option>
              <option value="STARTING">Démarrage</option>
              <option value="ERROR">Erreur</option>
            </select>
            <select className="input-field w-full sm:w-36" value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}>
              <option value="">Plateforme</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="DISCORD">Discord</option>
              <option value="TELEGRAM">Telegram</option>
            </select>
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <div className="text-sm font-medium text-white">Liste des bots</div>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/5">
                        <th className="text-left p-4 font-medium">NOM DU BOT</th>
                        <th className="text-left p-4 font-medium hidden sm:table-cell">PLATEFORME</th>
                        <th className="text-left p-4 font-medium">STATUT</th>
                        <th className="text-left p-4 font-medium hidden md:table-cell">UPTIME</th>
                        <th className="text-right p-4 font-medium">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {bots.length === 0 ? (
                        <tr><td colSpan={5} className="py-12 text-center text-gray-400">Aucun bot trouvé</td></tr>
                      ) : bots.map((bot: any) => (
                        <tr key={bot.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-blue-400" />
                              </div>
                              <div>
                                <div className="text-white font-medium">{bot.name}</div>
                                {bot.user && <div className="text-gray-500 text-[10px]">{bot.user.name}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 hidden sm:table-cell">
                            <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-gray-300 rounded-full">
                              {PLATFORM_LABELS[bot.platform] || bot.platform}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(bot.status?.toLowerCase())}`} />
                              <span className="text-gray-300">{getStatusLabel(bot.status?.toLowerCase())}</span>
                            </div>
                          </td>
                          <td className="p-4 text-gray-400 hidden md:table-cell">{bot.uptime ? `${Math.floor(bot.uptime / 3600)}h` : '—'}</td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400"><Play className="w-3.5 h-3.5" /></button>
                              <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400"><Settings className="w-3.5 h-3.5" /></button>
                              <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400"><MoreVertical className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-white/5">
                    <div className="text-xs text-gray-400">Affichage de {(page-1)*10+1} à {Math.min(page*10, total)} sur {total} bots</div>
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

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <h4 className="text-sm font-medium text-white mb-3">Statut global</h4>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-gray-400">{d.name}</span></div>
                  <span className="text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <h4 className="text-sm font-medium text-white mb-3">Utilisation des ressources</h4>
            {[
              { label: 'CPU', value: 42, color: 'bg-purple-500' },
              { label: 'Mémoire', value: 58, color: 'bg-blue-500' },
              { label: 'Stockage', value: 67, color: 'bg-green-500' },
              { label: 'Réseau', value: 31, color: 'bg-orange-500' },
            ].map(r => (
              <div key={r.label} className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">{r.label}</span>
                  <span className="text-white">{r.value}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full">
                  <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
