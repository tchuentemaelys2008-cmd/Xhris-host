'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Hash, Volume2, Send, Smile, Paperclip,
  Users, Zap, LogOut, Loader2, ArrowLeft,
  ChevronDown, Circle, Crown, Shield, Star,
} from 'lucide-react';
import { communityApi } from '@/lib/api';
import { formatRelative, cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'text-red-400',
  ADMIN: 'text-yellow-400',
  MODERATOR: 'text-blue-400',
  PREMIUM: 'text-purple-400',
  DEVELOPER: 'text-green-400',
  USER: 'text-gray-300',
};

const ROLE_ICONS: Record<string, any> = {
  SUPERADMIN: Crown,
  ADMIN: Shield,
  DEVELOPER: Star,
};

const EMOJIS = ['😀','😂','❤️','👍','🎉','🔥','😎','🤔','😢','🙏','✅','💪','😮','👏','🤝','💯'];

export default function CommunityPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const user = session?.user as any;

  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => communityApi.getChannels(),
  });

  const { data: onlineData, refetch: refetchOnline } = useQuery({
    queryKey: ['online-users'],
    queryFn: () => communityApi.getOnlineUsers(),
    refetchInterval: 30000,
  });

  // Heartbeat: mark current user as online every 60s
  const pingPresence = useCallback(async () => {
    try { await communityApi.updatePresence(); } catch {}
  }, []);

  useEffect(() => {
    pingPresence();
    const t = setInterval(pingPresence, 60000);
    return () => clearInterval(t);
  }, [pingPresence]);

  const _raw_channels = (channelsData as any)?.data ?? [];
  const channels: any[] = Array.isArray(_raw_channels) ? _raw_channels : [];
  const _raw_onlineUsers = (onlineData as any)?.data?.users ?? (onlineData as any)?.data ?? [];
  const onlineUsers: any[] = Array.isArray(_raw_onlineUsers) ? _raw_onlineUsers : [];
  const textChannels = channels.filter(c => c.type !== 'VOICE');

  useEffect(() => {
    if (channels.length > 0 && !activeChannel) setActiveChannel(channels[0]);
  }, [channels, activeChannel]);

  const { data: messagesData, isLoading: msgsLoading } = useQuery({
    queryKey: ['messages', activeChannel?.id],
    queryFn: () => communityApi.getMessages(activeChannel.id, { limit: 50 }),
    enabled: !!activeChannel?.id,
    refetchInterval: 4000,
  });

  const _raw_messages = (messagesData as any)?.data?.messages ?? [];
  const messages: any[] = Array.isArray(_raw_messages) ? _raw_messages : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: () => communityApi.sendMessage(activeChannel.id, message),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['messages', activeChannel?.id] });
    },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeChannel) return;
    sendMutation.mutate();
  };

  const insertEmoji = (emoji: string) => {
    setMessage(m => m + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const initials = (name: string) =>
    name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

  const switchChannel = (ch: any) => {
    setActiveChannel(ch);
    setShowChannelPicker(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0F]">
      {/* Top bar */}
      <header className="h-14 bg-[#0D0D14] border-b border-white/5 flex items-center gap-3 px-4 flex-shrink-0 z-30">
        {/* Back */}
        <Link href="/dashboard" className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Channel/group selector */}
        <button
          onClick={() => setShowChannelPicker(!showChannelPicker)}
          className="flex items-center gap-2 flex-1 min-w-0 hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Hash className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="font-semibold text-white text-sm truncate">
              {activeChannel?.name || 'Sélectionner un salon'}
            </span>
            {activeChannel?.description && (
              <span className="text-xs text-gray-500 hidden sm:block truncate">— {activeChannel.description}</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showChannelPicker ? 'rotate-180' : ''}`} />
        </button>

        {/* Online count */}
        <button
          onClick={() => setShowOnlineUsers(!showOnlineUsers)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 hover:bg-green-500/20 transition-colors flex-shrink-0"
        >
          <Circle className="w-2 h-2 fill-green-400" />
          <span>{onlineUsers.length} en ligne</span>
          <Users className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Channel picker dropdown */}
      <AnimatePresence>
        {showChannelPicker && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-14 left-0 right-0 z-40 bg-[#0D0D14] border-b border-white/10 shadow-2xl"
          >
            <div className="max-w-lg mx-auto px-4 py-3">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Salons disponibles</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {textChannels.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => switchChannel(ch)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors',
                      activeChannel?.id === ch.id
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-medium">{ch.name}</span>
                    {ch.description && <span className="text-xs text-gray-600 truncate hidden sm:block">{ch.description}</span>}
                    {ch.unread > 0 && (
                      <span className="ml-auto bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">{ch.unread}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online users panel */}
      <AnimatePresence>
        {showOnlineUsers && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-14 bottom-0 w-64 bg-[#0D0D14] border-l border-white/5 z-30 overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">En ligne — {onlineUsers.length}</span>
                <button onClick={() => setShowOnlineUsers(false)} className="text-gray-500 hover:text-white">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
              <div className="space-y-0.5">
                {onlineUsers.map((u: any) => {
                  const RoleIcon = ROLE_ICONS[u.role];
                  return (
                    <div key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="relative flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">
                          {initials(u.name)}
                        </div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-[#0D0D14]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate flex items-center gap-1 ${ROLE_COLORS[u.role] || 'text-white'}`}>
                          {u.name}
                          {RoleIcon && <RoleIcon className="w-3 h-3 flex-shrink-0" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" onClick={() => { setShowEmojis(false); setShowChannelPicker(false); }}>
        {!activeChannel ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <Hash className="w-12 h-12 opacity-20" />
            <p className="text-sm">Sélectionnez un salon pour commencer</p>
            <button onClick={() => setShowChannelPicker(true)} className="btn-primary text-sm">
              Choisir un salon
            </button>
          </div>
        ) : msgsLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Hash className="w-10 h-10 opacity-20 mb-2" />
            <p className="text-sm">Soyez le premier à écrire dans #{activeChannel.name}</p>
          </div>
        ) : messages.map((msg: any, i: number) => {
          const prev = messages[i - 1];
          const grouped = prev?.userId === msg.userId &&
            (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 300000;
          const role = msg.user?.role || 'USER';
          const RoleIcon = ROLE_ICONS[role];
          const isOwn = msg.userId === user?.id;

          return (
            <div key={msg.id} className={cn('flex gap-3 group hover:bg-white/[0.03] rounded-lg px-2 py-0.5', grouped ? 'mt-0.5' : 'mt-3')}>
              {!grouped ? (
                <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400 flex-shrink-0 mt-0.5">
                  {msg.user?.avatar
                    ? <img src={msg.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    : initials(msg.user?.name || '?')}
                </div>
              ) : <div className="w-9 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                {!grouped && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-semibold ${ROLE_COLORS[role]}`}>{msg.user?.name}</span>
                    {RoleIcon && <RoleIcon className="w-3.5 h-3.5 text-gray-500" />}
                    <span className="text-[10px] text-gray-600">{formatRelative(msg.createdAt)}</span>
                    {isOwn && <span className="text-[10px] text-blue-400">Vous</span>}
                  </div>
                )}
                <p className="text-sm text-gray-300 break-words leading-relaxed">{msg.content}</p>
                {msg.attachments?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {msg.attachments.map((a: string, ai: number) => (
                      <img key={ai} src={a} alt="" className="max-w-xs max-h-40 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                {msg.reactions?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {msg.reactions.map((r: any, ri: number) => (
                      <span key={ri} className="text-xs bg-white/5 border border-white/10 rounded-full px-2 py-0.5 hover:bg-white/10 cursor-pointer transition-colors">
                        {r.emoji} {r.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex-shrink-0">
        {/* Emoji picker */}
        <AnimatePresence>
          {showEmojis && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-2 p-3 bg-[#1A1A24] border border-white/10 rounded-xl"
            >
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => insertEmoji(e)}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg transition-colors">
                    {e}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex items-center gap-2 bg-[#1A1A24] border border-white/10 rounded-xl px-3 py-2.5">
          <label className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer flex-shrink-0">
            <Paperclip className="w-4 h-4" />
            <input type="file" className="hidden" accept="image/*,video/*,.pdf,.zip"
              onChange={e => {
                if (e.target.files?.[0]) toast.success(`Fichier sélectionné : ${e.target.files[0].name}`);
              }} />
          </label>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none min-w-0"
            placeholder={activeChannel ? `Message dans #${activeChannel.name}` : 'Sélectionnez un salon...'}
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={!activeChannel}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(e as any)}
          />
          <button type="button" onClick={() => setShowEmojis(!showEmojis)}
            className={`flex-shrink-0 transition-colors ${showEmojis ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
            <Smile className="w-4 h-4" />
          </button>
          <button type="submit" disabled={!message.trim() || sendMutation.isPending || !activeChannel}
            className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white hover:bg-purple-700 transition-colors disabled:opacity-50 flex-shrink-0">
            {sendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
