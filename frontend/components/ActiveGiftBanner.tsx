'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Trophy } from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function ActiveGiftBanner() {
  const router = useRouter();
  const [gifts, setGifts] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load dismissed list from sessionStorage
    try {
      const stored = sessionStorage.getItem('dismissed_gifts');
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }

    apiClient.get('/gifts/active')
      .then((d: any) => {
        const data = d?.data?.data ?? d?.data ?? [];
        setGifts(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try { sessionStorage.setItem('dismissed_gifts', JSON.stringify([...next])); } catch { /* ignore */ }
  };

  const visible = gifts.filter(g => !dismissed.has(g.id));
  if (!visible.length) return null;

  const gift = visible[0];

  return (
    <AnimatePresence>
      <motion.div
        key={gift.id}
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        className="fixed top-20 right-3 sm:right-4 z-40 w-72 sm:w-80"
      >
        <div
          onClick={() => router.push(`/gift/${gift.id}`)}
          className="bg-gradient-to-br from-pink-600 to-purple-700 rounded-2xl shadow-2xl shadow-pink-500/30 p-4 cursor-pointer hover:shadow-pink-500/50 transition-shadow"
        >
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
              className="bg-white/20 rounded-xl p-2 flex-shrink-0"
            >
              <Gift className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">🎁 {gift.title}</p>
              <div className="flex items-center gap-1 text-xs text-white/80 mt-0.5">
                <Trophy className="w-3 h-3" />
                <span>Top {gift.winnersLimit} : <strong>{gift.mainReward} coins</strong></span>
              </div>
              <p className="text-[11px] text-white/60 mt-1">
                {gift.claimsCount}/{gift.totalCapacity || '∞'} · Clique pour participer
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); dismiss(gift.id); }}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
