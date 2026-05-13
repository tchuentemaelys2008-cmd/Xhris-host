'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Copy, Users, Coins, Gift, Share2, CheckCircle, Loader2 } from 'lucide-react';
import { coinsApi } from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';

const REFERRAL_TIERS = [
  { min: 0, max: 4, label: 'Débutant', bonus: 5, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  { min: 5, max: 14, label: 'Actif', bonus: 8, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { min: 15, max: 29, label: 'Pro', bonus: 12, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { min: 30, max: Infinity, label: 'Légendaire', bonus: 20, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
];

export default function ReferralPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const { data, isLoading } = useQuery({
    queryKey: ['referral'],
    queryFn: () => coinsApi.getReferralStats(),
    enabled: !!user,
  });

  const { data: leaderData } = useQuery({
    queryKey: ['referral-leaderboard'],
    queryFn: () => coinsApi.getReferralLeaderboard(),
  });

  const referral = (data as any)?.data || {};
  const _rawLeader = (leaderData as any)?.data?.leaderboard ?? (leaderData as any)?.data;
  const leaderboard: any[] = Array.isArray(_rawLeader) ? _rawLeader : [];

  const referralLink = typeof window !== 'undefined' && referral.referralCode
    ? `${window.location.origin}/auth/register?ref=${referral.referralCode}`
    : '';

  const totalRefs = referral.totalReferrals ?? 0;
  const currentTier = REFERRAL_TIERS.find(t => totalRefs >= t.min && totalRefs <= t.max) || REFERRAL_TIERS[0];
  const nextTier = REFERRAL_TIERS[REFERRAL_TIERS.indexOf(currentTier) + 1];

  const shareOn = (platform: string) => {
    const msg = encodeURIComponent(`Rejoins XHRIS Host et gagne des Coins ! ${referralLink}`);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${msg}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Rejoins XHRIS Host !')}`,
      twitter: `https://twitter.com/intent/tweet?text=${msg}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Programme de Parrainage</h1>
        <p className="text-gray-400 text-sm mt-1">Invitez des amis, gagnez des Coins à chaque inscription.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { icon: Users, label: 'Filleuls', value: totalRefs, color: 'text-blue-400', bg: 'from-blue-500/10 to-cyan-500/5' },
          { icon: Coins, label: 'Coins gagnés', value: referral.coinsEarned ?? 0, color: 'text-amber-400', bg: 'from-amber-500/10 to-yellow-500/5' },
          { icon: Gift, label: 'Bonus/filleul', value: `${currentTier.bonus} Coins`, color: 'text-purple-400', bg: 'from-purple-500/10 to-indigo-500/5' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`bg-gradient-to-br ${s.bg} border border-white/5 rounded-xl p-5`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <div className="text-xs text-gray-400">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : s.value}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tier + link */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral link */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-purple-400" />
            Votre lien de parrainage
          </h3>
          {referralLink ? (
            <>
              <div className="flex gap-2">
                <div className="flex-1 bg-[#1A1A24] border border-white/5 rounded-lg px-3 py-2.5 text-xs text-purple-400 truncate font-mono">
                  {referralLink}
                </div>
                <button onClick={() => copyToClipboard(referralLink).then(() => toast.success('Lien copié !'))}
                  className="btn-secondary px-3 flex-shrink-0">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-2">Partager sur</div>
                <div className="flex gap-2">
                  {[
                    { key: 'whatsapp', label: 'WhatsApp', cls: 'hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30' },
                    { key: 'telegram', label: 'Telegram', cls: 'hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30' },
                    { key: 'twitter', label: 'Twitter', cls: 'hover:bg-sky-500/10 hover:text-sky-400 hover:border-sky-500/30' },
                  ].map(s => (
                    <button key={s.key} onClick={() => shareOn(s.key)}
                      className={`flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 transition-all ${s.cls}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">Lien non disponible</div>
          )}
        </div>

        {/* Tier progress */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Niveau actuel</h3>
          <div className={`${currentTier.bg} border border-white/10 rounded-xl p-4 mb-4`}>
            <div className={`text-lg font-bold ${currentTier.color} mb-1`}>{currentTier.label}</div>
            <div className="text-sm text-gray-400">+{currentTier.bonus} Coins par filleul</div>
          </div>
          {nextTier && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{totalRefs} filleuls</span>
                <span>{nextTier.min} requis pour {nextTier.label}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalRefs / nextTier.min) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {REFERRAL_TIERS.map(t => (
              <div key={t.label} className={`flex items-center gap-3 p-2.5 rounded-lg ${t.bg}`}>
                {totalRefs >= t.min ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20" />}
                <span className={`text-xs font-medium flex-1 ${t.color}`}>{t.label}</span>
                <span className="text-xs text-gray-400">{t.min}+ filleuls</span>
                <span className={`text-xs font-bold ${t.color}`}>+{t.bonus}/filleul</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="font-semibold text-white">Top Parrains</h3>
          </div>
          <div className="divide-y divide-white/5">
            {leaderboard.slice(0, 5).map((entry: any, i: number) => (
              <div key={entry.referrerId || i} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-orange-600 text-white' : 'bg-white/10 text-gray-400'
                }`}>{i + 1}</div>
                <div className="w-7 h-7 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
                  {entry.user?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{entry.user?.name || 'Anonyme'}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <Coins className="w-3 h-3" />
                  {entry.coins || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
