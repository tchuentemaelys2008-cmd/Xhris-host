'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { Gift, Copy, CheckCircle, Users, Share2, MessageCircle, Lock } from 'lucide-react';

// ─── constants ────────────────────────────────────────────────────────────────
const MILESTONES = [
  { days: 10, bonus: 50 },
  { days: 30, bonus: 150 },
  { days: 50, bonus: 250 },
  { days: 60, bonus: 300 },
];

// ─── Flame SVG ────────────────────────────────────────────────────────────────
function FlameIcon({ state }: { state: 'done' | 'active' | 'broken' | 'new' }) {
  const color =
    state === 'done'   ? '#22c55e' :
    state === 'active' ? '#f97316' :
    '#374151';
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color}
      className={`w-full h-full drop-shadow-lg transition-all duration-500 ${state === 'active' ? 'animate-pulse' : ''}`}
    >
      <path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32C8.87 6.4 7.85 10.07 9.07 13.22c.04.1.08.2.08.33 0 .22-.15.42-.35.5-.23.1-.47.04-.66-.12-.06-.05-.1-.1-.14-.17-1.13-1.43-1.31-3.48-.55-5.12C5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5.14.6.41 1.16.71 1.66C7.08 19.32 8.95 20.55 10.96 20.92c2.14.4 4.43.14 6.32-.99 2.04-1.25 3.26-3.52 3.22-5.95-.05-1.06-.4-2.05-.94-2.92-.59.17-1.24.21-1.9.14z"/>
    </svg>
  );
}

// ─── Streak Hero ─────────────────────────────────────────────────────────────
function StreakHero({ task, onClaim, claiming }: { task: any; onClaim: () => void; claiming: boolean }) {
  const streak: number = task?.streak || 0;
  const completed: boolean = !!task?.completed;
  const lastClaimedAt: string | null = task?.lastClaimedAt || null;
  const unlockedMilestones: number[] = task?.milestonesCompleted || [];

  // Determine flame state
  let flameState: 'done' | 'active' | 'broken' | 'new' = 'new';
  if (completed) {
    flameState = 'done';
  } else if (lastClaimedAt) {
    const hoursAgo = (Date.now() - new Date(lastClaimedAt).getTime()) / 3600000;
    flameState = hoursAgo < 48 ? 'active' : 'broken';
  }

  const nextMilestone = MILESTONES.find(m => !unlockedMilestones.includes(m.days));
  const prevMilestone = [...MILESTONES].reverse().find(m => unlockedMilestones.includes(m.days));
  const progressFrom = prevMilestone?.days || 0;
  const progressTo = nextMilestone?.days || 60;
  const progressPct = nextMilestone
    ? Math.min(100, Math.round(((streak - progressFrom) / (progressTo - progressFrom)) * 100))
    : 100;

  const stateLabel = {
    done:   'Flamme activée aujourd\'hui !',
    active: streak > 0 ? 'Active ta flamme aujourd\'hui !' : 'Lance ton streak !',
    broken: 'Streak perdu… recommence !',
    new:    'Lance ton premier streak !',
  }[flameState];

  const stateColor = {
    done: 'text-green-400', active: 'text-orange-400', broken: 'text-gray-500', new: 'text-gray-500',
  }[flameState];

  return (
    <div className="bg-[#0D0D14] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Top row: flame + streak number + label */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
          <FlameIcon state={flameState} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl sm:text-4xl font-black text-white">{streak}</span>
            <span className="text-sm text-gray-400 font-medium">
              jour{streak !== 1 ? 's' : ''} consécutifs
            </span>
          </div>
          <div className={`text-sm font-medium mt-0.5 ${stateColor}`}>{stateLabel}</div>
          {flameState === 'active' && streak > 0 && (
            <div className="text-xs text-gray-600 mt-0.5">
              +{Math.min(15, streak)} coins streak inclus
            </div>
          )}
        </div>
        {/* Reward badge */}
        <div className="flex-shrink-0 text-center bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 hidden sm:block">
          <div className="text-lg font-bold text-yellow-400">+{task?.reward || 5}</div>
          <div className="text-xs text-gray-600">coins</div>
        </div>
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{streak}j / {nextMilestone.days}j</span>
            <span>+{nextMilestone.bonus} coins au palier</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                flameState === 'done' ? 'bg-green-500' :
                flameState === 'active' ? 'bg-orange-500' :
                'bg-gray-600'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Milestone badges */}
      <div className="grid grid-cols-4 gap-2">
        {MILESTONES.map(m => {
          const unlocked = unlockedMilestones.includes(m.days);
          const isNext = m === nextMilestone;
          return (
            <div
              key={m.days}
              className={`rounded-xl p-2 sm:p-3 text-center border transition-all ${
                unlocked
                  ? 'bg-orange-500/20 border-orange-500/40'
                  : isNext
                  ? 'bg-white/5 border-white/20 border-dashed'
                  : 'bg-white/[0.03] border-white/5'
              }`}
            >
              <div className="text-lg sm:text-xl mb-0.5">
                {unlocked ? '🔥' : isNext ? '⏳' : <Lock className="w-4 h-4 text-gray-700 mx-auto" />}
              </div>
              <div className={`text-xs font-bold ${unlocked ? 'text-orange-300' : isNext ? 'text-gray-400' : 'text-gray-700'}`}>
                {m.days}j
              </div>
              <div className={`text-[10px] ${unlocked ? 'text-orange-400' : isNext ? 'text-yellow-600' : 'text-gray-700'}`}>
                +{m.bonus}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA button */}
      {completed ? (
        <div className="w-full py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-semibold text-sm flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Activée aujourd'hui — Reviens demain !
        </div>
      ) : (
        <button
          onClick={onClaim}
          disabled={claiming}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            flameState === 'broken' || flameState === 'new'
              ? 'bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50'
              : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white shadow-lg shadow-orange-500/20 disabled:opacity-50'
          }`}
        >
          {claiming ? (
            'En cours…'
          ) : flameState === 'broken' ? (
            '🔁 Recommencer le streak'
          ) : (
            `🔥 Activer ma flamme  +${task?.reward || 5} coins`
          )}
        </button>
      )}
    </div>
  );
}

// ─── Task Card (for non-daily tasks) ─────────────────────────────────────────
function TaskCard({ task, onClaim, claiming }: { task: any; onClaim: (id: string) => void; claiming: boolean }) {
  const iconMap: Record<string, any> = {
    join_channel: MessageCircle,
    referral: Users,
    share: Share2,
  };
  const Icon = iconMap[task.id] || Gift;

  return (
    <div className={`bg-[#0D0D14] border rounded-xl p-4 sm:p-5 space-y-3 ${task.completed ? 'border-green-500/20' : 'border-white/10'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${task.completed ? 'bg-green-500/15' : 'bg-purple-500/15'}`}>
          <Icon className={`w-4 h-4 ${task.completed ? 'text-green-400' : 'text-purple-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white leading-tight">{task.title}</div>
          <div className="text-xs text-gray-500 mt-0.5 leading-snug">{task.description}</div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-yellow-400 font-bold text-sm">+{task.reward}</div>
          <div className="text-[10px] text-gray-600">coins</div>
        </div>
      </div>

      {task.id === 'share' && typeof task.progress === 'number' && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-gray-600">
            <span>Progression</span><span>{task.progress}/{task.maxProgress} jours</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (task.progress / task.maxProgress) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {task.id === 'referral' && (
        <div className="text-xs text-gray-600">
          {task.progress} ami{task.progress !== 1 ? 's' : ''} invité{task.progress !== 1 ? 's' : ''}
        </div>
      )}

      <div className="flex gap-2">
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
          <div className="flex-1 py-2 text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-center flex items-center justify-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Complété
          </div>
        ) : (
          <button
            onClick={() => onClaim(task.id)}
            disabled={claiming}
            className="flex-1 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            Réclamer
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GrowthPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

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
    onSuccess: (r: any, taskId: string) => {
      const data = r?.data?.data;
      const msg = r?.data?.message || 'Récompense reçue !';
      toast.success(msg, { duration: 4000 });
      if (data?.milestoneUnlocked) {
        setTimeout(() => {
          toast.success(`🏆 Palier ${data.milestoneUnlocked.days} jours débloqué ! +${data.milestoneUnlocked.bonus} coins bonus`, { duration: 5000 });
        }, 800);
      }
      queryClient.invalidateQueries({ queryKey: ['growth-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['coins-balance'] });
      setClaimingId(null);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Erreur');
      setClaimingId(null);
    },
  });

  const handleClaim = (taskId: string) => {
    setClaimingId(taskId);
    claimMutation.mutate(taskId);
  };

  const tasks: any[] = tasksData?.data?.data?.tasks || [];
  const coins: number = tasksData?.data?.data?.coins || 0;
  const referralLink: string = refData?.data?.data?.referralLink || `https://xhrishost.site?ref=${user?.id || ''}`;
  const totalReferred: number = refData?.data?.data?.totalReferred || 0;
  const totalEarned: number = refData?.data?.data?.totalEarned || 0;

  const dailyTask = tasks.find(t => t.id === 'daily_login');
  const otherTasks = tasks.filter(t => t.id !== 'daily_login');

  const copyRef = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Lien copié !');
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-2xl mx-auto pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <Gift className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">Récompenses & Tâches</h1>
          <p className="text-xs sm:text-sm text-gray-500">Complète des tâches pour gagner des coins</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5 text-center flex-shrink-0">
          <div className="text-base font-bold text-yellow-400 leading-tight">{coins.toLocaleString('fr-FR')}</div>
          <div className="text-[10px] text-gray-600">coins</div>
        </div>
      </div>

      {/* Streak Hero */}
      {isLoading ? (
        <div className="bg-[#0D0D14] border border-white/5 rounded-2xl p-6 h-56 animate-pulse" />
      ) : dailyTask ? (
        <StreakHero
          task={dailyTask}
          onClaim={() => handleClaim('daily_login')}
          claiming={claimingId === 'daily_login'}
        />
      ) : null}

      {/* Other tasks */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#0D0D14] border border-white/5 rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {otherTasks.map((task: any) => (
            <TaskCard
              key={task.id}
              task={task}
              onClaim={handleClaim}
              claiming={claimingId === task.id}
            />
          ))}
        </div>
      )}

      {/* Referral section */}
      <div className="bg-[#0D0D14] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <h2 className="font-semibold text-white text-sm">Ton lien de parrainage</h2>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 truncate font-mono">
            {referralLink}
          </div>
          <button
            onClick={copyRef}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors flex-shrink-0"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copié' : 'Copier'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-white">{totalReferred}</div>
            <div className="text-xs text-gray-500 mt-0.5">amis invités</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-yellow-400">{totalEarned}</div>
            <div className="text-xs text-gray-500 mt-0.5">coins gagnés</div>
          </div>
        </div>

        <p className="text-[11px] text-gray-600 leading-relaxed">
          Ton ami reçoit +5 coins à l'inscription · Toi +10 coins par ami inscrit
        </p>
      </div>
    </div>
  );
}
