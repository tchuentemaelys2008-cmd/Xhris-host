'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Hash, Volume2, Plus, Search, Send, Paperclip,
  Users, Bell, FileText, Download, X, Loader2,
  MessageSquare, ChevronLeft, Reply, AtSign,
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

  // All state at top level — NOT inside nested components
  const [activeChannelId, setActiveChannelId] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; content: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mobileView, setMobileView] = useState<'channels' | 'chat' | 'members'>('channels');
  const [isMobile, setIsMobile] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Track actual visible viewport height (excludes keyboard on mobile)
  const [viewportH, setViewportH] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Track visual viewport (shrinks when keyboard opens on mobile)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const update = () => setViewportH(vv.height);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

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
      const ch = channels.find((c: any) => c.name === 'général' || c.name === 'general') || channels[0];
      if (ch) { setActiveChannelId(ch.id); if (isMobile) setMobileView('chat'); }
    }
  }, [channels, activeChannelId, isMobile]);

  const { data: messagesData, refetch: refetchMessages } = useQuery({
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

  useEffect(() => {
    if (!user) return;
    communityApi.updatePresence().catch(() => {});
    const interval = setInterval(() => communityApi.updatePresence().catch(() => {}), 60_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const sendMutation = useMutation({
    mutationFn: ({ content, channelId }: { content: string; channelId: string }) =>
      communityApi.sendMessage(channelId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-messages', activeChannelId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur envoi'),
  });

  const handleSend = async () => {
    if (selectedFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const token = localStorage.getItem('auth_token') || (session as any)?.accessToken;
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        const res = await fetch(`${backendUrl}/api/community/channels/${activeChannelId}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error('Upload échoué');
        setSelectedFile(null);
        qc.invalidateQueries({ queryKey: ['community-messages', activeChannelId] });
        toast.success('Fichier envoyé !');
      } catch { toast.error('Erreur upload fichier'); }
      finally { setUploading(false); }
      return;
    }

    const raw = messageInput.trim();
    if (!raw || !activeChannelId) return;

    // Build content with reply prefix
    const content = replyTo
      ? `@${replyTo.name} ↩ ${raw}`
      : raw;

    setMessageInput('');
    setReplyTo(null);
    sendMutation.mutate({ content, channelId: activeChannelId });
    // Keep focus on input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleReply = (msg: any) => {
    setReplyTo({ id: msg.id, name: msg.user?.name || 'Utilisateur', content: msg.content?.slice(0, 60) || '' });
    inputRef.current?.focus();
  };

  const addMention = (name: string) => {
    setMessageInput(prev => `${prev}@${name} `);
    inputRef.current?.focus();
  };

  const activeChannel = channels.find((c: any) => c.id === activeChannelId);
  const textChannels = channels.filter((c: any) => c.type !== 'VOICE');
  const voiceChannels = channels.filter((c: any) => c.type === 'VOICE');

  // ─── Channel Sidebar JSX ──────────────────────────────────────────
  const channelSidebarJsx = (
    <div className="w-full md:w-56 bg-[#0A0A0F] border-r border-white/5 flex flex-col h-full flex-shrink-0">
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/5">
        <span className="font-semibold text-white text-sm">Communauté</span>
        {['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(user?.role) && (
          <button
            onClick={() => {
              const name = prompt('Nom du nouveau salon :');
              if (name) apiClient.post('/community/channels', { name, type: 'TEXT' })
                .then(() => qc.invalidateQueries({ queryKey: ['community-channels'] }))
                .catch(() => toast.error('Erreur'));
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2">
        {channels.length === 0 ? (
          <div className="text-xs text-gray-600 px-3 py-4 text-center">Chargement...</div>
        ) : (
          <>
            <div className="px-2 mb-1 mt-1">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Texte</span>
            </div>
            {textChannels.map((ch: any) => (
              <button
                key={ch.id}
                onClick={() => { setActiveChannelId(ch.id); if (isMobile) setMobileView('chat'); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors mb-0.5',
                  activeChannelId === ch.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                )}
              >
                <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-sm truncate">{ch.name}</span>
              </button>
            ))}
            {voiceChannels.length > 0 && (
              <>
                <div className="px-2 mb-1 mt-3">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Vocal</span>
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

      <div className="p-3 border-t border-white/5 flex items-center gap-2">
        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate">{user?.name}</div>
          <div className="flex items-center gap-1 text-xs text-green-400">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />En ligne
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Messages list JSX ────────────────────────────────────────────
  const messagesJsx = (
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

        const isReply = msg.content?.startsWith('@') && msg.content?.includes(' ↩ ');
        let replyPart = '';
        let mainContent = msg.content || '';
        if (isReply) {
          const idx = msg.content.indexOf(' ↩ ');
          replyPart = msg.content.slice(0, idx);
          mainContent = msg.content.slice(idx + 3);
        }

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
                  <button
                    onClick={() => addMention(msg.user?.name)}
                    className="text-sm font-semibold text-white hover:underline"
                  >
                    {msg.user?.name}
                  </button>
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

              {/* Reply quote */}
              {isReply && (
                <div className="flex items-start gap-1.5 mb-1 pl-2 border-l-2 border-purple-500/50">
                  <Reply className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-500 truncate">{replyPart} : {mainContent.slice(0, 50)}</span>
                </div>
              )}

              {/* Message content */}
              {!msg.attachments?.length && (
                <p className="text-sm text-gray-300 leading-relaxed break-words">
                  {isReply ? mainContent : msg.content}
                </p>
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
                          <img src={file.url} alt={file.name} className="max-w-[280px] sm:max-w-sm max-h-48 rounded-lg border border-white/10 object-cover hover:opacity-90 transition-opacity" />
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

            {/* Reply button — visible on hover */}
            <button
              onClick={() => handleReply(msg)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-500 hover:text-purple-400 hover:bg-white/10 flex-shrink-0"
              title="Répondre"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );

  // ─── Input bar JSX ────────────────────────────────────────────────
  const inputBarJsx = (
    <div className="px-3 sm:px-4 pb-3 pt-2 flex-shrink-0">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-1.5">
          <Reply className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="text-xs text-purple-300">Répondre à <strong>{replyTo.name}</strong> : {replyTo.content}</span>
          <button onClick={() => setReplyTo(null)} className="ml-auto text-gray-500 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* File preview */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-blue-300 flex-1 truncate">{selectedFile.name}</span>
          <span className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</span>
          <button onClick={() => setSelectedFile(null)} className="text-gray-500 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 bg-[#1A1A24] border border-white/5 rounded-xl px-3 py-2 focus-within:border-purple-500/30 transition-colors">
        <button onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-purple-400 transition-colors flex-shrink-0">
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.zip,.mp4,.mp3,.txt,.doc,.docx"
          onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); e.target.value = ''; }}
        />
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none min-w-0"
          placeholder={activeChannel ? `Envoyer dans #${activeChannel.name}` : 'Sélectionnez un salon'}
          value={messageInput}
          onChange={e => setMessageInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={!activeChannelId}
        />
        <button
          onClick={handleSend}
          disabled={(!messageInput.trim() && !selectedFile) || sendMutation.isPending || uploading || !activeChannelId}
          className="w-8 h-8 flex items-center justify-center bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
        >
          {(sendMutation.isPending || uploading) ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
        </button>
      </div>
    </div>
  );

  // ─── Members sidebar JSX ─────────────────────────────────────────
  const membersSidebarJsx = (
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
          <button
            key={u.id}
            onClick={() => addMention(u.name)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left"
            title={`Mentionner @${u.name}`}
          >
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {u.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0A0A0F]" />
            </div>
            <div className="flex-1 min-w-0">
              {u.role && ROLE_BADGE[u.role] && (
                <span className={cn('text-[9px] px-1 py-0.5 rounded border', ROLE_BADGE[u.role].color)}>
                  {ROLE_BADGE[u.role].label}
                </span>
              )}
              <div className="text-xs text-gray-300 truncate mt-0.5">{u.name}</div>
            </div>
            <AtSign className="w-3 h-3 text-gray-600 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Chat area header ─────────────────────────────────────────────
  const chatHeaderJsx = (
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
        {isMobile && (
          <button onClick={() => setMobileView('members')} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
            <Users className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  // ─── Mobile render ────────────────────────────────────────────────
  if (isMobile) {
    // Keyboard is open when viewportH is significantly less than screen height
    const keyboardOpen = viewportH !== null && viewportH < window.innerHeight * 0.75;
    // In chat view with keyboard open, hide bottom nav so input is fully visible
    const hideBottomNav = mobileView === 'chat' && keyboardOpen;

    return (
      <div
        className="flex flex-col -m-4 overflow-hidden"
        style={{ height: viewportH ? `${viewportH}px` : 'calc(100dvh - 64px)' }}
      >
        <AnimatePresence mode="wait">
          {mobileView === 'channels' && (
            <motion.div key="ch" initial={{ x: -200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -200, opacity: 0 }} transition={{ duration: 0.18 }} className="flex-1 overflow-hidden">
              {channelSidebarJsx}
            </motion.div>
          )}
          {mobileView === 'chat' && (
            <motion.div
              key="chat"
              initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 200, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              {/* Header — always visible */}
              {chatHeaderJsx}
              {/* Messages — fills remaining space, scrollable */}
              {messagesJsx}
              {/* Input — always pinned at bottom, above keyboard */}
              <div className="flex-shrink-0 bg-[#0D0D14]">
                {inputBarJsx}
              </div>
            </motion.div>
          )}
          {mobileView === 'members' && (
            <motion.div key="mb" initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 200, opacity: 0 }} transition={{ duration: 0.18 }} className="flex-1 overflow-hidden">
              {membersSidebarJsx}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom nav — hidden when keyboard is open in chat to free vertical space */}
        {!hideBottomNav && (
          <div className="flex border-t border-white/10 bg-[#0A0A0F] flex-shrink-0">
            {[
              { view: 'channels' as const, icon: Hash,          label: 'Salons' },
              { view: 'chat'     as const, icon: MessageSquare, label: 'Chat' },
              { view: 'members'  as const, icon: Users,         label: 'Membres' },
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
        )}
      </div>
    );
  }

  // ─── Desktop render ───────────────────────────────────────────────
  return (
    <div className="flex -m-4 md:-m-6 overflow-hidden rounded-xl border border-white/5" style={{ height: 'calc(100dvh - 80px)' }}>
      {channelSidebarJsx}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {chatHeaderJsx}
        {messagesJsx}
        {inputBarJsx}
      </div>

      {membersSidebarJsx}
    </div>
  );
}
