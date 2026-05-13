'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield, LogIn, LogOut, AlertTriangle, CheckCircle, XCircle,
  Monitor, Loader2, Search, ChevronLeft, ChevronRight, Globe, Clock
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

const EVENT_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: 'text-green-400 bg-green-500/10',
  LOGIN_FAILED: 'text-red-400 bg-red-500/10',
  LOGOUT: 'text-blue-400 bg-blue-500/10',
  TWO_FA: 'text-purple-400 bg-purple-500/10',
  BLOCKED: 'text-orange-400 bg-orange-500/10',
};

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGIN_FAILED: 'Connexion échouée',
  LOGOUT: 'Déconnexion',
  TWO_FA: 'Vérification 2FA',
  BLOCKED: 'Accès bloqué',
};

export default function AdminSecurityPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-security-logs', page],
    queryFn: () => apiClient.get('/admin/security/logs', { params: { page, limit: 20 } }),
  });

  const logs: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.logs)) return d.logs;
    return [];
  })();
  const total: number = (data as any)?.data?.total || logs.length;
  const totalPages = Math.ceil(total / 20);

  const filteredLogs = search
    ? logs.filter(l =>
        l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.ip?.includes(search) ||
        l.event?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const successCount = logs.filter(l => l.success || l.event === 'LOGIN_SUCCESS').length;
  const failCount = logs.filter(l => !l.success || l.event === 'LOGIN_FAILED').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sécurité</h1>
        <p className="text-gray-400 text-sm mt-1">Historique des connexions et activités de sécurité.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total événements', value: total, icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Connexions réussies', value: successCount, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Connexions échouées', value: failCount, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Accès bloqués', value: logs.filter(l => l.blocked || l.event === 'BLOCKED').length, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-xl font-bold text-white">{isLoading ? '...' : s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          className="input-field w-full pl-9"
          placeholder="Rechercher par utilisateur, IP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Logs table */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5">
                {['Date & Heure', 'Utilisateur', 'Événement', 'IP', 'Appareil', 'Localisation', 'Statut'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-white/5 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {logs.length === 0
                      ? 'Aucun journal de sécurité. Les activités apparaîtront ici au fur et à mesure.'
                      : 'Aucun résultat pour cette recherche'}
                  </td>
                </tr>
              ) : filteredLogs.map((log: any, i: number) => (
                <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-[10px] whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white">{log.user?.name || log.userName || '—'}</div>
                    <div className="text-gray-500 text-[10px]">{log.user?.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', EVENT_COLORS[log.event] || 'text-gray-400 bg-white/5')}>
                      {EVENT_LABELS[log.event] || log.event || 'Connexion'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono">{log.ip || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">
                    <div className="flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      {log.device || log.userAgent?.split(' ')[0] || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {log.location || log.country || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(log.success || log.event === 'LOGIN_SUCCESS') ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full text-green-400 bg-green-500/10 flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" /> Succès
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full text-red-400 bg-red-500/10 flex items-center gap-1 w-fit">
                        <XCircle className="w-3 h-3" /> Échec
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-500">Total : {total} événements</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-2 py-1 text-xs disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
