'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Coins, CheckCircle, ArrowLeft, Loader2, Shield, Star,
  Smartphone, Upload, X, ExternalLink, Send, Clock, ChevronDown,
} from 'lucide-react';
import { useCoinsBalance, useInvalidateBalance } from '@/lib/useCoinsBalance';
import { apiClient } from '@/lib/api';
import { COIN_PACKS } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

const OPERATOR_NUMBER = '+237690768603';
const ADMIN_WHATSAPP  = '237694600007';

const CURRENCIES = [
  { code: 'XAF', label: 'FCFA (XAF)', rate: 655 },
  { code: 'XOF', label: 'FCFA CFA (XOF)', rate: 655 },
  { code: 'EUR', label: 'Euro (EUR)', rate: 1 },
  { code: 'USD', label: 'Dollar (USD)', rate: 1.08 },
  { code: 'GBP', label: 'Livre (GBP)', rate: 0.85 },
  { code: 'GHS', label: 'Cedi (GHS)', rate: 12 },
  { code: 'NGN', label: 'Naira (NGN)', rate: 1200 },
  { code: 'MAD', label: 'Dirham (MAD)', rate: 10 },
];

const PAYMENT_METHODS = [
  {
    id: 'fapshi',
    label: 'Fapshi',
    desc: 'Paiement automatique · Cameroun',
    flag: '🇨🇲',
    color: 'border-blue-500/40 hover:bg-blue-500/5',
    accent: 'text-blue-400',
    auto: true,
    appStore: 'https://apps.apple.com/app/fapshi/id1567268174',
    playStore: 'https://play.google.com/store/apps/details?id=com.fapshi.app',
  },
  {
    id: 'minipay',
    label: 'MiniPay',
    desc: 'Envoi manuel · Afrique',
    flag: '🌍',
    color: 'border-green-500/40 hover:bg-green-500/5',
    accent: 'text-green-400',
    auto: false,
    appStore: 'https://apps.apple.com/app/minipay/id6447212439',
    playStore: 'https://play.google.com/store/apps/details?id=com.opera.mini.native',
  },
  {
    id: 'geniuspay',
    label: 'Genius Pay',
    desc: 'Paiement automatique · Afrique francophone',
    flag: '🌍',
    color: 'border-yellow-500/40 hover:bg-yellow-500/5',
    accent: 'text-yellow-400',
    auto: true,
    appStore: null,
    playStore: null,
  },
  {
    id: 'europe',
    label: 'Europe / International',
    desc: 'Virement manuel · International',
    flag: '🇪🇺',
    color: 'border-purple-500/40 hover:bg-purple-500/5',
    accent: 'text-purple-400',
    auto: false,
    appStore: null,
    playStore: null,
  },
];

function formatAmount(eurPrice: number, currency: typeof CURRENCIES[0]) {
  const amount = Math.round(eurPrice * currency.rate);
  return `${amount.toLocaleString('fr-FR')} ${currency.code}`;
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
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fapshi: automatic API payment
  const fapshiMutation = useMutation({
    mutationFn: async () => {
      const res: any = await apiClient.post('/payments/fapshi/initiate', {
        packId: selectedPack.id,
        coins: selectedPack.coins,
        amount: selectedPack.price,
        phone: phone.trim(),
      });
      const payload = res?.data || {};
      if (payload.success === false) {
        throw new Error(payload.message || 'Erreur Fapshi');
      }
      const link =
        payload?.data?.link ||
        payload?.data?.paymentUrl ||
        payload?.link ||
        payload?.paymentUrl ||
        null;
      if (!link) throw new Error('Lien de paiement manquant — réessayez');
      return { link };
    },
    onSuccess: ({ link }) => {
      toast.success('Redirection vers Fapshi...');
      // window.location.href fonctionne TOUJOURS sur mobile (pas bloqué par popup blocker)
      setTimeout(() => { window.location.href = link; }, 500);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || 'Erreur Fapshi — réessayez';
      toast.error(msg);
    },
  });

  // GeniusPay: automatic checkout
  const geniusPayMutation = useMutation({
    mutationFn: async () => {
      const res: any = await apiClient.post('/payments/geniuspay/initiate', {
        packId: selectedPack.id,
        coins: selectedPack.coins,
        amount: Math.round(selectedPack.price * currency.rate),
        currency: currency.code,
        description: `XHRIS Host — ${selectedPack.coins} Coins`,
      });
      const payload = res?.data || {};
      if (payload.success === false) {
        throw new Error(payload.message || 'Erreur GeniusPay');
      }
      const checkoutUrl =
        payload?.data?.checkoutUrl ||
        payload?.data?.paymentUrl ||
        payload?.checkoutUrl ||
        payload?.paymentUrl ||
        null;
      if (!checkoutUrl) throw new Error('Lien de paiement manquant — réessayez');
      return { checkoutUrl };
    },
    onSuccess: ({ checkoutUrl }) => {
      toast.success('Redirection vers GeniusPay...');
      setTimeout(() => { window.location.href = checkoutUrl; }, 500);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || 'Erreur GeniusPay';
      toast.error(msg);
    },
  });

  // Manual payment: upload screenshot + send to WhatsApp
  const sendManual = async () => {
    if (!screenshot) { toast.error('Veuillez joindre votre capture de paiement'); return; }
    setUploading(true);
    try {
      let fileUrl = '';
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
        if (uploadRes.ok) {
          const d = await uploadRes.json();
          fileUrl = d?.data?.url || d?.data?.fileUrl || '';
        }
      } catch {}

      const packInfo = [
        `Pack: ${selectedPack.name} (${selectedPack.coins} Coins)`,
        `Montant: ${formatAmount(selectedPack.price, currency)}`,
        `Méthode: ${selectedMethod.label}`,
        `Utilisateur: ${(session?.user as any)?.name || ''} (${(session?.user as any)?.email || ''})`,
        fileUrl ? `Capture: ${fileUrl}` : '',
      ].filter(Boolean).join('\n');

      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(packInfo)}`, '_blank');
      setStep('success');
      toast.success('Demande envoyée ! Vérification sous 24h.');
    } catch {
      toast.error('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setUploading(false);
    }
  };

  const method = selectedMethod;
  const isFapshi = method?.id === 'fapshi';
  const isGeniusPay = method?.id === 'geniuspay';
  const isEurope = method?.id === 'europe';
  const stepIdx = ['packs', 'method', 'pay'].indexOf(step);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step !== 'packs' && step !== 'success' ? (
          <button onClick={() => setStep(step === 'method' ? 'packs' : 'method')} className="p-2 hover:bg-white/5 rounded-lg">
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
                step === s ? 'bg-purple-600 text-white' : stepIdx > i ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-500'
              }`}>{stepIdx > i ? '✓' : i + 1}</div>
              <span className={`hidden sm:inline ${step === s ? 'text-white' : 'text-gray-500'}`}>
                {s === 'packs' ? 'Pack' : s === 'method' ? 'Méthode' : 'Paiement'}
              </span>
              {i < 2 && <div className="w-6 h-px bg-white/10" />}
            </div>
          ))}
        </div>
      )}

      {/* ── Step 1: Choose pack ── */}
      {step === 'packs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COIN_PACKS.map(pack => (
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
                <div className="text-xl font-bold text-amber-400">{Math.round(pack.price * 655).toLocaleString('fr-FR')} FCFA</div>
                <div className="text-xs text-gray-500 mt-1">≈ €{pack.price.toFixed(2)}</div>
              </motion.button>
            ))}
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">Paiements vérifiés. Coins crédités sous 24h (Fapshi : instantané).</p>
          </div>
          <button onClick={() => setStep('method')} disabled={!selectedPack}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            <Coins className="w-4 h-4" />
            {selectedPack ? `Continuer — ${Math.round(selectedPack.price * 655).toLocaleString('fr-FR')} FCFA` : 'Sélectionnez un pack'}
          </button>
        </div>
      )}

      {/* ── Step 2: Choose method ── */}
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
            <div className="text-lg font-bold text-amber-400">{Math.round(selectedPack.price * 655).toLocaleString('fr-FR')} FCFA</div>
          </div>
          <div className="space-y-2">
            {PAYMENT_METHODS.map(m => (
              <button key={m.id} onClick={() => setSelectedMethod(m)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  selectedMethod?.id === m.id ? 'border-purple-500 bg-purple-500/5' : `border-white/5 bg-[#111118] ${m.color}`
                }`}>
                <span className="text-2xl">{m.flag}</span>
                <div className="flex-1">
                  <div className={`font-medium text-sm ${selectedMethod?.id === m.id ? 'text-white' : 'text-gray-200'}`}>
                    {m.label}
                    {m.auto && <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">Automatique</span>}
                  </div>
                  <div className="text-xs text-gray-500">{m.desc}</div>
                </div>
                {selectedMethod?.id === m.id && <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
          <button onClick={() => setStep('pay')} disabled={!selectedMethod}
            className="btn-primary w-full py-3 disabled:opacity-50">Continuer</button>
        </div>
      )}

      {/* ── Step 3: Pay ── */}
      {step === 'pay' && selectedPack && method && (
        <div className="space-y-4">
          {/* Pack recap */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">{selectedPack.coins.toLocaleString()} Coins · {method.label}</div>
              <div className="text-xs text-gray-400">{selectedPack.label}</div>
            </div>

            {/* Currency picker (for all methods) */}
            <div className="relative">
              <button onClick={() => setShowCurrencyPicker(p => !p)}
                className="flex items-center gap-1.5 bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-2 text-sm text-amber-400 font-bold hover:bg-white/5 transition-colors">
                {formatAmount(selectedPack.price, currency)}
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
              {showCurrencyPicker && (
                <div className="absolute right-0 top-11 z-50 w-52 bg-[#1A1A24] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-white/10 text-xs text-gray-400">Choisir la devise</div>
                  <div className="max-h-52 overflow-y-auto">
                    {CURRENCIES.map(c => (
                      <button key={c.code} onClick={() => { setCurrency(c); setShowCurrencyPicker(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/5 transition-colors ${currency.code === c.code ? 'text-purple-400' : 'text-gray-300'}`}>
                        <span>{c.label}</span>
                        <span className="text-gray-500">{Math.round(selectedPack.price * c.rate).toLocaleString('fr-FR')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── FAPSHI: automatic ── */}
          {isFapshi && (
            <>
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-3">1. Téléchargez Fapshi</p>
                <div className="flex gap-2">
                  <a href={method.playStore} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-3 py-2 text-xs hover:bg-green-500/20 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Google Play
                  </a>
                  <a href={method.appStore} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg px-3 py-2 text-xs hover:bg-blue-500/20 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> App Store
                  </a>
                </div>
              </div>
              <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-3">2. Entrez votre numéro Fapshi</p>
                <input className="input-field w-full" placeholder="+237 6XX XXX XXX" value={phone}
                  onChange={e => setPhone(e.target.value)} />
              </div>
              <button onClick={() => fapshiMutation.mutate()} disabled={!phone.trim() || fapshiMutation.isPending}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                {fapshiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Coins className="w-4 h-4" /> Payer {formatAmount(selectedPack.price, currency)} avec Fapshi</>}
              </button>
            </>
          )}

          {/* ── GENIUSPAY: automatic checkout ── */}
          {isGeniusPay && (
            <div className="space-y-4">
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">💳</div>
                <h3 className="text-base font-semibold text-white mb-1">GeniusPay Checkout</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Vous serez redirigé vers la page de paiement sécurisée GeniusPay. Choisissez Wave, Orange Money, MTN ou carte bancaire.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {['Wave', 'Orange Money', 'MTN MoMo', 'Carte'].map(op => (
                    <span key={op} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-gray-300">{op}</span>
                  ))}
                </div>
                <div className="bg-[#1A1A24] rounded-lg p-3 flex items-center justify-between mb-4">
                  <span className="text-xs text-gray-400">Montant à payer</span>
                  <span className="text-yellow-400 font-bold">{formatAmount(selectedPack.price, currency)}</span>
                </div>
              </div>
              <button
                onClick={() => geniusPayMutation.mutate()}
                disabled={geniusPayMutation.isPending}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {geniusPayMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Coins className="w-4 h-4" /> Payer {formatAmount(selectedPack.price, currency)} avec GeniusPay</>
                )}
              </button>
              <div className="bg-white/5 rounded-xl p-3 flex items-start gap-2">
                <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400">Paiement sécurisé. Coins crédités automatiquement après confirmation.</p>
              </div>
            </div>
          )}

          {/* ── MANUAL (MiniPay / Europe) ── */}
          {!isFapshi && !isGeniusPay && (
            <>
              {/* App download links */}
              {(method.appStore || method.playStore) && (
                <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
                  <p className="text-sm font-medium text-white mb-3">1. Téléchargez {method.label}</p>
                  <div className="flex gap-2">
                    {method.playStore && (
                      <a href={method.playStore} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-3 py-2 text-xs hover:bg-green-500/20 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> Google Play
                      </a>
                    )}
                    {method.appStore && (
                      <a href={method.appStore} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg px-3 py-2 text-xs hover:bg-blue-500/20 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> App Store
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Transfer instructions */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-3">{method.appStore ? '2.' : '1.'} Envoyez le paiement</p>
                <div className="space-y-2">
                  <div className="bg-[#1A1A24] rounded-lg p-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Numéro à créditer</span>
                    <span className="text-amber-400 font-mono font-bold">{OPERATOR_NUMBER}</span>
                  </div>
                  <div className="bg-[#1A1A24] rounded-lg p-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Montant exact</span>
                    <span className="text-amber-400 font-bold">{formatAmount(selectedPack.price, currency)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Référence : <span className="text-amber-400 font-mono">XHRIS-{selectedPack.id.toUpperCase()}</span></p>
              </div>

              {/* Screenshot upload */}
              <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-3">{method.appStore ? '3.' : '2.'} Uploadez votre capture de paiement</p>
                <input ref={fileRef} type="file" className="hidden" accept="image/*"
                  onChange={e => { if (e.target.files?.[0]) setScreenshot(e.target.files[0]); e.target.value = ''; }} />
                {screenshot ? (
                  <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-xs text-green-400 flex-1 truncate">{screenshot.name}</span>
                    <button onClick={() => setScreenshot(null)} className="text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-purple-500/40 transition-colors">
                    <Upload className="w-6 h-6 text-gray-500" />
                    <span className="text-xs text-gray-500">Cliquez pour sélectionner la capture</span>
                  </button>
                )}
              </div>

              <button onClick={sendManual} disabled={!screenshot || uploading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> J'ai payé — Envoyer la confirmation</>}
              </button>

              <div className="bg-white/5 rounded-xl p-3 flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400">Coins crédités dans les <span className="text-white">24h</span> après vérification.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 4: Success ── */}
      {step === 'success' && selectedPack && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{(isFapshi || isGeniusPay) ? 'Paiement initié !' : 'Demande envoyée !'}</h2>
          <p className="text-gray-400 mb-1">{isFapshi ? 'Complétez le paiement sur Fapshi. Vos Coins seront crédités automatiquement.' : isGeniusPay ? 'Complétez le paiement sur GeniusPay. Vos Coins seront crédités automatiquement.' : 'Notre équipe va vérifier votre paiement sous 24h.'}</p>
          <p className="text-amber-400 font-bold text-xl my-4">+{selectedPack.coins.toLocaleString()} Coins en attente</p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="btn-primary">Retour au dashboard</Link>
            <button onClick={() => { setStep('packs'); setSelectedPack(null); setSelectedMethod(null); setScreenshot(null); setPhone(''); }} className="btn-secondary">
              Acheter encore
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
