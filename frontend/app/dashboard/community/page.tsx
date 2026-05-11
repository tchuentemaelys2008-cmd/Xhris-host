'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, Volume2, Plus, Search, Send, Paperclip,
  Users, Bell, FileText, Download, X, Loader2,
  MessageSquare, ChevronLeft, AlertCircle,
} from 'lucide-react';
import { communityApi, apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  SUPERADMIN: { label: 'Staff',       color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  ADMIN:      { label: 'Admin',       color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  MODERATOR:  { label: 'Modérateur', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  PREMIUM:    { label: 'Premium',     color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  USER:       { label: 'Membre',      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

export default function CommunityPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const user = session?.user as any;

  const [activeChannelId, setActiveChannelId] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mobileView, setMobileView] = useState<'channels' | 'chat' | 'members'>('channels');
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Queries
  const { data: channelsData } = useQuery({
    queryKey: ['community-channels'],
    queryFn: () => communityApi.getChannels(),
    staleTime: 60_000,
  });

  const channels: any[] = (() => {
    const d = (channelsData as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();

  useEffect(() => {
    if (channels.length && !activeChannelId) {
      const general = channels.find((c: any) => c.name === 'général' || c.name === 'general') || channels[0];
      if (general) {
        setActiveChannelId(general.id);
        if (isMobile) setMobileView('chat');
      }
    }
  }, [channels, activeChannelId, isMobile]);

  const { data: messagesData } = useQuery({
    queryKey: ['community-messages', activeChannelId],
    queryFn: () => communityApi.getMessages(activeChannelId),
    enabled: !!activeChannelId,
    refetchInterval: 5000,
  });

  const messages: any[] = (() => {
    const d = (messagesData as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();

  const { data: onlineData } = useQuery({
    queryKey: ['community-online'],
    queryFn: () => communityApi.getOnlineUsers(),
    refetchInterval: 30_000,
  });

  const onlineUsers: any[] = (() => {
    const d = (onlineData as any)?.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.data)) return d.data;
    return [];
  })();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Presence heartbeat
  useEffect(() => {
    if (!user) return;
    communityApi.updatePresence().catch(() => {});
    const interval = setInterval(() => communityApi.updatePresence().catch(() => {}), 60_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Mutations
  const sendMutation = useMutation({
    mutationFn: () => communityApi.sendMessage(activeChannelId, messageInput.trim()),
    onSuccess: () => {
      setMessageInput('');
      qc.invalidateQueries({ queryKey: ['community-messages', activeChannelId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth_token') || (session as any)?.accessToken;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const res = await fetch(`${backendUrl}/api/community/channels/${activeChannelId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload échoué');
    return res.json();
  };

  const handleSend = async () => {
    if (selectedFile) {
      try {
        await uploadFile(selectedFile);
        setSelectedFile(null);
        qc.invalidateQueries({ queryKey: ['community-messages', activeChannelId] });
        toast.success('Fichier envoyé !');
      } catch { toast.error('Erreur upload fichier'); }
      return;
    }
    if (!messageInput.trim()) return;
    sendMutation.mutate();
  };

  const activeChannel = channels.find((c: any) => c.id === activeChannelId);
  const textChannels = channels.filter((c: any) => c.type !== 'VOICE');
  const voiceChannels = channels.filter((c: any) => c.type === 'VOICE');

  // ── Sidebar Salons ─────────────────────────────────────────────
  const ChannelSidebar = () => (
    <div className="w-full md:w-56 bg-[#0A0A0F] border-r border-white/5 flex flex-col h-full flex-shrink-0">
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/5">
        <span className="font-semibold text-white text-sm">Communauté</span>
        {['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(user?.role) && (
          <button
            onClick={() => {
              const name = prompt('Nom du salon :');
              if (name) apiClient.post('/community/channels', { name, type: 'TEXT' })
                .then(() => qc.invalidateQueries({ queryKey: ['community-channels'] }))
                .catch(() => toast.error('Erreur création salon'));
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2">
        {channels.length === 0 ? (
          <div className="text-xs text-gray-600 px-3 py-4 text-center">Chargement des salons...</div>
        ) : (
          <>
            <div className="px-2 mb-1 mt-1">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Salons texte</span>
            </div>
            {textChannels.map((ch: any) => (
              <button
                key={ch.id}
                onClick={() => { setActiveChannelId(ch.id); if (isMobile) setMobileView('chat'); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors mb-0.5',
                  activeChannelId === ch.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                )}
              >
                <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-sm truncate">{ch.name}</span>
              </button>
            ))}

            {voiceChannels.length > 0 && (
              <>
                <div className="px-2 mb-1 mt-3">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Salons vocaux</span>
                </div>
                {voiceChannels.map((ch: any) => (
                  <div key={ch.id} className="flex items-center gap-2 px-3 py-1.5 text-gray-600 rounded-lg">
                    <Volume2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-sm truncate">{ch.name}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Current user at bottom */}
      <div className="p-3 border-t border-white/5 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate">{user?.name}</div>
          <div className="flex items-center gap-1 text-xs text-green-400">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            En ligne
          </div>
        </div>
      </div>
    </div>
  );

  // ── Zone Chat ──────────────────────────────────────────────────
  const ChatArea = () => (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Header */}
      <div className="h-12 px-3 sm:px-4 flex items-center gap-2 border-b border-white/5 flex-shrink-0 bg-[#0D0D14]/80 backdrop-blur-md">
        {isMobile && (
          <button onClick={() => setMobileView('channels')} className="text-gray-400 hover:text-white p-1">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <Hash className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="font-semibold text-white text-sm">{activeChannel?.name || 'général'}</span>
        {activeChannel?.description && (
          <span className="text-xs text-gray-500 hidden sm:block truncate">— {activeChannel.description}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
            <Search className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
            <Bell className="w-4 h-4" />
          </button>
          {isMobile && (
            <button onClick={() => setMobileView('members')} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
              <Users className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-0.5">
        {!activeChannelId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Hash className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Sélectionnez un salon</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Hash className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-400">Début de #{activeChannel?.name}</p>
            <p className="text-xs mt-1">Soyez le premier à envoyer un message !</p>
          </div>
        ) : messages.map((msg: any, i: number) => {
          const prev = messages[i - 1];
          const isGrouped = prev && prev.user?.id === msg.user?.id &&
            new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;

          return (
            <div key={msg.id} className={cn('group flex items-start gap-3 rounded-lg px-2 py-1 hover:bg-white/[0.02]', isGrouped ? 'mt-0' : 'mt-3')}>
              {!isGrouped ? (
                <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {msg.user?.name?.[0]?.toUpperCase() || '?'}
                </div>
              ) : <div className="w-9 flex-shrink-0" />}

              <div className="flex-1 min-w-0">
                {!isGrouped && (
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-semibold text-white">{msg.user?.name}</span>
                    {msg.user?.role && ROLE_BADGE[msg.user.role] && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', ROLE_BADGE[msg.user.role].color)}>
                        {ROLE_BADGE[msg.user.role].label}
                      </span>
                    )}
                    <span className="text-xs text-gray-600">
                      {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {msg.content && !msg.attachments?.length && (
                  <p className="text-sm text-gray-300 leading-relaxed break-words">{msg.content}</p>
                )}
                {/* Attachments */}
                {msg.attachments?.map((att: string, ai: number) => {
                  try {
                    const file = JSON.parse(att);
                    const isImage = /^image\//.test(file.type);
                    return (
                      <div key={ai} className="mt-1">
                        {isImage ? (
                          <a href={file.url} target="_blank" rel="noopener noreferrer">
                            <img src={file.url} alt={file.name} className="max-w-[280px] sm:max-w-[360px] max-h-48 rounded-lg border border-white/10 object-cover hover:opacity-90 transition-opacity" />
                          </a>
                        ) : (
                          <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors max-w-xs">
                            <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs text-white truncate">{file.name}</div>
                              <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</div>
                            </div>
                            <Download className="w-3.5 h-3.5 text-gray-400" />
                          </a>
                        )}
                      </div>
                    );
                  } catch { return null; }
                })}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 sm:px-4 pb-3 pt-2 flex-shrink-0">
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
            <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-xs text-purple-300 flex-1 truncate">{selectedFile.name}</span>
            <span className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</span>
            <button onClick={() => setSelectedFile(null)} className="text-gray-500 hover:text-red-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 bg-[#1A1A24] border border-white/5 rounded-xl px-3 py-2 focus-within:border-purple-500/30 transition-colors">
          <button onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-purple-400 transition-colors">
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.zip,.mp4,.mp3,.txt,.doc,.docx"
            onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); e.target.value = ''; }} />
          <input
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
            placeholder={activeChannel ? `Envoyer dans #${activeChannel.name}` : 'Sélectionnez un salon'}
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={!activeChannelId}
          />
          <button
            onClick={handleSend}
            disabled={(!messageInput.trim() && !selectedFile) || sendMutation.isPending || !activeChannelId}
            className="w-8 h-8 flex items-center justify-center bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
          >
            {sendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Sidebar Membres ─────────────────────────────────────────────
  const MembersSidebar = () => (
    <div className="w-full md:w-52 bg-[#0A0A0F] border-l border-white/5 flex flex-col h-full flex-shrink-0">
      <div className="h-12 px-4 flex items-center gap-2 border-b border-white/5">
        {isMobile && (
          <button onClick={() => setMobileView('chat')} className="text-gray-400 hover:text-white mr-1">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <Users className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">En ligne — {onlineUsers.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {onlineUsers.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-8">Aucun membre en ligne</div>
        ) : onlineUsers.map((u: any) => (
          <div key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5">
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {u.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0A0A0F]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-300 truncate">{u.name}</div>
              {u.role && ROLE_BADGE[u.role] && (
                <span className={cn('text-[9px] px-1 py-0.5 rounded border', ROLE_BADGE[u.role].color)}>
                  {ROLE_BADGE[u.role].label}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Rendu mobile (full screen panels) ──────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col -m-4" style={{ height: 'calc(100vh - 64px)' }}>
        <AnimatePresence mode="wait">
          {mobileView === 'channels' && (
            <motion.div key="channels" initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
              <ChannelSidebar />
            </motion.div>
          )}
          {mobileView === 'chat' && (
            <motion.div key="chat" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col overflow-hidden">
              <ChatArea />
            </motion.div>
          )}
          {mobileView === 'members' && (
            <motion.div key="members" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
              <MembersSidebar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile bottom nav */}
        <div className="flex border-t border-white/10 bg-[#0A0A0F] flex-shrink-0">
          {[
            { view: 'channels' as const, icon: Hash, label: 'Salons' },
            { view: 'chat' as const, icon: MessageSquare, label: 'Chat' },
            { view: 'members' as const, icon: Users, label: 'Membres' },
          ].map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              onClick={() => setMobileView(view)}
              className={cn('flex-1 flex flex-col items-center gap-1 py-3 transition-colors', mobileView === view ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300')}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Rendu Desktop ───────────────────────────────────────────────
  return (
    <div className="flex -m-4 md:-m-6 overflow-hidden rounded-xl border border-white/5" style={{ height: 'calc(100vh - 80px)' }}>
      <ChannelSidebar />
      <ChatArea />
      <MembersSidebar />
    </div>
  );
}
