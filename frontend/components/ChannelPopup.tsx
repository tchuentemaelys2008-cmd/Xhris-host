'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vark1I1AYlUR1G8YMX31';

export default function ChannelPopup() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('channel_popup_dismissed');
    if (dismissed) return;

    apiClient.get('/growth/tasks')
      .then((r: any) => {
        const joinTask = r?.data?.data?.tasks?.find((t: any) => t.id === 'join_channel');
        if (joinTask && !joinTask.completed) setShow(true);
      })
      .catch(() => {});
  }, []);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const r = await apiClient.post('/growth/complete/join_channel');
      const reward = r?.data?.data?.reward || 20;
      setShow(false);
      window.dispatchEvent(new CustomEvent('user-updated'));
      // Refresh coin balance
      window.dispatchEvent(new CustomEvent('coins-updated'));
      alert(`+${reward} coins ajoutés ! Merci d'avoir rejoint la chaîne.`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Erreur de connexion';
      alert(msg);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D0D14] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4 7.94 7.94 0 0 0 5.18 16l-1.18 4.32 4.42-1.16a7.93 7.93 0 0 0 3.8.97h.01a7.94 7.94 0 0 0 5.37-13.81z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">
            Rejoins notre chaîne WhatsApp
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Reçois les news XHRIS MD, astuces de bots, et{' '}
            <span className="font-bold text-yellow-400">+20 coins</span> en bonus !
          </p>
        </div>

        <div className="space-y-3">
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-center transition-colors"
          >
            Ouvrir la chaîne
          </a>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'En cours...' : "J'ai rejoint — Recevoir +20 coins"}
          </button>

          <button
            onClick={handleLater}
            className="w-full py-2 px-4 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Plus tard
          </button>
        </div>

        <p className="mt-4 text-xs text-center text-gray-600">
          Tu pourras revenir compléter cette tâche depuis ton dashboard.
        </p>
      </div>
    </div>
  );
}
