'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Gift, Copy, CheckCircle, Zap, Users, Share2, MessageCircle, Flame,
} from 'lucide-react';

function TaskCard({ task, onClaim }: { task: any; onClaim: (id: string) => void }) {
  const icons: Record<string, any> = {
    join_channel: MessageCircle,
    daily_login: Zap,
    referral: Users,
    share: Share2,
  };
  const Icon = icons[task.id] || Gift;

  return (
    <div className={`bg-[#0D0D14] border rounded-xl p-5 flex flex-col gap-3 ${task.completed ? 'border-green-500/30' : 'border-white/10'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.completed ? 'bg-green-500/20' : 'bg-purple-500/20'}`}>
            <Icon className={`w-5 h-5 ${task.completed ? 'text-green-400' : 'text-purple-400'}`} />
          </div>
          <div>
            <div className="font-medium text-white text-sm">{task.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{task.description}</div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-yellow-400 font-bold text-sm">+{task.reward}</div>
          <div className="text-xs text-gray-600">coins</div>
        </div>
      </div>

      {task.id === 'daily_login' && task.streak > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-orange-400">
          <Flame className="w-3.5 h-3.5" />
          <span>Streak : {task.streak} jour{task.streak > 1 ? 's' : ''} consécutifs</span>
        </div>
      )}

      {(task.id === 'share') && typeof task.progress === 'number' && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progression</span>
            <span>{task.progress}/{task.maxProgress}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (task.progress / task.maxProgress) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-1">
        {task.action && (
          <a
            href={task.action}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white rounded-lg text-center transition-colors"
          >
            Ouvrir
          </a>
        )}
        {task.completed ? (
          <div className="flex-1 py-2 text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-center flex items-center justify-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Complété
          </div>
        ) : (
          <button
            onClick={() => onClaim(task.id)}
            className="flex-1 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            Réclamer
          </button>
        )}
      </div>
    </div>
  );
}

export default function GrowthPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['growth-tasks'],
    queryFn: () => apiClient.get('/growth/tasks'),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: refData } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => apiClient.get('/growth/referral-stats'),
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.post(`/growth/complete/${taskId}`),
    onSuccess: (r: any) => {
      const msg = r?.data?.message || 'Récompense reçue !';
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['growth-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['coins-balance'] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Erreur');
    },
  });

  const tasks: any[] = tasksData?.data?.data?.tasks || [];
  const coins: number = tasksData?.data?.data?.coins || 0;
  const referralLink: string = refData?.data?.data?.referralLink || '';
  const totalReferred: number = refData?.data?.data?.totalReferred || 0;
  const totalEarned: number = refData?.data?.data?.totalEarned || 0;

  const copyRef = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Lien copié !');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
          <Gift className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Récompenses & Tâches</h1>
          <p className="text-sm text-gray-500">Complète des tâches pour gagner des coins</p>
        </div>
        <div className="ml-auto bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-center">
          <div className="text-lg font-bold text-yellow-400">{coins.toLocaleString('fr-FR')}</div>
          <div className="text-xs text-gray-500">coins</div>
        </div>
      </div>

      {/* Tasks grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#0D0D14] border border-white/5 rounded-xl p-5 h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tasks.map((task: any) => (
            <TaskCard
              key={task.id}
              task={task}
              onClaim={(id) => claimMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Referral section */}
      <div className="bg-[#0D0D14] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-white">Ton lien de parrainage</h2>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-400 truncate font-mono">
            {referralLink || `https://xhrishost.site?ref=${user?.id || '...'}`}
          </div>
          <button
            onClick={copyRef}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm flex items-center gap-1.5 transition-colors flex-shrink-0"
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{totalReferred}</div>
            <div className="text-xs text-gray-500 mt-0.5">amis invités</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{totalEarned}</div>
            <div className="text-xs text-gray-500 mt-0.5">coins gagnés</div>
          </div>
        </div>

        <p className="text-xs text-gray-600">
          Ton ami reçoit +5 coins à l'inscription, toi +10 coins par ami.
        </p>
      </div>
    </div>
  );
}
