'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Server, Play, Square, RotateCcw, Trash2, Plus, Search,
  Cpu, HardDrive, CheckCircle, XCircle, Loader2, Activity,
} from 'lucide-react';
import { serversApi } from '@/lib/api';
import { useCoinsBalance, useInvalidateBalance } from '@/lib/useCoinsBalance';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { formatUptime, getStatusDot, getStatusLabel, cn } from '@/lib/utils';
import { useSettings } from '@/lib/settingsContext';

const PLANS = ['STARTER', 'PRO', 'ADVANCED', 'ELITE'];

export default function ServersPage() {
  const { data: session } = useSession();
  const { t } = useSettings();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlan, setNewPlan] = useState('STARTER');

  const token = (session?.user as any)?.accessToken;

  const { data, isLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: () => serversApi.getAll(),
    enabled: !!token,
  });

  const _rawServers = (data as any)?.data?.servers ?? (data as any)?.data?.data ?? (data as any)?.data;
  const servers: any[] = Array.isArray(_rawServers) ? _rawServers : [];

  const PLAN_COSTS: Record<string, number> = { STARTER: 10, PRO: 20, ADVANCED: 40, ELITE: 80 };

  const { balance } = useCoinsBalance();
  const invalidateBalance = useInvalidateBalance();

  const createMutation = useMutation({
    mutationFn: () => serversApi.create({ name: newName, plan: newPlan }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servers'] });
      invalidateBalance();
      setShowCreate(false);
      setNewName('');
      toast.success(`${t('servers.created', 'Serveur créé !')} ${PLAN_COSTS[newPlan]} Coins débités.`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('servers.create_error', 'Erreur lors de la création')),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => serversApi.start(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  });

  const stopMutation = useMutation({
    mutationFn: (id: string) => serversApi.stop(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  });

  const restartMutation = useMutation({
    mutationFn: (id: string) => serversApi.restart(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serversApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servers'] }),
  });

  const filtered = servers.filter(s => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.domain?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const total = servers.length;
  const online = servers.filter(s => s.status?.toLowerCase() === 'online').length;
  const offline = servers.filter(s => s.status?.toLowerCase() === 'offline').length;
  const avgCpu = servers.length ? Math.round(servers.reduce((a, s) => a + (s.cpuUsage || 0), 0) / servers.length) : 0;
  const avgRam = servers.length ? Math.round(servers.reduce((a, s) => a + (s.ramUsage || 0), 0) / servers.length) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{t('servers.title', 'Serveurs')}</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-0.5 hidden sm:block">{t('servers.subtitle', 'Gérez vos serveurs, consultez leurs ressources et contrôlez-les en un clic.')}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('servers.new', 'Nouveau serveur')}</span>
          <span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
        {[
          { label: t('servers.total', 'Total'), value: total, icon: Server, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: t('servers.online', 'En ligne'), value: online, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: t('servers.offline', 'Hors ligne'), value: offline, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'CPU', value: `${avgCpu}%`, icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'RAM', value: `${avgRam}%`, icon: HardDrive, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111118] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
              <stat.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${stat.color}`} />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-gray-400 mt-0.5 leading-tight">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input-field pl-10 w-full"
            placeholder={t('servers.search_ph', 'Rechercher un serveur...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-full sm:w-44"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">{t('servers.all_status', 'Tous les statuts')}</option>
          <option value="online">En ligne</option>
          <option value="offline">Hors ligne</option>
          <option value="starting">Démarrage</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Server list */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Server className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400">{t('servers.not_found', 'Aucun serveur trouvé')}</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              {t('servers.create_first', 'Créer mon premier serveur')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((server, i) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-3 sm:p-4 hover:bg-white/5 transition-colors"
              >
                {/* Top row */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Server className="w-4 h-4 text-blue-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/dashboard/servers/${server.id}`}
                        className="text-sm font-medium text-white hover:text-purple-400 transition-colors truncate max-w-[140px] sm:max-w-none"
                      >
                        {server.name}
                      </Link>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        server.plan === 'ELITE' ? 'bg-yellow-500/20 text-yellow-400' :
                        server.plan === 'ADVANCED' ? 'bg-purple-500/20 text-purple-400' :
                        server.plan === 'PRO' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>{server.plan}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(server.status?.toLowerCase())}`} />
                      <span className="text-xs text-gray-400">{getStatusLabel(server.status?.toLowerCase())}</span>
                      {server.domain && (
                        <span className="text-xs text-gray-600 hidden sm:inline truncate max-w-[180px]">{server.domain}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {server.status?.toLowerCase() !== 'online' ? (
                      <button
                        onClick={() => startMutation.mutate(server.id)}
                        className="p-1.5 sm:p-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                        title="Démarrer"
                      >
                        <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => stopMutation.mutate(server.id)}
                        className="p-1.5 sm:p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="Arrêter"
                      >
                        <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => restartMutation.mutate(server.id)}
                      className="p-1.5 sm:p-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-colors"
                      title="Redémarrer"
                    >
                      <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(t('servers.confirm_delete', 'Supprimer ce serveur ?'))) deleteMutation.mutate(server.id); }}
                      className="p-1.5 sm:p-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics row — always visible */}
                <div className="flex items-center gap-3 sm:gap-5 mt-2 ml-12 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    <span className="text-gray-300">{(server.cpuUsage || 0).toFixed(0)}%</span>
                    <span className="hidden sm:inline">CPU</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    <span className="text-gray-300">{(server.ramUsage || 0).toFixed(0)}%</span>
                    <span className="hidden sm:inline">RAM</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    <span>{server.storageUsed || 0}/{server.storageTotal || 10} GB</span>
                  </div>
                  <div className="hidden md:flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <span>{formatUptime(server.uptime || 0)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111118] border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md"
          >
            <h3 className="text-lg font-semibold text-white mb-4">{t('servers.create_title', 'Créer un serveur')}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">{t('servers.name_label', 'Nom du serveur')}</label>
                <input
                  className="input-field w-full"
                  placeholder={t('servers.name_ph', 'Mon serveur')}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">{t('servers.plan_label', 'Plan')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'STARTER', cpu: '1 vCPU', ram: '1 GB', coins: '10/j' },
                    { name: 'PRO', cpu: '2 vCPU', ram: '2 GB', coins: '20/j' },
                    { name: 'ADVANCED', cpu: '4 vCPU', ram: '4 GB', coins: '40/j' },
                    { name: 'ELITE', cpu: '8 vCPU', ram: '8 GB', coins: '80/j' },
                  ].map(p => (
                    <button
                      key={p.name}
                      onClick={() => setNewPlan(p.name)}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        newPlan === p.name ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'
                      )}
                    >
                      <div className="text-sm font-medium text-white">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.cpu} · {p.ram}</div>
                      <div className="text-xs text-purple-400">{p.coins} Coins</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`mt-4 p-3 rounded-lg border text-xs ${
              balance < PLAN_COSTS[newPlan]
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
              {balance < PLAN_COSTS[newPlan] ? (
                <div>
                  <div className="font-medium mb-1">Solde insuffisant</div>
                  <div>Il vous manque <span className="text-red-300">{PLAN_COSTS[newPlan] - balance} Coins</span> pour créer ce serveur.</div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span>Coût : <strong className="text-white">{PLAN_COSTS[newPlan]} Coins/jour</strong></span>
                  <span>Solde : <strong className="text-amber-400">{balance} Coins</strong></span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">{t('common.cancel', 'Annuler')}</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newName || createMutation.isPending || balance < PLAN_COSTS[newPlan]}
                className="btn-primary flex-1"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Créer (−${PLAN_COSTS[newPlan]} Coins)`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
