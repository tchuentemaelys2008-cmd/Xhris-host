'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Server, Search, Eye, RotateCcw, MoreVertical,
  CheckCircle, XCircle, AlertTriangle, Loader2, Plus, Cpu, HardDrive
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatRelative, getStatusDot, getStatusLabel, cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';

const ALERTS = [
  { level: 'error', label: 'Utilisation CPU élevée', server: 'XHRIS DB', time: 'il y a 5 min' },
  { level: 'warn', label: 'Espace disque faible', server: 'XHRIS CACHE', time: 'il y a 15 min' },
  { level: 'info', label: 'Redémarrage planifié', server: 'XHRIS STAGING', time: 'il y a 1 heure' },
];

const MOCK_CHART = Array.from({ length: 10 }, (_, i) => ({
  t: `-${(9 - i) * 6}min`,
  cpu: Math.round(30 + Math.random() * 30),
  ram: Math.round(45 + Math.random() * 25),
  storage: Math.round(60 + Math.random() * 10),
  net: Math.round(20 + Math.random() * 25),
}));

export default function AdminServersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-servers', search, statusFilter, page],
    queryFn: () => adminApi.getServers({ search: search || undefined, status: statusFilter || undefined, page, limit: 10 }),
  });

  const _raw_servers = (data as any)?.data?.servers ?? [];
  const servers: any[] = Array.isArray(_raw_servers) ? _raw_servers : [];
  const total: number = (data as any)?.data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  const restartMutation = useMutation({
    mutationFn: (id: string) => adminApi.restartServer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-servers'] }),
  });

  const totalServers = servers.length;
  const onlineCount = servers.filter(s => s.status?.toLowerCase() === 'online').length;
  const maintenanceCount = servers.filter(s => s.status?.toLowerCase() === 'maintenance').length;
  const offlineCount = servers.filter(s => ['offline', 'error'].includes(s.status?.toLowerCase())).length;
  const avgCpu = servers.length ? Math.round(servers.reduce((a, s) => a + (s.cpuUsage || 0), 0) / servers.length) : 42;
  const avgRam = servers.length ? Math.round(servers.reduce((a, s) => a + (s.ramUsage || 0), 0) / servers.length) : 58;

  const pieData = [
    { name: 'En ligne', value: onlineCount || 18, color: '#22c55e' },
    { name: 'En maintenance', value: maintenanceCount || 3, color: '#f59e0b' },
    { name: 'Hors ligne', value: offlineCount || 3, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Serveurs</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez et surveillez tous les serveurs en temps réel.</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Ajouter un serveur</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Serveurs totaux', value: total || 24, icon: Server, color: 'text-blue-400', bg: 'bg-blue-500/10', sub: '+2 ce mois-ci' },
          { label: 'Serveurs en ligne', value: onlineCount || 18, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', sub: '75%' },
          { label: 'Utilisation CPU moy.', value: `${avgCpu}%`, icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10', sub: '-5% vs hier' },
          { label: 'Utilisation RAM moy.', value: `${avgRam}%`, icon: HardDrive, color: 'text-orange-400', bg: 'bg-orange-500/10', sub: '+3% vs hier' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input className="input-field pl-10 w-full" placeholder="Rechercher un serveur..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input-field w-full sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Statut</option>
              <option value="ONLINE">En ligne</option>
              <option value="OFFLINE">Hors ligne</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 text-sm font-medium text-white">Liste des serveurs</div>
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/5">
                      <th className="text-left p-4 font-medium">SERVEUR</th>
                      <th className="text-left p-4 font-medium">STATUT</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">CPU</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">RAM</th>
                      <th className="text-left p-4 font-medium hidden lg:table-cell">STOCKAGE</th>
                      <th className="text-left p-4 font-medium hidden lg:table-cell">UPTIME</th>
                      <th className="text-right p-4 font-medium">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {servers.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-gray-400">Aucun serveur trouvé</td></tr>
                    ) : servers.map((s: any) => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Server className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium">{s.name}</div>
                              {s.domain && <div className="text-gray-500 text-[10px]">{s.domain}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(s.status?.toLowerCase())}`} />
                            <span className="text-gray-300">{getStatusLabel(s.status?.toLowerCase())}</span>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <div>
                            <div className="text-white">{s.cpuUsage?.toFixed(0) || 0}%</div>
                            <div className="w-16 h-1 bg-white/10 rounded-full mt-1"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${s.cpuUsage || 0}%` }} /></div>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <div>
                            <div className="text-white">{s.ramUsage?.toFixed(0) || 0}%</div>
                            <div className="w-16 h-1 bg-white/10 rounded-full mt-1"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.ramUsage || 0}%` }} /></div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-400 hidden lg:table-cell">{s.storageUsed?.toFixed(0) || 0} / {s.storageTotal || 100} GB</td>
                        <td className="p-4 text-gray-400 hidden lg:table-cell">{s.uptime ? `${Math.floor(s.uptime / 3600)}h` : '—'}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => restartMutation.mutate(s.id)} className="p-1.5 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-400" title="Redémarrer"><RotateCcw className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><MoreVertical className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Realtime monitoring */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-4">Surveillance en temps réel</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'CPU (Moyenne)', value: `${avgCpu}%`, sub: '-5%', data: MOCK_CHART, key: 'cpu', color: '#a855f7' },
                { label: 'Mémoire (Moyenne)', value: `${avgRam}%`, sub: '+3%', data: MOCK_CHART, key: 'ram', color: '#3b82f6' },
                { label: 'Stockage (Moyenne)', value: '67%', sub: '+1%', data: MOCK_CHART, key: 'storage', color: '#22c55e' },
                { label: 'Réseau (Moyenne)', value: '31%', sub: '-2%', data: MOCK_CHART, key: 'net', color: '#f59e0b' },
              ].map(m => (
                <div key={m.label}>
                  <div className="text-xs text-gray-400 mb-1">{m.label}</div>
                  <div className="text-lg font-bold text-white">{m.value}</div>
                  <div className="text-xs text-gray-500">{m.sub}</div>
                  <ResponsiveContainer width="100%" height={50}>
                    <AreaChart data={m.data}>
                      <defs>
                        <linearGradient id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={m.color} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={1.5} fill={`url(#grad-${m.key})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <h4 className="text-sm font-medium text-white mb-3">Statut global</h4>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={55} dataKey="value" paddingAngle={3}>
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
            <h4 className="text-sm font-medium text-white mb-3">Alertes récentes</h4>
            <div className="space-y-3">
              {ALERTS.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', a.level === 'error' ? 'bg-red-500/20' : a.level === 'warn' ? 'bg-yellow-500/20' : 'bg-blue-500/20')}>
                    <AlertTriangle className={cn('w-3 h-3', a.level === 'error' ? 'text-red-400' : a.level === 'warn' ? 'text-yellow-400' : 'text-blue-400')} />
                  </div>
                  <div>
                    <div className="text-xs text-white">{a.label}</div>
                    <div className="text-[10px] text-gray-500">{a.server} · {a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
