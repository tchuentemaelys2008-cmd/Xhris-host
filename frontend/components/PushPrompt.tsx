'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Share, Plus, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  detectPlatform,
  isStandalone,
  isPushSupported,
  getPushPermission,
  subscribeToPush,
} from '@/lib/push';

export default function PushPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [step, setStep] = useState<'ask' | 'ios-guide' | 'done' | 'denied'>('ask');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const plat = detectPlatform();
      setPlatform(plat);

      const permission = getPushPermission();
      if (permission === 'granted' || permission === 'denied') return;

      const dismissed = localStorage.getItem('xhris-push-dismissed');
      if (dismissed) {
        const dismissedAt = parseInt(dismissed);
        if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
      }

      if (plat === 'ios' && !isStandalone()) {
        setStep('ios-guide');
        setShow(true);
        return;
      }

      if (isPushSupported()) {
        setStep('ask');
        setShow(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleActivate = async () => {
    setLoading(true);
    const success = await subscribeToPush();
    setLoading(false);
    if (success) {
      setStep('done');
      setTimeout(() => setShow(false), 2000);
    } else {
      setStep('denied');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('xhris-push-dismissed', String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm"
      >
        <div className="relative bg-[#111118] border border-white/10 rounded-2xl p-5 shadow-2xl shadow-purple-500/5">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {step === 'ask' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Activer les notifications</p>
                  <p className="text-xs text-gray-400">
                    {platform === 'android'
                      ? 'Recevez des alertes même quand l\'app est fermée'
                      : 'Soyez informé des paiements, déploiements et mises à jour'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="flex-1 text-sm text-gray-400 hover:text-white py-2 rounded-lg transition-colors"
                >
                  Plus tard
                </button>
                <button
                  onClick={handleActivate}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? '...' : 'Activer'}
                </button>
              </div>
            </div>
          )}

          {step === 'ios-guide' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Notifications sur iPhone</p>
                  <p className="text-xs text-gray-400">Ajoutez XHRIS à votre écran d'accueil</p>
                </div>
              </div>

              <div className="space-y-3 bg-black/30 rounded-xl p-4">
                {[
                  { n: 1, content: <>Tapez <Share className="w-4 h-4 inline text-blue-400" /> <span className="text-blue-400 font-medium">Partager</span> en bas de Safari</> },
                  { n: 2, content: <>Choisissez <Plus className="w-4 h-4 inline text-blue-400" /> <span className="text-blue-400 font-medium">Sur l'écran d'accueil</span></> },
                  { n: 3, content: <>Ouvrez <span className="text-blue-400 font-medium">XHRIS</span> depuis l'écran d'accueil</> },
                  { n: 4, content: <>Activez les <span className="text-green-400 font-medium">notifications</span> quand on vous le propose</> },
                ].map(({ n, content }) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className={`w-6 h-6 ${n === 4 ? 'bg-green-500/20' : 'bg-blue-500/20'} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <span className={`text-xs font-bold ${n === 4 ? 'text-green-400' : 'text-blue-400'}`}>{n}</span>
                    </div>
                    <p className="text-sm text-gray-300">{content}</p>
                  </div>
                ))}
              </div>

              <button onClick={handleDismiss} className="w-full text-sm text-gray-400 hover:text-white py-2 rounded-lg transition-colors">
                J'ai compris
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-2">
              <p className="text-green-400 font-medium">✅ Notifications activées !</p>
            </div>
          )}

          {step === 'denied' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-300">
                Les notifications ont été refusées. Activez-les dans les paramètres de votre navigateur.
              </p>
              <button onClick={handleDismiss} className="text-sm text-gray-400 hover:text-white transition-colors">
                Fermer
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
