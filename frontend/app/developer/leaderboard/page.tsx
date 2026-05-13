'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Trophy, Coins, Download, Zap, Medal, Loader2, Star } from 'lucide-react';
import { developerApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const RANK_STYLE = [
  { bg: 'bg-yellow-500', text: 'text-black' },
  { bg: 'bg-gray-400', text: 'text-black' },
  { bg: 'bg-orange-600', text: 'text-white' },
];

const TIER_REWARDS = [
  { icon: Trophy, rank: 'Top 1', coins: 500, badge: 'Légendaire', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { icon: Medal, rank: 'Top 2-3', coins: 300, badge: 'Expert', color: 'text-gray-300', bg: 'bg-gray-500/10' },
  { icon: Medal, rank: 'Top 4-10', coins: 150, badge: 'Pro', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { icon: Star, rank: 'Top 11-25', coins: 50, badge: 'Actif', color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const { data, isLoading } = useQuery({
    queryKey: ['dev-leaderboard'],
    queryFn: () => developerApi.getLeaderboard(),
  });

  const _rawLeaderboard = (data as any)?.data?.leaderboard ?? (data as any)?.data;
  const leaderboard: any[] = Array.isArray(_rawLeaderboard) ? _rawLeaderboard : [];
  const myRank: number | null = (data as any)?.data?.myRank || null;
  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Classement Développeurs</h1>
        <p className="text-gray-400 text-sm mt-1">Compétez et gagnez des Coins bonus chaque mois.</p>
      </div>

      {myRank && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
            #{myRank}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Votre position actuelle</div>
            <div className="text-xs text-gray-400">Publiez plus de bots pour grimper</div>
          </div>
        </div>
      )}

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[top3[1], top3[0], top3[2]].map((dev: any, idx: number) => {
            const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const rs = RANK_STYLE[rank - 1];
            return (
              <motion.div key={dev.id || idx}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                className={cn('bg-[#111118] border border-white/5 rounded-xl p-4 text-center', rank === 1 && 'ring-2 ring-yellow-500/30 scale-105')}>
                <div className={`w-9 h-9 ${rs.bg} rounded-full flex items-center justify-center text-sm font-bold ${rs.text} mx-auto mb-2`}>{rank}</div>
                <div className="w-11 h-11 bg-purple-500/20 rounded-full flex items-center justify-center text-lg font-bold text-purple-400 mx-auto mb-1">
                  {dev.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="text-xs font-semibold text-white truncate">{dev.name}</div>
                <div className="flex items-center justify-center gap-1 mt-1 text-xs text-amber-400">
                  <Coins className="w-3 h-3" />{(dev.coins || 0).toLocaleString()}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-white">Classement complet</h3>
          {isLoading && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
        </div>
        {leaderboard.length === 0 ? (
          <div className="text-center py-10">
            <Trophy className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucun développeur classé pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {leaderboard.map((dev: any, i: number) => {
              const rank = i + 1;
              const isMe = dev.userId === user?.id;
              const rs = RANK_STYLE[rank - 1];
              return (
                <div key={dev.id || i}
                  className={cn('flex items-center gap-3 px-5 py-3.5 transition-colors', isMe ? 'bg-purple-500/5' : 'hover:bg-white/[0.03]')}>
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    rs ? `${rs.bg} ${rs.text}` : 'bg-white/10 text-gray-400')}>
                    {rank}
                  </div>
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-sm font-bold text-purple-400 flex-shrink-0">
                    {dev.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-white truncate">{dev.name}</span>
                      {isMe && <span className="text-xs text-purple-400">(Vous)</span>}
                    </div>
                    <div className="text-xs text-gray-500">{dev.bots || 0} bots</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    <span className="hidden sm:flex items-center gap-1 text-blue-400"><Download className="w-3 h-3" />{(dev.downloads || 0).toLocaleString()}</span>
                    <span className="hidden sm:flex items-center gap-1 text-green-400"><Zap className="w-3 h-3" />{(dev.deploys || 0).toLocaleString()}</span>
                    <span className="flex items-center gap-1 text-amber-400 font-semibold"><Coins className="w-3.5 h-3.5" />{(dev.coins || 0).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rewards */}
      <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Récompenses mensuelles par rang</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TIER_REWARDS.map(t => (
            <div key={t.rank} className={`${t.bg} border border-white/5 rounded-xl p-4 text-center`}>
              <t.icon className={`w-6 h-6 ${t.color} mx-auto mb-2`} />
              <div className="text-xs font-semibold text-white">{t.rank}</div>
              <div className={`text-xl font-bold ${t.color}`}>+{t.coins}</div>
              <div className="text-xs text-gray-400">Coins/mois</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
