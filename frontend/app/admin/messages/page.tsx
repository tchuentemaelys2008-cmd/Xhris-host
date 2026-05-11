'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MessageSquare, Search, Send, Archive, ChevronLeft,
  Loader2, Clock, CheckCheck, AlertCircle, CheckCircle, X,
} from 'lucide-react';
import { adminApi, apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
  OPEN:        { label: 'Ouvert',      color: 'text-blue-400 bg-blue-500/10',   icon: AlertCircle },
  IN_PROGRESS: { label: 'En cours',   color: 'text-yellow-400 bg-yellow-500/10', icon: Clock },
  WAITING:     { label: 'En attente', color: 'text-orange-400 bg-orange-500/10', icon: Clock },
  RESOLVED:    { label: 'Résolu',     color: 'text-green-400 bg-green-500/10',  icon: CheckCircle },
  CLOSED:      { label: 'Fermé',      color: 'text-gray-400 bg-white/5',        icon: CheckCircle },
};

export default function AdminMessagesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [showList, setShowList] = useState(true); // mobile: toggle list/detail

  const { data, isLoading } = useQuery({
    queryKey: ['admin-messages', search, statusFilter],
    queryFn: () => adminApi.getMessages({ page: 1, limit: 50 }),
    refetchInterval: 15000,
  });

  // Fetch selected ticket details (includes all messages)
  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-ticket-detail', selected?.id],
    queryFn: () => apiClient.get(`/admin/messages/${selected.id}`),
    enabled: !!selected?.id,
  });

  const tickets: any[] = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();

  const messages: any[] = (() => {
    const d = (ticketDetail as any)?.data?.data || (ticketDetail as any)?.data;
    if (!d) return selected?.messages || [];
    return d.messages || selected?.messages || [];
  })();

  const filteredTickets = tickets.filter(t => {
    const matchSearch = !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.user?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const unread = tickets.filter(t => t.status === 'OPEN' || t.status === 'WAITING').length;

  const replyMutation = useMutation({
    mutationFn: () => adminApi.replyMessage(selected.id, reply),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['admin-messages'] });
      qc.invalidateQueries({ queryKey: ['admin-ticket-detail', selected?.id] });
      toast.success('Réponse envoyée', { duration: 3000 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de l\'envoi'),
  });

  const selectTicket = (ticket: any) => {
    setSelected(ticket);
    setShowList(false);
  };

  const cfg = (status: string) => STATUS_CFG[status] || STATUS_CFG.OPEN;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Support — Messages</h1>
          <p className="text-gray-400 text-sm">
            {unread > 0 ? `${unread} ticket(s) en attente de réponse` : 'Tous les tickets sont traités'}
          </p>
        </div>
        {unread > 0 && (
          <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-full font-medium">
            {unread} non lus
          </div>
        )}
      </div>

      {/* Main panel */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <div className="flex h-full">

          {/* LEFT — ticket list (hidden on mobile when detail is shown) */}
          <div className={cn(
            'flex flex-col border-r border-white/5 flex-shrink-0',
            'w-full sm:w-72',
            !showList && selected ? 'hidden sm:flex' : 'flex'
          )}>
            {/* Filters */}
            <div className="p-3 border-b border-white/5 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  className="w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 animate-pulse flex gap-2.5">
                    <div className="w-8 h-8 bg-white/5 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-white/5 rounded w-24" />
                      <div className="h-2.5 bg-white/5 rounded w-40" />
                    </div>
                  </div>
                ))
              ) : filteredTickets.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun ticket</p>
                </div>
              ) : filteredTickets.map((ticket: any) => {
                const c = cfg(ticket.status);
                const StatusIcon = c.icon;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => selectTicket(ticket)}
                    className={cn(
                      'w-full text-left p-3 hover:bg-white/5 transition-colors',
                      selected?.id === ticket.id ? 'bg-purple-600/10 border-l-2 border-purple-500' : 'border-l-2 border-transparent'
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                        {ticket.user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-semibold text-white truncate">{ticket.user?.name || 'Inconnu'}</span>
                          {(ticket.status === 'OPEN' || ticket.status === 'WAITING') && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-gray-300 truncate">{ticket.subject}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.color}`}>{c.label}</span>
                          <span className="text-[10px] text-gray-600">
                            {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString('fr-FR') : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2 border-t border-white/5 text-xs text-gray-600 text-center">
              {filteredTickets.length} ticket(s)
            </div>
          </div>

          {/* RIGHT — conversation (full width on mobile) */}
          <div className={cn(
            'flex-1 flex flex-col min-w-0',
            showList && !selected ? 'hidden sm:flex' : 'flex'
          )}>
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sélectionnez un ticket</p>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
                  <button
                    onClick={() => { setShowList(true); }}
                    className="sm:hidden p-1.5 hover:bg-white/5 rounded-lg text-gray-400"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
                    {selected.user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{selected.user?.name || 'Inconnu'}</div>
                    <div className="text-xs text-gray-500 truncate">{selected.subject}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(() => { const c = cfg(selected.status); const Icon = c.icon; return (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${c.color}`}>
                        <Icon className="w-3 h-3" /> {c.label}
                      </span>
                    ); })()}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {detailLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">Aucun message dans ce ticket</div>
                  ) : messages.map((msg: any, i: number) => (
                    <div key={i} className={cn('flex', msg.isAdmin ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3',
                        msg.isAdmin
                          ? 'bg-purple-600 text-white rounded-br-sm'
                          : 'bg-[#1A1A24] border border-white/5 text-white rounded-bl-sm'
                      )}>
                        {!msg.isAdmin && (
                          <div className="text-[10px] text-purple-400 font-medium mb-1">
                            {selected.user?.name || 'Utilisateur'}
                          </div>
                        )}
                        <p className="text-sm">{msg.content}</p>
                        <div className={cn('text-[10px] mt-1 flex items-center gap-1', msg.isAdmin ? 'text-purple-200 justify-end' : 'text-gray-500')}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleString('fr-FR') : ''}
                          {msg.isAdmin && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply box */}
                <div className="p-3 border-t border-white/5 flex-shrink-0">
                  <div className="flex gap-2">
                    <textarea
                      className="flex-1 bg-[#1A1A24] border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                      rows={2}
                      placeholder={selected.status === 'CLOSED' ? 'Ce ticket est fermé' : 'Répondre au client...'}
                      disabled={selected.status === 'CLOSED'}
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && reply.trim()) {
                          e.preventDefault();
                          replyMutation.mutate();
                        }
                      }}
                    />
                    <button
                      onClick={() => replyMutation.mutate()}
                      disabled={!reply.trim() || replyMutation.isPending || selected.status === 'CLOSED'}
                      className="btn-primary flex-shrink-0 flex items-center gap-1.5 self-end disabled:opacity-50"
                    >
                      {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span className="hidden sm:inline">Envoyer</span>
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1">Ctrl+Entrée pour envoyer</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
