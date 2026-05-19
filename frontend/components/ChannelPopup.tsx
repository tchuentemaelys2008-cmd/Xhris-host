'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api';

const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vark1I1AYlUR1G8YMX31';

export default function ChannelPopup() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // Only check once the session is fully loaded and user is authenticated
  useEffect(() => {
    if (status !== 'authenticated' || !user?.id) return;

    // Don't show if user already dismissed this session
    if (sessionStorage.getItem('channel_popup_dismissed')) return;

    apiClient.get('/growth/tasks')
      .then((r: any) => {
        const joinTask = r?.data?.data?.tasks?.find((t: any) => t.id === 'join_channel');
        if (joinTask && !joinTask.completed) {
          // Small delay so the page settles after login
          setTimeout(() => setShow(true), 800);
        }
      })
      .catch(() => {});
  // Re-run when user.id changes (new login)
  }, [status, user?.id]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const r = await apiClient.post('/growth/complete/join_channel');
      const reward = r?.data?.data?.reward || 20;
      setShow(false);
      window.dispatchEvent(new CustomEvent('coins-updated'));
      // Delay the alert so the modal closes first
      setTimeout(() => alert(`+${reward} coins ajoutés ! Merci d'avoir rejoint la chaîne.`), 200);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleLater = () => {
    sessionStorage.setItem('channel_popup_dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleLater(); }}
    >
      <div className="bg-[#0D0D14] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6 space-y-4">
        {/* Icon + title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto bg-green-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4 7.94 7.94 0 0 0 5.18 16l-1.18 4.32 4.42-1.16a7.93 7.93 0 0 0 3.8.97h.01a7.94 7.94 0 0 0 5.37-13.81z"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Rejoins notre chaîne WhatsApp</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Reçois les actus XHRIS MD en avant-première et gagne{' '}
            <span className="font-bold text-yellow-400">+20 coins</span> offerts !
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4 7.94 7.94 0 0 0 5.18 16l-1.18 4.32 4.42-1.16a7.93 7.93 0 0 0 3.8.97h.01a7.94 7.94 0 0 0 5.37-13.81z"/>
            </svg>
            Ouvrir la chaîne
          </a>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {loading ? 'Vérification…' : "✅ J'ai rejoint — Recevoir +20 coins"}
          </button>

          <button
            onClick={handleLater}
            className="w-full py-2 text-gray-600 hover:text-gray-400 text-sm transition-colors"
          >
            Plus tard
          </button>
        </div>

        <p className="text-[11px] text-center text-gray-700">
          Cette fenêtre réapparaîtra à ta prochaine connexion.
        </p>
      </div>
    </div>
  );
}
