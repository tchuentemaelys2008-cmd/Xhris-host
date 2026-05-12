'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Coins, Send, Link2, Copy, Gift, Tag, ArrowUpRight, ArrowDownLeft,
  Clock, Loader2, Share2, Trophy, UserCheck, UserX,
} from 'lucide-react';
import { coinsApi, apiClient } from '@/lib/api';
import { useCoinsBalance, useInvalidateBalance } from '@/lib/useCoinsBalance';
import { formatDateTime, cn, copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

const TX_TABS = ['Tous', 'Recus', 'Envoyes', 'Bonus', 'Depenses'];

// ─── Lookup utilisateur ───────────────────────────────────────────
async function lookupUser(id: string) {
  try {
    const res = await apiClient.get(`/users/lookup/${id.trim()}`);
    return (res as any)?.data?.data as { id: string; name: string } | null;
  } catch {
    return null;
  }
}

export default function CoinsPage() {
  const { data: session } = useSession();
  const qc   = useQueryClient();
  const user = session?.user as any;

  // ── Hydration guard — évite les erreurs #418/#423/#425 ───────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [txTab, setTxTab]               = useState('Tous');
  const [transferId, setTransferId]     = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [bonusCode, setBonusCode]       = useState('');
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [countdown, setCountdown]       = useState('');

  // ── Lookup état ──────────────────────────────────────────────────
  const [recipient, setRecipient]   = useState<{ id: string; name: string } | null>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Queries ──────────────────────────────────────────────────────
  const { balance } = useCoinsBalance();
  const invalidateBalance = useInvalidateBalance();
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['coins-transactions', txTab],
    queryFn:  () => coinsApi.getTransactions({ type: txTab === 'Tous' ? undefined : txTab.toUpperCase() }),
  });
  const { data: referralData } = useQuery({
    queryKey: ['referral'],
    queryFn:  () => coinsApi.getReferralStats(),
    enabled:  !!user,
  });
  const { data: leaderboardData } = useQuery({
    queryKey: ['referral-leaderboard'],
    queryFn:  () => coinsApi.getReferralLeaderboard(),
  });

  const _raw_transactions = (txData as any)?.data?.transactions ?? (txData as any)?.data ?? [];
  const transactions: any[] = Array.isArray(_raw_transactions) ? _raw_transactions : [];
  const _rawReferral  = (referralData as any)?.data ?? {};
  const referral      = _rawReferral && !Array.isArray(_rawReferral) ? _rawReferral : {};
  const _raw_leaderboard = (leaderboardData as any)?.data ?? [];
  const leaderboard: any[] = Array.isArray(_raw_leaderboard) ? _raw_leaderboard : [];

  // ── Countdown bonus quotidien ────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now      = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Lookup avec debounce 600ms ───────────────────────────────────
  useEffect(() => {
    const id = transferId.trim();
    setRecipient(null);
    setLookupState('idle');
    if (!id || id.length < 4) return;
    if (id === user?.id) { setLookupState('notfound'); return; }
    setLookupState('loading');
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(async () => {
      const found = await lookupUser(id);
      if (found) { setRecipient(found); setLookupState('found'); }
      else setLookupState('notfound');
    }, 600);
    return () => { if (lookupTimer.current) clearTimeout(lookupTimer.current); };
  }, [transferId, user?.id]);

  // ── Calcul frais ─────────────────────────────────────────────────
  const FEE            = 1;
  const amountNum      = Number(transferAmount) || 0;
  const total          = amountNum + FEE;
  const notEnoughFunds = amountNum > 0 && total > balance;
  const canSend        = lookupState === 'found' && amountNum >= 1 && !notEnoughFunds;

  // ── Mutations ────────────────────────────────────────────────────
  const transferMutation = useMutation({
    mutationFn: () => coinsApi.transfer(transferId.trim(), amountNum),
    onSuccess: () => {
      invalidateBalance();
      qc.invalidateQueries({ queryKey: ['coins-transactions'] });
      setTransferId('');
      setTransferAmount('');
      setRecipient(null);
      setLookupState('idle');
      toast.success(`${amountNum} Coins envoyés à ${recipient?.name} !`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors du transfert'),
  });

  const claimMutation = useMutation({
    mutationFn: () => coinsApi.claimDailyBonus(),
    onSuccess: () => {
      setDailyClaimed(true);
      invalidateBalance();
      toast.success('+3 Coins bonus quotidien !');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e.message),
  });

  const bonusMutation = useMutation({
    mutationFn: () => coinsApi.applyBonusCode(bonusCode),
    onSuccess: (data: any) => {
      invalidateBalance();
      setBonusCode('');
      toast.success(`+${data?.data?.data?.coins ?? data?.data?.coins ?? '?'} Coins ajoutés !`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e.message),
  });

  // ── Icônes et labels transactions ────────────────────────────────
  const txTypeIcon = (type: string) => {
    switch (type) {
      case 'DAILY_BONUS':        return <Gift className="w-4 h-4 text-yellow-400" />;
      case 'REFERRAL':           return <Share2 className="w-4 h-4 text-green-400" />;
      case 'TRANSFER_SENT':      return <Send className="w-4 h-4 text-red-400" />;
      case 'TRANSFER_RECEIVED':  return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
      case 'PURCHASE':           return <Coins className="w-4 h-4 text-blue-400" />;
      case 'BONUS_CODE':         return <Tag className="w-4 h-4 text-purple-400" />;
      case 'DEPLOY_BOT':         return <ArrowUpRight className="w-4 h-4 text-red-400" />;
      default:                   return <Coins className="w-4 h-4 text-gray-400" />;
    }
  };

  const txTypeLabel: Record<string, string> = {
    DAILY_BONUS:       'Bonus quotidien',
    REFERRAL:          'Parrainage',
    TRANSFER_SENT:     'Envoi',
    TRANSFER_RECEIVED: 'Réception',
    PURCHASE:          'Achat',
    BONUS_CODE:        'Code bonus',
    DEPLOY_BOT:        'Déploiement bot',
    CREATE_SERVER:     'Création serveur',
    ADMIN_GRANT:       'Crédit admin',
  };

  // ── Liens (seulement côté client après montage) ──────────────────
  const origin      = mounted ? window.location.origin : '';
  const requestLink = `${origin}/request/${user?.name || ''}`;
  const referralLink = referral.referralCode
    ? `${origin}/auth/register?ref=${referral.referralCode}`
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Gérer mes Coins</h1>
        <p className="text-gray-400 text-sm mt-1">
          Consultez, envoyez, recevez et gérez vos Coins facilement.
        </p>
      </div>

      {/* ── Statistiques solde ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'SOLDE ACTUEL',   value: balance, sub: '+5 aujourd\'hui', subColor: 'text-green-400',  icon: Coins,         bg: 'from-yellow-500/10 to-orange-500/5' },
          { label: 'TOTAL GAGNÉ',    value: transactions.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0), sub: 'Tout le temps', subColor: 'text-gray-400', icon: ArrowDownLeft, bg: 'from-green-500/10 to-emerald-500/5' },
          { label: 'TOTAL DÉPENSÉ',  value: Math.abs(transactions.filter(t => t.amount < 0).reduce((a, t) => a + t.amount, 0)), sub: 'Tout le temps', subColor: 'text-gray-400', icon: ArrowUpRight, bg: 'from-red-500/10 to-rose-500/5' },
          { label: 'EN ATTENTE',     value: 0,       sub: 'Transactions en cours', subColor: 'text-gray-400', icon: Clock, bg: 'from-blue-500/10 to-cyan-500/5' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.bg} border border-white/5 rounded-xl p-4`}>
            <div className="text-xs font-semibold text-gray-500 mb-2">{stat.label}</div>
            <div className="text-2xl font-bold text-white">{stat.value.toLocaleString('fr-FR')}</div>
            <div className="text-xs text-gray-400">Coins</div>
            <div className={`text-xs mt-1 ${stat.subColor}`}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* ── Envoyer des Coins ── */}
            <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-400" />
                Envoyer des Coins
              </h3>
              <p className="text-xs text-gray-400 mb-4">Transférez des Coins à un autre utilisateur.</p>
              <div className="space-y-3">

                {/* ID + lookup */}
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">ID utilisateur</label>
                  <div className="relative">
                    <input
                      className="input-field w-full pr-8"
                      placeholder="ID de l'utilisateur..."
                      value={transferId}
                      onChange={e => setTransferId(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {lookupState === 'loading' && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                      {lookupState === 'found'   && <UserCheck className="w-4 h-4 text-green-400" />}
                      {lookupState === 'notfound'&& <UserX className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>

                  {lookupState === 'found' && recipient && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-2.5 py-1.5"
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {recipient.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs text-green-400 font-medium">{recipient.name}</span>
                    </motion.div>
                  )}
                  {lookupState === 'notfound' && transferId.trim().length >= 4 && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5" />
                      {transferId.trim() === user?.id ? 'Impossible de s\'envoyer à soi-même.' : 'Utilisateur non trouvé.'}
                    </p>
                  )}
                </div>

                {/* Montant */}
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Montant</label>
                  <div className="relative">
                    <input
                      className="input-field w-full pr-16"
                      placeholder="0"
                      type="number"
                      min="1"
                      value={transferAmount}
                      onChange={e => setTransferAmount(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Coins</span>
                  </div>
                  {amountNum > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Frais : {FEE} Coin · Total prélevé :{' '}
                      <span className="text-amber-400 font-medium">{total}</span>
                    </p>
                  )}
                  {notEnoughFunds && (
                    <p className="text-xs text-red-400 mt-1">
                      Solde insuffisant ({balance} Coins disponibles, {total} requis).
                    </p>
                  )}
                </div>

                <button
                  onClick={() => transferMutation.mutate()}
                  disabled={!canSend || transferMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {transferMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><Send className="w-4 h-4" /> Envoyer {amountNum > 0 ? `${amountNum} Coins` : 'des Coins'}</>
                  }
                </button>

                <Link
                  href="/dashboard/coins/share"
                  className="block text-center text-xs text-purple-400 hover:text-purple-300 transition-colors mt-1"
                >
                  Options avancées de partage →
                </Link>
              </div>
            </div>

            {/* ── Demander des Coins ── */}
            <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-400" />
                Demander des Coins
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Générez un lien pour demander des Coins à la communauté.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Votre lien de demande</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#1A1A24] border border-white/5 rounded-lg px-3 py-2 text-xs text-purple-400 truncate">
                      {mounted ? requestLink : '...'}
                    </div>
                    <button
                      className="btn-secondary px-3"
                      onClick={() => mounted && copyToClipboard(requestLink).then(() => toast.success('Copié !'))}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-2">Partager votre lien</div>
                  <div className="flex gap-2">
                    {['WhatsApp', 'Discord', 'Telegram', 'Twitter'].map(s => (
                      <button
                        key={s}
                        className="flex-1 bg-white/5 border border-white/5 rounded-lg py-2 text-xs text-gray-400 hover:bg-white/10 transition-colors"
                      >
                        {s[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Historique transactions ─────────────────────────── */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Historique des transactions</h3>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {TX_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setTxTab(tab)}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    txTab === tab ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-white/5">
                    <th className="text-left pb-3 font-medium">TYPE</th>
                    <th className="text-left pb-3 font-medium">DESCRIPTION</th>
                    <th className="text-right pb-3 font-medium">MONTANT</th>
                    <th className="text-right pb-3 font-medium hidden sm:table-cell">DATE</th>
                    <th className="text-right pb-3 font-medium hidden md:table-cell">STATUT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {txLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">Aucune transaction</td>
                    </tr>
                  ) : transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                            {txTypeIcon(tx.type)}
                          </div>
                          <span className="text-white hidden sm:block">{txTypeLabel[tx.type] || tx.type}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-400 max-w-[160px] truncate">{tx.description}</td>
                      <td className={`py-3 text-right font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} Coins
                      </td>
                      <td className="py-3 text-right text-gray-500 hidden sm:table-cell">
                        {mounted ? formatDateTime(tx.createdAt) : '...'}
                      </td>
                      <td className="py-3 text-right hidden md:table-cell">
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full">Complété</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Colonne droite ──────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Bonus quotidien */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">
                Récompense quotidienne
              </span>
            </div>
            <div className="text-center py-3">
              <div className="text-3xl font-bold text-white mb-1">5 Coins</div>
              {!dailyClaimed ? (
                <button
                  onClick={() => claimMutation.mutate()}
                  disabled={claimMutation.isPending}
                  className="btn-primary w-full mt-3"
                >
                  {claimMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    : 'Réclamer'
                  }
                </button>
              ) : (
                <div className="text-xs text-gray-400 mt-2">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                  Reviens dans {countdown}
                </div>
              )}
            </div>
          </div>

          {/* Code bonus */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">Code Bonus</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">Utilise un code bonus pour gagner des Coins.</p>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                placeholder="Entrez votre code"
                value={bonusCode}
                onChange={e => setBonusCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && bonusCode && bonusMutation.mutate()}
              />
              <button
                onClick={() => bonusMutation.mutate()}
                disabled={!bonusCode || bonusMutation.isPending}
                className="btn-primary px-4"
              >
                {bonusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Utiliser'}
              </button>
            </div>
          </div>

          {/* Classement parrainage */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-white">Classement Parrainage</span>
            </div>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry: any, i: number) => (
                <div key={entry.referrerId || i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-500 text-black'
                    : i === 1 ? 'bg-gray-400 text-black'
                    : i === 2 ? 'bg-orange-600 text-white'
                    : 'bg-white/10 text-gray-400'
                  }`}>{i + 1}</div>
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs text-purple-400 flex-shrink-0">
                    {entry.user?.name?.[0] || '?'}
                  </div>
                  <div className="flex-1 text-xs text-white truncate">{entry.user?.name || 'Anonyme'}</div>
                  <div className="flex items-center gap-1 text-xs">
                    <Coins className="w-3 h-3 text-yellow-400" />
                    <span className="text-white">{entry.coins || (entry._count?.referrerId ?? 0) * 10}</span>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-2">Aucun classement disponible</p>
              )}
            </div>

            {referralLink && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-gray-400 mb-2">Votre lien de parrainage</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#1A1A24] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-purple-400 truncate">
                    {mounted ? referralLink : '...'}
                  </div>
                  <button
                    className="btn-secondary px-2"
                    onClick={() => mounted && copyToClipboard(referralLink).then(() => toast.success('Copié !'))}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
