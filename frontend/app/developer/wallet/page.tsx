'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Wallet, ArrowUpRight, ArrowDownLeft, Coins, TrendingUp, Gift, Loader2 } from 'lucide-react';
import { coinsApi } from '@/lib/api';
import Link from 'next/link';

export default function WalletPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const { data: balanceData, isLoading } = useQuery({
    queryKey: ['coins-balance'],
    queryFn: () => coinsApi.getBalance(),
    enabled: !!user,
  });

  const { data: txData } = useQuery({
    queryKey: ['coins-transactions-wallet'],
    queryFn: () => coinsApi.getTransactions({ limit: 20 }),
    enabled: !!user,
  });

  const balance = (balanceData as any)?.data?.coins ?? user?.coins ?? 0;
  const transactions: any[] = (txData as any)?.data?.transactions || [];

  const earned = transactions.filter((t: any) => (t.amount || 0) > 0).reduce((s: number, t: any) => s + t.amount, 0);
  const spent = transactions.filter((t: any) => (t.amount || 0) < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Wallet & Transactions</h1>
        <p className="text-gray-400 text-sm mt-1">Gérez vos coins et suivez vos transactions.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Wallet, label: 'Solde actuel', value: balance.toLocaleString('fr-FR'), color: 'text-yellow-400', bg: 'from-yellow-500/10 to-amber-500/5' },
              { icon: TrendingUp, label: 'Total gagné', value: `+${earned.toLocaleString('fr-FR')}`, color: 'text-green-400', bg: 'from-green-500/10 to-emerald-500/5' },
              { icon: ArrowUpRight, label: 'Total dépensé', value: `-${spent.toLocaleString('fr-FR')}`, color: 'text-red-400', bg: 'from-red-500/10 to-rose-500/5' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`bg-gradient-to-br ${stat.bg} border border-white/5 rounded-xl p-5`}>
                <div className="flex items-center gap-3 mb-2">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <span className="text-sm text-gray-400">{stat.label}</span>
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/coins/buy" className="btn-primary flex items-center gap-2 text-sm">
              <Coins className="w-4 h-4" /> Acheter des coins
            </Link>
            <Link href="/dashboard/coins" className="btn-secondary flex items-center gap-2 text-sm">
              <Gift className="w-4 h-4" /> Bonus quotidien
            </Link>
          </div>

          {/* Transactions */}
          <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="font-semibold text-white">Transactions récentes</h2>
            </div>
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Coins className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Aucune transaction</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {transactions.map((tx: any, i: number) => (
                  <div key={tx.id || i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${(tx.amount || 0) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {(tx.amount || 0) >= 0
                        ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                        : <ArrowUpRight className="w-4 h-4 text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{tx.description || tx.type}</div>
                      <div className="text-xs text-gray-500">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString('fr-FR') : ''}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${(tx.amount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(tx.amount || 0) > 0 ? '+' : ''}{tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
