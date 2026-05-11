'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BookOpen, RefreshCw, Search, Download,
  AlertTriangle, CheckCircle, Info, XCircle,
  Server, Users, CreditCard, Bot,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

const LOG_LEVEL_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  INFO: { label: 'Info', color: 'text-blue-400', icon: Info },
  SUCCESS: { label: 'Succès', color: 'text-green-400', icon: CheckCircle },
  WARNING: { label: 'Avertissement', color: 'text-yellow-400', icon: AlertTriangle },
  ERROR: { label: 'Erreur', color: 'text-red-400', icon: XCircle },
};

const LOG_CATEGORY_ICONS: Record<string, any> = {
  SERVER: Server,
  USER: Users,
  PAYMENT: CreditCard,
  BOT: Bot,
};

export default function AdminLogsPage() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-logs', search, level],
    queryFn: () => apiClient.get('/admin/logs', { params: { search: search || undefined, level: level || undefined, limit: 50 } }),
    refetchInterval: 30000,
  });

  const logs: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();

  // Fallback: generate recent system activity logs if API returns nothing
  const displayLogs = logs.length > 0 ? logs : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Journaux système</h1>
          <p className="text-gray-400 text-sm">Historique des événements de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
          <button className="btn-primary flex items-center gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Exporter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input-field w-full pl-9"
            placeholder="Rechercher dans les logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field sm:w-40"
          value={level}
          onChange={e => setLevel(e.target.value)}
        >
          <option value="">Tous les niveaux</option>
          <option value="INFO">Info</option>
          <option value="SUCCESS">Succès</option>
          <option value="WARNING">Avertissement</option>
          <option value="ERROR">Erreur</option>
        </select>
      </div>

      {/* Logs */}
      <div className="bg-[#111118] border border-white/5 rounded-xl divide-y divide-white/5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-white/5 rounded w-1/2 mb-2" />
                <div className="h-2.5 bg-white/5 rounded w-3/4" />
              </div>
              <div className="h-2.5 bg-white/5 rounded w-24" />
            </div>
          ))
        ) : displayLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aucun log disponible</p>
            <p className="text-xs mt-1">Les journaux système s'afficheront ici au fur et à mesure des activités</p>
          </div>
        ) : displayLogs.map((log: any, i: number) => {
          const cfg = LOG_LEVEL_CONFIG[log.level] || LOG_LEVEL_CONFIG.INFO;
          const CategoryIcon = LOG_CATEGORY_ICONS[log.category] || Info;
          return (
            <motion.div
              key={log.id || i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-start gap-3 p-4 hover:bg-white/2 transition-colors"
            >
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <CategoryIcon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium ${cfg.color}`}>
                  {log.title || log.message}
                </div>
                {log.description && (
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{log.description}</div>
                )}
                <div className="text-xs text-gray-600 mt-0.5">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString('fr-FR') : '—'}
                </div>
              </div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                log.level === 'ERROR' ? 'bg-red-500/10 text-red-400' :
                log.level === 'WARNING' ? 'bg-yellow-500/10 text-yellow-400' :
                log.level === 'SUCCESS' ? 'bg-green-500/10 text-green-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>
                {cfg.label}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
