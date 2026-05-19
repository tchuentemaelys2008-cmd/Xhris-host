'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Gift, Trophy, Clock, Users, ExternalLink, Loader2, CheckCircle, XCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vark1I1AYlUR1G8YMX31';

export default function GiftPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const giftId = params?.id as string;

  const [gift, setGift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');

  const fetchGift = () =>
    apiClient.get(`/gifts/${giftId}`)
      .then((d: any) => setGift(d?.data?.data ?? d?.data))
      .catch((e: any) => setError(e?.response?.data?.message || 'Cadeau introuvable'));

  useEffect(() => {
    if (!giftId) return;
    setLoading(true);
    fetchGift().finally(() => setLoading(false));
  }, [giftId, session?.user]);

  const handleClaim = async () => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=/gift/${giftId}`);
      return;
    }
    setClaiming(true);
    try {
      const r: any = await apiClient.post(`/gifts/${giftId}/claim`, {});
      const d = r?.data?.data ?? r?.data;
      toast.success(d?.message || `+${d?.coinsEarned} coins !`, { duration: 5000 });
      await fetchGift();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
        <Loader2 className="animate-spin w-10 h-10 text-pink-400" />
      </div>
    );
  }

  if (error || !gift) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A0A0F]">
        <div className="text-center">
          <XCircle className="w-14 h-14 mx-auto text-red-500 mb-3" />
          <h1 className="text-xl font-bold text-white mb-2">Cadeau introuvable</h1>
          <p className="text-gray-500 text-sm mb-5">{error || 'Le lien est invalide ou expiré.'}</p>
          <Link href="/" className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-semibold transition-colors">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const alreadyClaimed = !!gift.userClaim;
  const needsChannel = gift.requireChannelJoin && !gift.userChannelJoined && !alreadyClaimed;
  const winnersLeft = Math.max(0, gift.winnersLimit - gift.claimsCount);
  const canClaim = !alreadyClaimed && !gift.isExpired && !gift.isFull && !needsChannel;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0A0A0F] via-[#110A1A] to-[#0A0A0F]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0D0D14] border border-white/10 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5"
      >
        {/* Icon + Title */}
        <div className="text-center space-y-3">
          <motion.div
            animate={{ rotate: [0, -8, 8, -8, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30"
          >
            <Gift className="w-10 h-10 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black text-white">{gift.title}</h1>
            {gift.description && <p className="text-sm text-gray-400 mt-1">{gift.description}</p>}
          </div>
        </div>

        {/* Already claimed */}
        {alreadyClaimed && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center">
            <CheckCircle className="w-10 h-10 mx-auto text-green-400 mb-2" />
            <p className="font-bold text-green-400">Déjà réclamé !</p>
            <p className="text-sm text-green-300 mt-1">
              {gift.userClaim.rewardType === 'main'
                ? `🏆 Position ${gift.userClaim.position} · +${gift.userClaim.coinsEarned} coins`
                : `🎁 Lot consolation · +${gift.userClaim.coinsEarned} coins`}
            </p>
          </div>
        )}

        {/* Expired */}
        {gift.isExpired && !alreadyClaimed && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-gray-500 mb-2" />
            <p className="text-gray-400 font-medium">Cadeau expiré</p>
          </div>
        )}

        {/* Full */}
        {!gift.isExpired && gift.isFull && !alreadyClaimed && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
            <XCircle className="w-8 h-8 mx-auto text-orange-400 mb-2" />
            <p className="text-orange-300 font-medium">Tous les cadeaux ont été pris</p>
          </div>
        )}

        {/* Gift details */}
        {!alreadyClaimed && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-yellow-300">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">Top {gift.winnersLimit} reçoit</span>
              </div>
              <span className="font-black text-yellow-400 text-lg">{gift.mainReward} coins</span>
            </div>

            {gift.consolationReward > 0 && (
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Gift className="w-4 h-4" />
                  <span className="text-sm">Autres reçoivent</span>
                </div>
                <span className="font-bold text-white">{gift.consolationReward} coins</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {gift.claimsCount}/{gift.totalCapacity} réclamés
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Expire le {new Date(gift.expiresAt).toLocaleDateString('fr-FR')}
              </div>
            </div>

            {winnersLeft > 0 && !gift.isExpired && !gift.isFull && (
              <p className="text-center text-sm font-bold text-pink-400">
                ⚡ {winnersLeft} place{winnersLeft > 1 ? 's' : ''} dans le top {gift.winnersLimit} disponible{winnersLeft > 1 ? 's' : ''} !
              </p>
            )}
          </div>
        )}

        {/* Channel required */}
        {needsChannel && (
          <div className="space-y-3">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-sm text-purple-300">
              📢 Tu dois rejoindre notre chaîne WhatsApp pour réclamer ce cadeau.
            </div>
            <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl text-sm transition-colors">
              <ExternalLink className="w-4 h-4" /> Rejoindre la chaîne
            </a>
            <Link href="/dashboard/growth"
              className="block w-full py-2.5 border border-white/10 text-gray-400 hover:text-white text-sm rounded-xl text-center transition-colors">
              → Confirmer dans mon profil
            </Link>
          </div>
        )}

        {/* Claim button */}
        {canClaim && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 disabled:opacity-50 text-white font-black rounded-2xl text-lg shadow-lg shadow-pink-500/25 transition-all"
          >
            {claiming ? <Loader2 className="animate-spin w-6 h-6 mx-auto" /> : `🎉 Réclamer ${gift.mainReward} coins`}
          </button>
        )}

        {!gift.isAuthenticated && !alreadyClaimed && !gift.isExpired && !gift.isFull && (
          <p className="text-xs text-center text-gray-600">
            <Link href={`/auth/login?callbackUrl=/gift/${giftId}`} className="text-purple-400 underline">Connecte-toi</Link> pour réclamer ce cadeau.
          </p>
        )}

        <div className="text-center">
          <Link href="/dashboard" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Retour au dashboard →
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
