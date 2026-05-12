'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Coins, Send, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { apiClient, coinsApi } from '@/lib/api';
import Link from 'next/link';

export default function RequestCoinsPage() {
  const { userId } = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const sender = session?.user as any;

  const suggestedAmount = searchParams.get('amount') ? Number(searchParams.get('amount')) : '';
  const [amount, setAmount] = useState<string>(suggestedAmount ? String(suggestedAmount) : '');
  const [sent, setSent] = useState(false);
  const [sentAmount, setSentAmount] = useState(0);

  const { data: recipientData, isLoading: loadingRecipient } = useQuery({
    queryKey: ['user-lookup', userId],
    queryFn: () => apiClient.get(`/users/lookup/${userId}`),
    enabled: !!userId,
    retry: false,
  });

  const recipient: any = (recipientData as any)?.data?.data ?? (recipientData as any)?.data ?? null;

  const { data: balanceData } = useQuery({
    queryKey: ['coins-balance'],
    queryFn: () => coinsApi.getBalance(),
    enabled: !!sender,
  });
  const balance: number = (balanceData as any)?.data?.data?.coins ?? 0;

  const amountNum = Number(amount) || 0;
  const FEE = 1;
  const total = amountNum + FEE;
  const notEnough = amountNum > 0 && total > balance;
  const isOwnLink = sender?.id === userId;
  const canSend = !!sender && !!recipient && amountNum >= 1 && !notEnough && !isOwnLink && !sent;

  const transferMutation = useMutation({
    mutationFn: () => coinsApi.transfer(userId, amountNum),
    onSuccess: () => {
      setSentAmount(amountNum);
      setSent(true);
    },
  });

  if (loadingRecipient) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!recipient) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Utilisateur introuvable</h1>
        <p className="text-gray-400 text-sm">Ce lien de demande n'est plus valide.</p>
        <Link href="/dashboard" className="mt-6 btn-primary">Retour au dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">XHRIS HOST</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111118] border border-white/10 rounded-2xl p-6"
        >
          {sent ? (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">{sentAmount.toLocaleString('fr-FR')} Coins envoyés !</h2>
              <p className="text-gray-400 text-sm">Transfert à @{recipient.name} effectué avec succès.</p>
              <Link href="/dashboard/coins" className="btn-primary mt-6 inline-block">Voir mon solde</Link>
            </div>
          ) : (
            <>
              {/* Recipient info */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3">
                  {recipient.name?.[0]?.toUpperCase() || '?'}
                </div>
                <p className="text-gray-400 text-sm">Envoyer des Coins à</p>
                <h2 className="text-xl font-bold text-white">@{recipient.name}</h2>
              </div>

              {!sender ? (
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-4">Connectez-vous pour envoyer des Coins.</p>
                  <Link href={`/auth/login?callbackUrl=/request-coins/${userId}`} className="btn-primary w-full block text-center">
                    Se connecter
                  </Link>
                </div>
              ) : isOwnLink ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                  <p className="text-amber-400 text-sm">C'est votre propre lien de demande. Partagez-le avec d'autres utilisateurs !</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#1A1A24] rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Votre solde</span>
                    <span className="text-amber-400 font-bold">{balance.toLocaleString('fr-FR')} Coins</span>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Montant à envoyer *</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="input-field w-full pr-16"
                        placeholder="10"
                        min="1"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Coins</span>
                    </div>
                    {amountNum > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Frais : 1 Coin · Total : <span className="text-amber-400 font-medium">{total}</span> Coins
                      </p>
                    )}
                    {notEnough && (
                      <p className="text-xs text-red-400 mt-1">Solde insuffisant ({balance} Coins disponibles).</p>
                    )}
                  </div>

                  <button
                    onClick={() => transferMutation.mutate()}
                    disabled={!canSend || transferMutation.isPending}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {transferMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><Send className="w-4 h-4" /> Envoyer {amountNum > 0 ? `${amountNum} Coins` : 'des Coins'}</>
                    }
                  </button>

                  {transferMutation.isError && (
                    <p className="text-xs text-red-400 text-center">
                      {(transferMutation.error as any)?.response?.data?.message || 'Erreur lors du transfert'}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>

        <p className="text-center text-xs text-gray-600 mt-6">
          XHRIS Host · Plateforme sécurisée de transfert de Coins
        </p>
      </div>
    </div>
  );
}
