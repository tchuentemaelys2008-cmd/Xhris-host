'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Send, Link2, Copy, Users, Coins, Loader2,
  CheckCircle, ArrowLeft, AlertCircle, UserCheck, UserX,
} from 'lucide-react';
import { coinsApi, apiClient } from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

// ─── Lookup utilisateur par ID ────────────────────────────────────
async function lookupUser(id: string) {
  const res = await apiClient.get(`/users/lookup/${id.trim()}`);
  return (res as any)?.data?.data as { id: string; name: string; avatar?: string } | null;
}

export default function CoinsSharePage() {
  const { data: session } = useSession();
  const qc  = useQueryClient();
  const user = session?.user as any;

  const [transferId, setTransferId]         = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [note, setNote]                     = useState('');
  const [requestAmount, setRequestAmount]   = useState('');
  const [sent, setSent]                     = useState(false);

  // ── Lookup état ──────────────────────────────────────────────────
  const [recipient, setRecipient]           = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [lookupState, setLookupState]       = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Balance ──────────────────────────────────────────────────────
  const { data: balanceData } = useQuery({
    queryKey: ['coins-balance'],
    queryFn:  () => coinsApi.getBalance(),
    enabled:  !!user,
  });

  // ── Referral ─────────────────────────────────────────────────────
  const { data: referralData } = useQuery({
    queryKey: ['referral'],
    queryFn:  () => coinsApi.getReferralStats(),
    enabled:  !!user,
  });

  const balance       = (balanceData as any)?.data?.coins ?? user?.coins ?? 0;
  const _rawReferral  = (referralData as any)?.data ?? {};
  const referral      = _rawReferral && !Array.isArray(_rawReferral) ? _rawReferral : {};

  const requestLink = typeof window !== 'undefined'
    ? `${window.location.origin}/request-coins/${user?.id}${requestAmount ? `?amount=${requestAmount}` : ''}`
    : '';

  const referralLink = typeof window !== 'undefined' && referral.referralCode
    ? `${window.location.origin}/auth/register?ref=${referral.referralCode}`
    : '';

  // ── Lookup utilisateur avec debounce 600ms ───────────────────────
  useEffect(() => {
    const id = transferId.trim();

    // Reset
    setRecipient(null);
    setLookupState('idle');

    if (!id || id.length < 4) return;
    if (id === user?.id) {
      setLookupState('notfound');
      return;
    }

    setLookupState('loading');
    if (lookupTimer.current) clearTimeout(lookupTimer.current);

    lookupTimer.current = setTimeout(async () => {
      try {
        const found = await lookupUser(id);
        if (found) {
          setRecipient(found);
          setLookupState('found');
        } else {
          setLookupState('notfound');
        }
      } catch {
        setLookupState('notfound');
      }
    }, 600);

    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, [transferId, user?.id]);

  // ── Calcul frais ─────────────────────────────────────────────────
  const FEE            = 1;
  const amountNum      = Number(transferAmount) || 0;
  const total          = amountNum + FEE;
  const notEnoughFunds = amountNum > 0 && total > balance;
  const canSend        = lookupState === 'found' && amountNum >= 1 && !notEnoughFunds && !sent;

  // ── Mutation transfert ───────────────────────────────────────────
  const transferMutation = useMutation({
    mutationFn: () => coinsApi.transfer(transferId.trim(), amountNum),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coins-balance'] });
      qc.invalidateQueries({ queryKey: ['coins-transactions'] });
      setTransferId('');
      setTransferAmount('');
      setNote('');
      setRecipient(null);
      setLookupState('idle');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      toast.success('Coins envoyés avec succès !');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Erreur lors du transfert';
      toast.error(msg);
    },
  });

  // ── Partage réseaux sociaux ──────────────────────────────────────
  const shareOn = (platform: string) => {
    const msg  = encodeURIComponent(`Envoie-moi des Coins sur XHRIS Host ! ${requestLink}`);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${msg}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(requestLink)}&text=${encodeURIComponent('Envoie-moi des Coins sur XHRIS Host !')}`,
      twitter:  `https://twitter.com/intent/tweet?text=${msg}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
  };

  return (
    <div className="space-y-6">

      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/coins" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Partager des Coins</h1>
          <p className="text-gray-400 text-sm mt-1">
            Envoyez des Coins à vos amis ou générez un lien de demande.
          </p>
        </div>
      </div>

      {/* ── Solde ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-xl p-5 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Solde disponible</div>
          <div className="text-3xl font-bold text-white">{balance.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-amber-400">Coins</div>
        </div>
        <Coins className="w-12 h-12 text-amber-400 opacity-40" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Envoyer des coins ───────────────────────────────────── */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Envoyer des Coins</h3>
              <p className="text-xs text-gray-400">Transférez directement à un utilisateur</p>
            </div>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <div className="text-white font-medium">Coins envoyés !</div>
              <div className="text-xs text-gray-400 mt-1">{amountNum} Coins transférés</div>
            </motion.div>
          ) : (
            <div className="space-y-3">

              {/* ── ID destinataire + lookup ── */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">ID du destinataire *</label>
                <div className="relative">
                  <input
                    className="input-field w-full font-mono text-sm pr-8"
                    placeholder="ID utilisateur (ex: abc12345)"
                    value={transferId}
                    onChange={e => setTransferId(e.target.value)}
                  />
                  {/* Icône de statut lookup */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {lookupState === 'loading' && (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    )}
                    {lookupState === 'found' && (
                      <UserCheck className="w-4 h-4 text-green-400" />
                    )}
                    {lookupState === 'notfound' && (
                      <UserX className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>

                {/* Résultat lookup */}
                {lookupState === 'found' && recipient && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2"
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {recipient.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="text-sm text-green-400 font-medium">{recipient.name}</div>
                      <div className="text-xs text-gray-500">Utilisateur trouvé</div>
                    </div>
                  </motion.div>
                )}

                {lookupState === 'notfound' && transferId.trim().length >= 4 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                  >
                    <UserX className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-400">
                      {transferId.trim() === user?.id
                        ? 'Vous ne pouvez pas vous envoyer des Coins à vous-même.'
                        : 'Utilisateur non trouvé. Vérifiez l\'ID.'}
                    </span>
                  </motion.div>
                )}

                <p className="text-xs text-gray-600 mt-1">
                  Trouvez l&apos;ID dans le profil de l&apos;utilisateur (section Paramètres)
                </p>
              </div>

              {/* ── Montant ── */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Montant *</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    className="input-field w-full pr-24"
                    placeholder="0"
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    / {balance} max
                  </span>
                </div>
                {amountNum > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Frais : {FEE} Coin · Total prélevé :{' '}
                    <span className="text-amber-400 font-medium">{total} Coins</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-600 mt-1">Frais : {FEE} Coin · Min : 1 Coin</p>
                )}
              </div>

              {/* ── Note ── */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Note (optionnel)</label>
                <input
                  className="input-field w-full"
                  placeholder="Merci pour..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              {/* ── Alerte solde insuffisant ── */}
              {notEnoughFunds && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-400">
                    Solde insuffisant. Il vous faut{' '}
                    <strong>{total} Coins</strong> ({amountNum} + {FEE} de frais) mais vous
                    n&apos;avez que <strong>{balance} Coins</strong>.{' '}
                    <Link href="/dashboard/coins/buy" className="underline">
                      Acheter des Coins →
                    </Link>
                  </div>
                </div>
              )}

              {/* ── Bouton envoyer ── */}
              <button
                onClick={() => transferMutation.mutate()}
                disabled={!canSend || transferMutation.isPending}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {recipient
                      ? `Envoyer ${amountNum > 0 ? amountNum : '?'} Coins à ${recipient.name}`
                      : 'Envoyer des Coins'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Demander des coins ──────────────────────────────────── */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Link2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Demander des Coins</h3>
              <p className="text-xs text-gray-400">Partagez un lien pour recevoir des Coins</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Montant à demander (optionnel)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  className="input-field w-full pr-16"
                  placeholder="Laisser vide pour montant libre"
                  value={requestAmount}
                  onChange={e => setRequestAmount(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Coins</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Votre lien de demande</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-[#1A1A24] border border-white/5 rounded-lg px-3 py-2 text-xs text-blue-400 truncate font-mono">
                  {requestLink}
                </div>
                <button
                  className="btn-secondary px-3 flex-shrink-0"
                  onClick={() => copyToClipboard(requestLink).then(() => toast.success('Lien copié !'))}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-2">Partager sur</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'whatsapp', label: 'WhatsApp', color: 'hover:bg-green-500/10 hover:border-green-500/20 hover:text-green-400' },
                  { key: 'telegram', label: 'Telegram', color: 'hover:bg-blue-500/10 hover:border-blue-500/20 hover:text-blue-400' },
                  { key: 'twitter',  label: 'Twitter',  color: 'hover:bg-sky-500/10 hover:border-sky-500/20 hover:text-sky-400' },
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => shareOn(s.key)}
                    className={`py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 transition-all ${s.color}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Parrainage ───────────────────────────────────────────── */}
      {referralLink && (
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Lien de parrainage</h3>
              <p className="text-xs text-gray-400">
                Gagnez {referral.coinsPerReferral ?? 10} Coins pour chaque ami qui s&apos;inscrit
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-[#1A1A24] border border-white/5 rounded-lg px-3 py-2 text-xs text-purple-400 truncate font-mono">
              {referralLink}
            </div>
            <button
              className="btn-secondary px-3 flex-shrink-0"
              onClick={() => copyToClipboard(referralLink).then(() => toast.success('Lien copié !'))}
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Filleuls',        value: referral.totalReferrals  ?? 0 },
              { label: 'Coins gagnés',    value: referral.coinsEarned     ?? 0 },
              { label: 'Taux conversion', value: `${referral.conversionRate ?? 0}%` },
            ].map(stat => (
              <div key={stat.label} className="bg-[#1A1A24] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
