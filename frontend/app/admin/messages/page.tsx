'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MessageSquare, Search, Send, Archive, Star,
  Loader2, Filter, ChevronDown, Clock, CheckCheck,
  Users, TrendingUp, ThumbsUp
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatRelative, formatDateTime, cn } from '@/lib/utils';

const TABS = ['Toutes', 'Non lues', 'Archivées'];

export default function AdminMessagesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-messages', tab, search, page],
    queryFn: () => adminApi.getMessages({ page, limit: 20 }),
  });

  const _raw_tickets = (() => {
    const d = (data as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.tickets)) return d.tickets;
    return [];
  })();
  const tickets: any[] = _raw_tickets;
  const total: number = (data as any)?.data?.total || tickets.length;

  const replyMutation = useMutation({
    mutationFn: () => adminApi.replyMessage(selected.id, reply),
    onSuccess: () => { setReply(''); qc.invalidateQueries({ queryKey: ['admin-messages'] }); },
  });

  const unread = tickets.filter(t => t.status === 'OPEN' || t.status === 'WAITING').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <p className="text-gray-400 text-sm mt-1">Gérez vos conversations et répondez à vos utilisateurs.</p>
      </div>

      <div className="flex h-[calc(100vh-200px)] gap-0 bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        {/* Left - ticket list */}
        <div className="w-72 border-r border-white/5 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="flex gap-1">
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} className={cn('flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors', tab === t ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}>
                  {t}{t === 'Non lues' && unread > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1 rounded-full">{unread}</span>}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input className="w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" placeholder="Rechercher une conversation..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>
            ) : tickets.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">Aucune conversation</div>
            ) : tickets.filter(t => !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.user?.name?.toLowerCase().includes(search.toLowerCase())).map((ticket: any) => (
              <button
                key={ticket.id}
                onClick={() => setSelected(ticket)}
                className={cn('w-full text-left p-3 hover:bg-white/5 transition-colors', selected?.id === ticket.id ? 'bg-white/10' : '')}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0 mt-0.5">
                    {ticket.user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium text-white truncate">{ticket.user?.name || 'Utilisateur'}</span>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">{formatRelative(ticket.updatedAt)}</span>
                    </div>
                    <div className="text-xs text-gray-300 truncate mt-0.5">{ticket.subject}</div>
                    {ticket.messages?.[0] && <div className="text-[10px] text-gray-500 truncate mt-0.5">{ticket.messages[0].content}</div>}
                  </div>
                  {(ticket.status === 'OPEN' || ticket.status === 'WAITING') && (
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-white/5 text-xs text-gray-500 text-center">
            Affichage de 1 à {Math.min(tickets.length, 20)} sur {total} conversations
          </div>
        </div>

        {/* Center - conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sélectionnez une conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="h-14 flex items-center gap-3 px-4 border-b border-white/5 flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-bold text-purple-400">
                  {selected.user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{selected.user?.name}</div>
                  <div className="text-xs text-gray-500">ID: #{selected.id?.slice(0, 8)}</div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors" title="Archiver"><Archive className="w-4 h-4" /></button>
                </div>
                <button className="btn-primary text-xs px-4 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  Répondre
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selected.messages?.map((msg: any, i: number) => (
                  <div key={i} className={cn('flex', msg.isAdmin ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[75%] rounded-2xl px-4 py-3', msg.isAdmin ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-[#1A1A24] text-white rounded-bl-sm')}>
                      <p className="text-sm">{msg.content}</p>
                      <div className={cn('text-[10px] mt-1 flex items-center gap-1', msg.isAdmin ? 'text-purple-200 justify-end' : 'text-gray-500')}>
                        <span>{formatDateTime(msg.createdAt)}</span>
                        {msg.isAdmin && <CheckCheck className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <div className="p-4 border-t border-white/5 flex-shrink-0">
                <div className="flex gap-1 mb-2">
                  {['Réponse', 'Note interne'].map(t => (
                    <button key={t} className={cn('px-3 py-1 text-xs rounded-lg', t === 'Réponse' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white')}>{t}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 bg-[#1A1A24] border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                    rows={3}
                    placeholder="Écrivez votre réponse..."
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => replyMutation.mutate()}
                    disabled={!reply.trim() || replyMutation.isPending}
                    className="btn-primary flex items-center gap-2"
                  >
                    {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Envoyer</>}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right - details */}
        {selected && (
          <div className="w-64 border-l border-white/5 flex-col hidden xl:flex overflow-y-auto p-4 space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Détails de la conversation</div>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'ID Conversation', value: `#${selected.id?.slice(0, 8)}` },
                  { label: 'Utilisateur', value: selected.user?.name || '—' },
                  { label: 'Email', value: selected.user?.email || '—' },
                  { label: 'Statut', value: selected.status },
                  { label: 'Priorité', value: selected.priority },
                  { label: 'Catégorie', value: selected.category || '—' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="text-gray-500">{item.label}</div>
                    <div className="text-white mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Statistiques</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-white">24</div>
                  <div className="text-[10px] text-gray-500">Conversations</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-white">5</div>
                  <div className="text-[10px] text-gray-500">Non lues</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-white">2h34m</div>
                  <div className="text-[10px] text-gray-500">Temps de rép.</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-white">98%</div>
                  <div className="text-[10px] text-gray-500">Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
