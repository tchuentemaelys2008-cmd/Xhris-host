'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Bot, Play, Square, RefreshCw, Trash2, Terminal, Settings,
  Zap, Plus, Search, Loader2, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { botsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useSettings } from '@/lib/settingsContext';

export default function BotsPage() {
  const { data: session } = useSession();
  const { t } = useSettings();
  const user = session?.user as any;
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedBot, setSelectedBot] = useState<string | null>(null);

  const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    running: { label: t('bots.status.running', 'En ligne'), color: 'text-green-400', dot: 'bg-green-500' },
    stopped: { label: t('bots.status.stopped', 'Arrêté'), color: 'text-red-400', dot: 'bg-red-500' },
    starting: { label: t('bots.status.starting', 'Démarrage'), color: 'text-yellow-400', dot: 'bg-yellow-500' },
    error: { label: t('bots.status.error', 'Erreur'), color: 'text-red-400', dot: 'bg-red-500' },
  };

  const { data, isLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: () => botsApi.getAll(),
    enabled: !!user,
  });

  const _rawBots = (data as any)?.data?.bots ?? (data as any)?.data;
  const bots: any[] = Array.isArray(_rawBots) ? _rawBots : [];

  const startMutation = useMutation({
    mutationFn: (id: string) => botsApi.start(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bots'] }); toast.success(t('bots.started', 'Bot démarré !')); },
    onError: (e: any) => toast.error(e.message),
  });

  const stopMutation = useMutation({
    mutationFn: (id: string) => botsApi.stop(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bots'] }); toast.success(t('bots.stopped_msg', 'Bot arrêté.')); },
    onError: (e: any) => toast.error(e.message),
  });

  const restartMutation = useMutation({
    mutationFn: (id: string) => botsApi.restart(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bots'] }); toast.success(t('bots.restarted', 'Bot redémarré !')); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => botsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bots'] }); toast.success(t('bots.deleted', 'Bot supprimé.')); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = bots.filter(b =>
    !search || b.name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusKey = (status?: string) => String(status || 'stopped').toLowerCase();
  const running = bots.filter(b => statusKey(b.status) === 'running').length;
  const stopped = bots.filter(b => statusKey(b.status) === 'stopped').length;
  const starting = bots.filter(b => statusKey(b.status) === 'starting').length;
  const totalCoins = bots.reduce((acc, b) => acc + (b.coinsPerDay || b.dailyCost || b.coins || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('bots.title', 'Mes Bots')}</h1>
          <p className="text-gray-400 text-sm mt-1">{t('bots.subtitle', 'Gérez vos bots déployés')}</p>
        </div>
        <a href="/dashboard/bots/deploy" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('bots.deploy_btn', 'Déployer un bot')}
        </a>
      </div>

      {/* Summary cards — from real data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('bots.active', 'Bots actifs'), value: running, dot: 'bg-green-400', color: 'text-green-400' },
          { label: t('bots.stopped', 'Bots arrêtés'), value: stopped, dot: 'bg-red-400', color: 'text-red-400' },
          { label: t('bots.starting', 'En démarrage'), value: starting, dot: 'bg-yellow-400', color: 'text-yellow-400' },
          { label: t('bots.daily_cost', 'Coins / jour'), value: totalCoins, dot: 'bg-amber-400', color: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          className="input-field pl-9"
          placeholder={t('bots.search_ph', 'Rechercher un bot...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Bot list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">{t('bots.not_found', 'Aucun bot trouvé')}</h3>
          <p className="text-gray-400 text-sm mb-6">{t('bots.not_found_sub', 'Déployez votre premier bot pour commencer.')}</p>
          <a href="/dashboard/bots/deploy" className="btn-primary inline-flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {t('bots.deploy_first', 'Déployer mon premier bot')}
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((bot, i) => {
            const normalizedStatus = statusKey(bot.status);
            const st = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG['stopped'];
            const isSelected = selectedBot === bot.id;

            return (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden"
              >
                {/* Bot header */}
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                    <Bot className="w-5 h-5 text-green-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-white">{bot.name}</h3>
                      {bot.version && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                          {bot.version}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className={`flex items-center gap-1.5 text-xs ${st.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </div>
                      {bot.uptime && <span className="text-xs text-gray-500">{bot.uptime}</span>}
                      <span className="text-xs text-gray-500">{bot.coinsPerDay || bot.dailyCost || bot.coins || 0} Coins/jour</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    {normalizedStatus === 'running' ? (
                      <button
                        onClick={() => stopMutation.mutate(bot.id)}
                        disabled={stopMutation.isPending}
                        className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Arrêter"
                      >
                        {stopMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <button
                        onClick={() => startMutation.mutate(bot.id)}
                        disabled={startMutation.isPending}
                        className="w-8 h-8 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-colors"
                        title="Démarrer"
                      >
                        {startMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => restartMutation.mutate(bot.id)}
                      disabled={restartMutation.isPending}
                      className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors"
                      title="Redémarrer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 hover:bg-purple-500/20 transition-colors"
                      title="Logs"
                      onClick={() => setSelectedBot(isSelected ? null : bot.id)}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(t('bots.delete_confirm', 'Supprimer ce bot ?'))) deleteMutation.mutate(bot.id); }}
                      className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                  <div className="bg-[#1A1A24] rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">CPU</div>
                    <div className="text-sm font-medium text-white">{bot.cpuUsage ?? bot.cpu ?? 0}%</div>
                    <div className="h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${bot.cpuUsage ?? bot.cpu ?? 0}%` }} />
                    </div>
                  </div>
                  <div className="bg-[#1A1A24] rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">RAM</div>
                    <div className="text-sm font-medium text-white">{bot.ramUsage ?? bot.ram ?? 0} MB</div>
                    <div className="h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(((bot.ramUsage ?? bot.ram ?? 0) / 512) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="bg-[#1A1A24] rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">{t('bots.restarts', 'Redémarrages')}</div>
                    <div className="text-sm font-medium text-white">{bot.restarts ?? 0}</div>
                  </div>
                </div>

                {/* Logs panel */}
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5"
                  >
                    <BotLogs botId={bot.id} />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BotLogs({ botId }: { botId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['bot-logs', botId],
    queryFn: () => botsApi.getLogs(botId, 50),
    refetchInterval: 5000,
  });

  const _rawLogs = (data as any)?.data?.logs ?? (data as any)?.data;
  const logs: string[] = Array.isArray(_rawLogs) ? _rawLogs : [];

  return (
    <div className="bg-[#0D0D14] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Terminal className="w-3.5 h-3.5 text-green-400" />
        <span className="text-xs text-green-400 font-mono">{/* logs label shown via BotLogs - static */}Logs</span>
        {isLoading && <Loader2 className="w-3 h-3 text-gray-500 animate-spin ml-auto" />}
      </div>
      <div className="font-mono text-xs text-green-400 space-y-1 h-32 overflow-y-auto scrollbar-thin">
        {logs.length === 0 ? (
          <div className="text-gray-500">Aucun log disponible...</div>
        ) : (
          logs.map((log: string, i: number) => (
            <div key={i}>{log}</div>
          ))
        )}
      </div>
    </div>
  );
}
