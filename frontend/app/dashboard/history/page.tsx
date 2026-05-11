'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Coins, ArrowUpRight, ArrowDownLeft, Gift, Share2, Tag, Loader2 } from 'lucide-react';
import { coinsApi } from '@/lib/api';

const TX_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  DAILY_BONUS: { label: 'Bonus quotidien', icon: Gift, color: 'text-yellow-400' },
  REFERRAL: { label: 'Parrainage', icon: Share2, color: 'text-green-400' },
  TRANSFER_SENT: { label: 'Envoi', icon: ArrowUpRight, color: 'text-red-400' },
  TRANSFER_RECEIVED: { label: 'Réception', icon: ArrowDownLeft, color: 'text-green-400' },
  PURCHASE: { label: 'Achat', icon: Coins, color: 'text-blue-400' },
  BONUS_CODE: { label: 'Code bonus', icon: Tag, color: 'text-purple-400' },
  DEPLOY_BOT: { label: 'Déploiement bot', icon: ArrowUpRight, color: 'text-red-400' },
  SERVER_COST: { label: 'Coût serveur', icon: ArrowUpRight, color: 'text-red-400' },
};

const TABS = ['Tous', 'Reçus', 'Envoyés', 'Bonus', 'Dépenses'];

export default function HistoryPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [tab, setTab] = useState('Tous');

  const typeMap: Record<string, string> = {
    'Reçus': 'RECEIVED', 'Envoyés': 'SENT', 'Bonus': 'BONUS', 'Dépenses': 'SPENT',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['coins-transactions', tab],
    queryFn: () => coinsApi.getTransactions({ type: tab === 'Tous' ? undefined : typeMap[tab] }),
    enabled: !!user,
  });

  const _rawTx = (data as any)?.data?.transactions ?? (data as any)?.data;
  const transactions: any[] = Array.isArray(_rawTx) ? _rawTx : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Historique</h1>
        <p className="text-gray-400 text-sm mt-1">Toutes vos transactions de Coins.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === t ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <Coins className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400">Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {transactions.map((tx: any, i: number) => {
              const config = TX_TYPES[tx.type] || { label: tx.type, icon: Coins, color: 'text-gray-400' };
              const Icon = config.icon;
              return (
                <motion.div
                  key={tx.id || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{tx.description || config.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString('fr-FR') : ''}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${(tx.amount || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(tx.amount || 0) > 0 ? '+' : ''}{tx.amount}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
