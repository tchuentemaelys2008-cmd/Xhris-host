'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, CheckCircle, ArrowLeft, Loader2, Shield, Star,
  Smartphone, Upload, X, ExternalLink, Send, Clock,
} from 'lucide-react';
import { useCoinsBalance, useInvalidateBalance } from '@/lib/useCoinsBalance';
import { COIN_PACKS } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

const OPERATOR_NUMBER = '+237690768603';
const ADMIN_WHATSAPP  = '237694600007';

const PAYMENT_METHODS = [
  {
    id: 'fapshi',
    label: 'Fapshi',
    desc: 'Paiement mobile Cameroun',
    flag: '🇨🇲',
    color: 'border-blue-500/40 hover:bg-blue-500/5',
    accent: 'text-blue-400',
    appStore: 'https://apps.apple.com/app/fapshi/id1567268174',
    playStore: 'https://play.google.com/store/apps/details?id=com.fapshi.app',
    regions: ['Cameroun'],
  },
  {
    id: 'minipay',
    label: 'MiniPay',
    desc: 'Paiement mobile Afrique',
    flag: '🌍',
    color: 'border-green-500/40 hover:bg-green-500/5',
    accent: 'text-green-400',
    appStore: 'https://apps.apple.com/app/minipay/id6447212439',
    playStore: 'https://play.google.com/store/apps/details?id=com.opera.mini.native',
    regions: ['Cameroun', 'Côte d\'Ivoire', 'Ghana', 'Nigeria', 'Kenya'],
  },
  {
    id: 'geniuspay',
    label: 'Genius Pay',
    desc: 'Paiement mobile Afrique',
    flag: '🌍',
    color: 'border-yellow-500/40 hover:bg-yellow-500/5',
    accent: 'text-yellow-400',
    appStore: 'https://apps.apple.com/search?term=genius+pay',
    playStore: 'https://play.google.com/store/search?q=genius+pay',
    regions: ['Afrique francophone'],
  },
  {
    id: 'europe',
    label: 'Europe / International',
    desc: 'Virement sur notre compte',
    flag: '🇪🇺',
    color: 'border-purple-500/40 hover:bg-purple-500/5',
    accent: 'text-purple-400',
    appStore: null,
    playStore: null,
    regions: ['Europe', 'International'],
  },
];

function formatXAF(eurPrice: number) {
  return `${Math.round(eurPrice * 655).toLocaleString('fr-FR')} FCFA`;
}

export default function BuyCoinsPage() {
  const { data: session } = useSession();
  const { balance } = useCoinsBalance();
  const invalidateBalance = useInvalidateBalance();

  const [step, setStep] = useState<'packs' | 'method' | 'pay' | 'success'>('packs');
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sendToAdmin = async () => {
    if (!screenshot) { toast.error('Veuillez joindre votre capture de paiement'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', screenshot);
      const token = localStorage.getItem('auth_token') || (session as any)?.accessToken;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const uploadRes = await fetch(`${backendUrl}/api/community/channels/payment-proof/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      let fileUrl = '';
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        fileUrl = uploadData?.data?.url || uploadData?.data?.fileUrl || '';
      }

      const packInfo = `Pack: ${selectedPack.name} (${selectedPack.coins} Coins)\nMontant: ${formatXAF(selectedPack.price)}\nMéthode: ${selectedMethod.label}\nUtilisateur: ${(session?.user as any)?.name || ''} (${(session?.user as any)?.email || ''})${fileUrl ? `\nCapture: ${fileUrl}` : ''}`;
      const waLink = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(packInfo)}`;
      window.open(waLink, '_blank');

      setStep('success');
      toast.success('Demande envoyée ! Vos coins seront crédités après vérification.');
    } catch {
      toast.error('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setUploading(false);
    }
  };

  const method = selectedMethod;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step !== 'packs' && step !== 'success' ? (
          <button onClick={() => setStep(step === 'method' ? 'packs' : step === 'pay' ? 'method' : 'packs')}
            className="p-2 hover:bg-white/5 rounded-lg">
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
        ) : (
          <Link href="/dashboard/coins" className="p-2 hover:bg-white/5 rounded-lg">
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </Link>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Acheter des Coins</h1>
          <p className="text-gray-400 text-sm">Solde : <span className="text-amber-400 font-semibold">{balance.toLocaleString('fr-FR')} Coins</span></p>
        </div>
      </div>

      {/* Step indicators */}
      {step !== 'success' && (
        <div className="flex items-center gap-2 text-xs">
          {(['packs', 'method', 'pay'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium ${
                step === s ? 'bg-purple-600 text-white' :
                ['packs','method','pay'].indexOf(step) > i ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-500'
              }`}>
                {['packs','method','pay'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              <span className={`hidden sm:inline ${step === s ? 'text-white' : 'text-gray-500'}`}>
                {s === 'packs' ? 'Pack' : s === 'method' ? 'Méthode' : 'Paiement'}
              </span>
              {i < 2 && <div className="w-6 h-px bg-white/10" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Choose pack */}
      {step === 'packs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COIN_PACKS.map((pack) => (
              <motion.button key={pack.id} onClick={() => setSelectedPack(pack)}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className={`relative bg-[#111118] border-2 rounded-xl p-5 text-left transition-all ${
                  selectedPack?.id === pack.id ? 'border-purple-500 bg-purple-500/5' : 'border-white/5 hover:border-white/15'
                } ${(pack as any).popular ? 'ring-1 ring-purple-500/30' : ''}`}>
                {(pack as any).popular && (
                  <div className="absolute -top-2.5 left-4 bg-purple-600 text-white text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Populaire
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span className="text-lg font-bold text-white">{pack.coins.toLocaleString()}</span>
                    <span className="text-sm text-gray-400">Coins</span>
                  </div>
                  {selectedPack?.id === pack.id && <CheckCircle className="w-5 h-5 text-purple-400" />}
                </div>
                <div className="text-xs text-gray-400 mb-3">{pack.label}</div>
                <div className="text-xl font-bold text-amber-400">{formatXAF(pack.price)}</div>
                <div className="text-xs text-gray-500 mt-1">≈ €{pack.price.toFixed(2)}</div>
              </motion.button>
            ))}
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">Paiements vérifiés manuellement. Coins crédités sous 24h après confirmation. Non remboursable.</p>
          </div>

          <button onClick={() => setStep('method')} disabled={!selectedPack}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            <Coins className="w-4 h-4" />
            {selectedPack ? `Continuer — ${formatXAF(selectedPack.price)}` : 'Sélectionnez un pack'}
          </button>
        </div>
      )}

      {/* Step 2: Choose payment method */}
      {step === 'method' && selectedPack && (
        <div className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-amber-400" />
              <div>
                <div className="font-semibold text-white">{selectedPack.coins.toLocaleString()} Coins</div>
                <div className="text-xs text-gray-400">{selectedPack.label}</div>
              </div>
            </div>
            <div className="text-lg font-bold text-amber-400">{formatXAF(selectedPack.price)}</div>
          </div>

          <div className="space-y-2">
            {PAYMENT_METHODS.map(m => (
              <button key={m.id} onClick={() => setSelectedMethod(m)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  selectedMethod?.id === m.id ? 'border-purple-500 bg-purple-500/5' : `border-white/5 bg-[#111118] ${m.color}`
                }`}>
                <span className="text-2xl">{m.flag}</span>
                <div className="flex-1">
                  <div className={`font-medium text-sm ${selectedMethod?.id === m.id ? 'text-white' : 'text-gray-200'}`}>{m.label}</div>
                  <div className="text-xs text-gray-500">{m.desc} · {m.regions.join(', ')}</div>
                </div>
                {selectedMethod?.id === m.id && <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />}
              </button>
            ))}
          </div>

          <button onClick={() => setStep('pay')} disabled={!selectedMethod}
            className="btn-primary w-full py-3 disabled:opacity-50">
            Continuer
          </button>
        </div>
      )}

      {/* Step 3: Payment instructions + upload */}
      {step === 'pay' && selectedPack && method && (
        <div className="space-y-4">
          {/* Pack recap */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-400">Pack sélectionné</span>
              <span className="font-bold text-amber-400">{formatXAF(selectedPack.price)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{selectedPack.coins.toLocaleString()} Coins · {method.label}</span>
            </div>
          </div>

          {/* App download links */}
          {(method.appStore || method.playStore) && (
            <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-3">1. Téléchargez l'application {method.label}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                {method.playStore && (
                  <a href={method.playStore} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-2.5 text-sm hover:bg-green-500/20 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    Google Play Store
                  </a>
                )}
                {method.appStore && (
                  <a href={method.appStore} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg px-4 py-2.5 text-sm hover:bg-blue-500/20 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    Apple App Store
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Transfer instructions */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-sm font-medium text-white mb-2">
              {method.appStore || method.playStore ? '2.' : '1.'} Envoyez le paiement
            </p>
            <div className="bg-[#1A1A24] rounded-lg p-3 flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Numéro à créditer</span>
              <span className="text-amber-400 font-mono font-bold">{OPERATOR_NUMBER}</span>
            </div>
            <div className="bg-[#1A1A24] rounded-lg p-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">Montant exact</span>
              <span className="text-amber-400 font-bold">{formatXAF(selectedPack.price)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Utilisez la référence : <span className="text-amber-400 font-mono">XHRIS-{selectedPack.id.toUpperCase()}</span></p>
          </div>

          {/* Screenshot upload */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <p className="text-sm font-medium text-white mb-3">
              {method.appStore || method.playStore ? '3.' : '2.'} Uploadez votre capture de paiement
            </p>
            <input ref={fileRef} type="file" className="hidden" accept="image/*"
              onChange={e => { if (e.target.files?.[0]) setScreenshot(e.target.files[0]); e.target.value = ''; }} />

            {screenshot ? (
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-xs text-green-400 flex-1 truncate">{screenshot.name}</span>
                <button onClick={() => setScreenshot(null)} className="text-gray-500 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-purple-500/40 transition-colors">
                <Upload className="w-6 h-6 text-gray-500" />
                <span className="text-xs text-gray-500">Cliquez pour sélectionner la capture</span>
                <span className="text-[10px] text-gray-600">JPG, PNG · Max 5 Mo</span>
              </button>
            )}
          </div>

          {/* Submit */}
          <button onClick={sendToAdmin} disabled={!screenshot || uploading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> J'ai payé — Envoyer la confirmation</>}
          </button>

          <div className="bg-white/5 rounded-xl p-3 flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">Vos Coins seront crédités dans les <span className="text-white">24h</span> après vérification par notre équipe.</p>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && selectedPack && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Demande envoyée !</h2>
          <p className="text-gray-400 mb-1">Notre équipe va vérifier votre paiement.</p>
          <p className="text-amber-400 font-bold text-xl my-4">+{selectedPack.coins.toLocaleString()} Coins en attente</p>
          <p className="text-xs text-gray-500 mb-6">Crédité sous 24h · Vérification manuelle</p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="btn-primary">Retour au dashboard</Link>
            <button onClick={() => { setStep('packs'); setSelectedPack(null); setSelectedMethod(null); setScreenshot(null); }} className="btn-secondary">
              Acheter encore
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
