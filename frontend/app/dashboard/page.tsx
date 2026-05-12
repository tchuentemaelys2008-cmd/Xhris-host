'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Bot, Server, Coins, Zap, ArrowRight, Copy, Loader2, Crown, Newspaper, Users, Gift, CheckCircle } from 'lucide-react';
import { userApi, coinsApi } from '@/lib/api';
import { useCoinsBalance, useInvalidateBalance } from '@/lib/useCoinsBalance';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1A24] border border-white/10 rounded-lg p-3 text-xs">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === 'used' ? 'Utilisés' : 'Gagnés'}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Copié !'));
}

const TX_ICONS: Record<string, any> = {
  DAILY_BONUS: Coins,
  REFERRAL: Users,
  TRANSFER_SENT: ArrowRight,
  TRANSFER_RECEIVED: ArrowRight,
  PURCHASE: Coins,
  DEPLOY_BOT: Bot,
  SERVER_COST: Server,
};
const txIcon = (type: string) => TX_ICONS[type] || Coins;

const DEPLOY_STEPS = ['Choisir un bot', 'Configurer', 'Déployer'];

export default function DashboardPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const user = session?.user as any;
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % DEPLOY_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => userApi.getDashboardStats(),
    enabled: !!user,
  });

  const { balance } = useCoinsBalance();  // shared, always fresh
  const invalidateBalance = useInvalidateBalance();

  const { data: txData } = useQuery({
    queryKey: ['coins-transactions-recent'],
    queryFn: () => coinsApi.getTransactions({ limit: 4 }),
    enabled: !!user,
  });

  const { data: referralData } = useQuery({
    queryKey: ['referral'],
    queryFn: () => coinsApi.getReferralStats(),
    enabled: !!user,
  });

  const stats = (statsData as any)?.data || {};
  const transactions: any[] = (txData as any)?.data?.transactions || [];
  const referral = (referralData as any)?.data || {};
  const usageData: any[] = stats.usageChart || [];

  const activeServers: number = stats.activeServers ?? 0;
  const activeBots: number = stats.activeBots ?? 0;
  const deploymentsLeft: number = stats.deploymentsLeft ?? 10;
  const deploymentResetIn: string = stats.deploymentResetIn || '';
  const plan: string = user?.plan || stats.plan || 'FREE';
  const planExpiry: string = stats.planExpiry || '';
  const news: any[] = stats.announcements || [];
  const dailyBonusClaimed: boolean = stats.dailyBonusClaimed ?? false;

  const referralLink =
    typeof window !== 'undefined' && referral.referralCode
      ? `${window.location.origin}/auth/register?ref=${referral.referralCode}`
      : '';

  const bonusMutation = useMutation({
    mutationFn: () => coinsApi.claimDailyBonus(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      invalidateBalance();
      qc.invalidateQueries({ queryKey: ['coins-transactions-recent'] });
      toast.success('+3 Coins bonus quotidien reçus !');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Bonus déjà réclamé aujourd\'hui');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bienvenue, <span className="text-purple-400">{user?.name || 'Utilisateur'}</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gérez vos bots, serveurs et crédits depuis votre dashboard.
          </p>
        </div>

        {/* Daily bonus button */}
        <motion.button
          onClick={() => bonusMutation.mutate()}
          disabled={dailyBonusClaimed || bonusMutation.isPending}
          animate={!dailyBonusClaimed ? {
            boxShadow: [
              '0 0 0px rgba(168,85,247,0)',
              '0 0 18px rgba(168,85,247,0.7)',
              '0 0 0px rgba(168,85,247,0)',
            ],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all whitespace-nowrap',
            dailyBonusClaimed
              ? 'border-white/10 bg-white/5 text-gray-500 cursor-not-allowed'
              : 'border-purple-500/50 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30'
          )}
        >
          {bonusMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : dailyBonusClaimed ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <Gift className="w-4 h-4" />
          )}
          {dailyBonusClaimed ? 'Bonus réclamé' : 'Récupérer +3 Coins'}
        </motion.button>
      </div>

      {/* Top stats */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { Icon: Coins, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10', value: String(balance), label: 'Coins Actuels', sub: stats.coinsEarnedToday ? `+${stats.coinsEarnedToday} aujourd'hui` : 'Solde actuel', subColor: stats.coinsEarnedToday ? 'text-green-400' : 'text-gray-500', bg: 'from-yellow-500/10 to-orange-500/5' },
            { Icon: Zap, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10', value: `${deploymentsLeft} / jour`, label: 'Déploiements Restants', sub: deploymentResetIn ? `Reset dans ${deploymentResetIn}` : 'Disponibles', subColor: 'text-blue-400', bg: 'from-blue-500/10 to-cyan-500/5' },
            { Icon: Server, iconColor: 'text-purple-400', iconBg: 'bg-purple-500/10', value: String(activeServers), label: 'Serveurs Actifs', sub: activeServers === 0 ? 'Aucun serveur actif' : `${activeServers} en ligne`, subColor: 'text-purple-400', bg: 'from-purple-500/10 to-indigo-500/5' },
            { Icon: plan === 'FREE' ? Coins : Crown, iconColor: plan === 'FREE' ? 'text-gray-400' : 'text-yellow-400', iconBg: plan === 'FREE' ? 'bg-gray-500/10' : 'bg-yellow-500/10', value: plan === 'FREE' ? 'Gratuit' : plan, label: 'Statut actuel', sub: planExpiry ? `Valide jusqu'au ${planExpiry}` : plan === 'FREE' ? 'Passez à Premium' : 'Actif', subColor: plan === 'FREE' ? 'text-gray-400' : 'text-yellow-400', bg: 'from-yellow-500/10 to-amber-500/5' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${stat.bg} border border-white/5 rounded-xl p-4`}
            >
              <div className={`w-8 h-8 ${stat.iconBg} rounded-lg flex items-center justify-center mb-2`}>
                <stat.Icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
              <div className={`text-xs mt-1 ${stat.subColor}`}>{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deploy Bot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111118] border border-white/5 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Déployer un Bot</h3>
              <p className="text-xs text-gray-400">
                Choisissez un bot, configurez vos variables et déployez en quelques clics.
              </p>
            </div>
          </div>

          {/* Animated cycling steps */}
          <div className="flex items-center gap-2 mb-5">
            {DEPLOY_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2 flex-1">
                <motion.div
                  animate={{ color: activeStep === i ? '#a855f7' : '#6b7280' }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center gap-1.5"
                >
                  <motion.div
                    animate={{
                      backgroundColor: activeStep === i ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                      color: activeStep === i ? '#ffffff' : '#6b7280',
                      scale: activeStep === i ? 1.2 : 1,
                    }}
                    transition={{ duration: 0.5 }}
                    className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium"
                  >
                    {i + 1}
                  </motion.div>
                  <span className="text-xs hidden sm:block">{step}</span>
                </motion.div>
                {i < 2 && <div className="flex-1 h-px bg-white/10" />}
              </div>
            ))}
          </div>

          <div className="bg-[#1A1A24] border border-white/5 rounded-lg p-3 flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{activeBots} bot(s) actif(s)</div>
              <div className="text-xs text-gray-400">Voir et gérer dans la section Bots</div>
            </div>
            <Link href="/dashboard/bots" className="text-xs text-purple-400 hover:text-purple-300">
              Gérer →
            </Link>
          </div>

          <Link href="/dashboard/bots" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            Voir mes Bots
          </Link>
          <p className="text-xs text-gray-500 text-center mt-2">
            Coût : 10 Coins / jour ou Abonnement (100 Coins / semaine)
          </p>
        </motion.div>

        {/* Create Server */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#111118] border border-white/5 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
              <Server className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Créer un Serveur</h3>
              <p className="text-xs text-gray-400">
                Créez votre propre serveur, uploadez vos fichiers et lancez votre bot.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {[
              { name: 'Starter', cpu: '1 vCPU', ram: '1 GB', coins: '10/j' },
              { name: 'Pro', cpu: '2 vCPU', ram: '2 GB', coins: '20/j', popular: true },
              { name: 'Advanced', cpu: '4 vCPU', ram: '4 GB', coins: '40/j' },
              { name: 'Elite', cpu: '8 vCPU', ram: '8 GB', coins: '80/j' },
            ].map((p) => (
              <div
                key={p.name}
                className={cn(
                  'relative bg-[#1A1A24] border rounded-lg p-3 text-center',
                  p.popular ? 'border-purple-500 bg-purple-500/10' : 'border-white/5'
                )}
              >
                {p.popular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                    Populaire
                  </div>
                )}
                <div className="text-sm font-medium text-white mb-1">{p.name}</div>
                <div className="text-[10px] text-gray-400 space-y-0.5">
                  <div>{p.cpu}</div>
                  <div>{p.ram} RAM</div>
                  <div className="text-purple-400">{p.coins} Coins</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#1A1A24] border border-white/5 rounded-lg p-3 mb-4">
            <div className="text-sm text-white mb-1">Serveurs actifs : {activeServers}</div>
            <div className="text-xs text-gray-400">Gérez vos serveurs et contrôlez-les en un clic.</div>
          </div>

          <Link href="/dashboard/servers" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Server className="w-4 h-4" />
            Gérer les Serveurs
          </Link>
          <p className="text-xs text-gray-500 text-center mt-2">
            Le serveur s'arrêtera si vous n'avez plus de Coins.
          </p>
        </motion.div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Usage chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#111118] border border-white/5 rounded-xl p-4"
        >
          <h3 className="text-sm font-medium text-white mb-4">Résumé d'utilisation</h3>
          {usageData.length > 0 ? (
            <>
              <div className="flex items-center gap-4 mb-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-gray-400">Utilisés</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-gray-400">Gagnés</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={usageData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="usedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="earnedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="used" stroke="#ef4444" strokeWidth={1.5} fill="url(#usedGrad)" />
                  <Area type="monotone" dataKey="earned" stroke="#22c55e" strokeWidth={1.5} fill="url(#earnedGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-xs">
              <Coins className="w-8 h-8 mb-2 opacity-30" />
              Aucune donnée disponible
            </div>
          )}
        </motion.div>

        {/* Recent transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-[#111118] border border-white/5 rounded-xl p-4"
        >
          <h3 className="text-sm font-medium text-white mb-4">Historique récent</h3>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-gray-500 text-xs">
              <Coins className="w-6 h-6 mb-1 opacity-30" />
              Aucune transaction
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 4).map((tx: any, i: number) => (
                <div key={tx.id || i} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    {(() => { const I = txIcon(tx.type); return <I className="w-3.5 h-3.5 text-purple-400" />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {tx.description || tx.type}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString('fr-FR') : ''}
                    </div>
                  </div>
                  <div className={`text-xs font-medium flex-shrink-0 ${(tx.amount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(tx.amount || 0) > 0 ? '+' : ''}{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/dashboard/coins" className="mt-4 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
            Voir tout l'historique <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>

        {/* Referral */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#111118] border border-white/5 rounded-xl p-4"
        >
          <h3 className="text-sm font-medium text-white mb-4">Parrainage</h3>
          <p className="text-xs text-gray-400 mb-3">Parrainez des amis et gagnez des Coins !</p>
          {referralLink ? (
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-1">Votre lien de parrainage</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-[#1A1A24] border border-white/5 rounded-lg px-3 py-2 text-xs text-purple-400 truncate">
                  {referralLink}
                </div>
                <button className="btn-secondary px-2" onClick={() => copyText(referralLink)}>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 bg-[#1A1A24] rounded-lg p-3 text-xs text-gray-500">
              Votre code de parrainage sera affiché ici.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#1A1A24] rounded-lg p-3">
              <div className="text-xs text-gray-400">Filleuls</div>
              <div className="text-lg font-bold text-white">{referral.totalReferrals ?? 0}</div>
            </div>
            <div className="bg-[#1A1A24] rounded-lg p-3">
              <div className="text-xs text-gray-400">Coins gagnés</div>
              <div className="text-lg font-bold text-white">{referral.coinsEarned ?? 0}</div>
            </div>
          </div>
          <Link href="/dashboard/coins" className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1">
            Gérer les parrainages
          </Link>
        </motion.div>

        {/* News */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="bg-[#111118] border border-white/5 rounded-xl p-4"
        >
          <h3 className="text-sm font-medium text-white mb-4">Actualités</h3>
          {news.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-gray-500 text-xs">
              <Newspaper className="w-6 h-6 mb-2 opacity-30" />
              Aucune actualité
            </div>
          ) : (
            <div className="space-y-4">
              {news.slice(0, 3).map((item: any, i: number) => (
                <div key={item.id || i} className="flex gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-white font-medium">{item.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.content || item.desc}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/dashboard/support" className="mt-4 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
            Voir les annonces <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
