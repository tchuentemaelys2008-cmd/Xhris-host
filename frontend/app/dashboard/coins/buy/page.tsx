'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Coins, CreditCard, Smartphone, CheckCircle, ArrowLeft,
  Loader2, Shield, Zap, Star, ChevronDown, Globe,
} from 'lucide-react';
import { coinsApi, paymentsApi } from '@/lib/api';
import { useCoinsBalance, useInvalidateBalance } from '@/lib/useCoinsBalance';
import { COIN_PACKS } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

const CURRENCIES = [
  { code: 'XAF', label: 'FCFA (XAF)', flag: '🌍', rate: 655 },
  { code: 'XOF', label: 'FCFA CFA (XOF)', flag: '🌍', rate: 655 },
  { code: 'GHS', label: 'Cedi (GHS)', flag: '🇬🇭', rate: 12 },
  { code: 'NGN', label: 'Naira (NGN)', flag: '🇳🇬', rate: 1200 },
  { code: 'KES', label: 'Shilling (KES)', flag: '🇰🇪', rate: 130 },
  { code: 'MAD', label: 'Dirham (MAD)', flag: '🇲🇦', rate: 10 },
  { code: 'DZD', label: 'Dinar (DZD)', flag: '🇩🇿', rate: 135 },
  { code: 'TND', label: 'Dinar (TND)', flag: '🇹🇳', rate: 3.1 },
  { code: 'EUR', label: 'Euro (EUR)', flag: '🇪🇺', rate: 1 },
  { code: 'USD', label: 'Dollar (USD)', flag: '🇺🇸', rate: 1.08 },
  { code: 'GBP', label: 'Livre (GBP)', flag: '🇬🇧', rate: 0.85 },
];

const PAYMENT_METHODS = [
  { id: 'mtn', label: 'MTN Mobile Money', icon: Smartphone, color: 'border-yellow-500/30 hover:bg-yellow-500/5', countries: ['CM', 'GH', 'RW', 'UG', 'CI'] },
  { id: 'orange', label: 'Orange Money', icon: Smartphone, color: 'border-orange-500/30 hover:bg-orange-500/5', countries: ['CM', 'SN', 'CI', 'ML'] },
  { id: 'wave', label: 'Wave', icon: Smartphone, color: 'border-blue-400/30 hover:bg-blue-400/5', countries: ['SN', 'CI', 'BF', 'ML'] },
  { id: 'moov', label: 'Moov Money', icon: Smartphone, color: 'border-cyan-500/30 hover:bg-cyan-500/5', countries: ['CI', 'BJ', 'TG', 'BF'] },
  { id: 'paypal', label: 'PayPal', icon: CreditCard, color: 'border-blue-500/30 hover:bg-blue-500/5', countries: [] },
  { id: 'stripe', label: 'Carte bancaire', icon: CreditCard, color: 'border-purple-500/30 hover:bg-purple-500/5', countries: [] },
];

function formatPrice(eurPrice: number, currency: typeof CURRENCIES[0]) {
  const amount = Math.round(eurPrice * currency.rate);
  return `${amount.toLocaleString('fr-FR')} ${currency.code}`;
}

export default function BuyCoinsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [step, setStep] = useState<'packs' | 'payment' | 'confirm' | 'success'>('packs');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState(CURRENCIES[0]); // FCFA by default
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const { balance } = useCoinsBalance();
  const invalidateBalance = useInvalidateBalance();

  const orderMutation = useMutation({
    mutationFn: () => paymentsApi.createOrder({
      packId: selectedPack.id,
      method: paymentMethod,
      coins: selectedPack.coins,
      amount: selectedPack.price,
    }),
    onSuccess: () => {
      invalidateBalance();
      setStep('success');
      toast.success(`+${selectedPack.coins} Coins ajoutés !`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur de paiement'),
  });

  const mobilePayMethods = PAYMENT_METHODS.filter(m => m.id !== 'paypal' && m.id !== 'stripe');
  const cardPayMethods = PAYMENT_METHODS.filter(m => m.id === 'paypal' || m.id === 'stripe');
  const needsPhone = ['mtn', 'orange', 'wave', 'moov'].includes(paymentMethod);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step !== 'packs' && step !== 'success' ? (
          <button onClick={() => setStep(step === 'payment' ? 'packs' : 'payment')} className="p-2 hover:bg-white/5 rounded-lg">
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
        ) : (
          <Link href="/dashboard/coins" className="p-2 hover:bg-white/5 rounded-lg">
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </Link>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Acheter des Coins</h1>
          <p className="text-gray-400 text-sm">Solde : <span className="text-amber-400 font-semibold">{balance.toLocaleString()} Coins</span></p>
        </div>

        {/* Currency selector */}
        <div className="relative">
          <button
            onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <Globe className="w-4 h-4 text-gray-400" />
            <span>{currency.code}</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>
          {showCurrencyPicker && (
            <div className="absolute right-0 top-11 z-50 w-56 bg-[#1A1A24] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 text-xs text-gray-400 font-medium uppercase tracking-wide">Choisir la devise</div>
              <div className="max-h-64 overflow-y-auto">
                {CURRENCIES.map(c => (
                  <button
                    key={c.code}
                    onClick={() => { setCurrency(c); setShowCurrencyPicker(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-white/5 transition-colors ${currency.code === c.code ? 'text-purple-400' : 'text-gray-300'}`}
                  >
                    <span>{c.flag}</span>
                    <span>{c.label}</span>
                    {currency.code === c.code && <CheckCircle className="w-3.5 h-3.5 ml-auto text-purple-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step indicator */}
      {step !== 'success' && (
        <div className="flex items-center gap-2 text-xs">
          {(['packs', 'payment', 'confirm'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium ${
                step === s ? 'bg-purple-600 text-white' :
                ['packs', 'payment', 'confirm'].indexOf(step) > i ? 'bg-green-600 text-white' :
                'bg-white/10 text-gray-500'
              }`}>
                {['packs', 'payment', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              <span className={step === s ? 'text-white' : 'text-gray-500 hidden sm:inline'}>
                {s === 'packs' ? 'Pack' : s === 'payment' ? 'Paiement' : 'Confirmer'}
              </span>
              {i < 2 && <div className="w-6 h-px bg-white/10" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Packs */}
      {step === 'packs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COIN_PACKS.map((pack) => (
              <motion.button
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`relative bg-[#111118] border-2 rounded-xl p-5 text-left transition-all ${
                  selectedPack?.id === pack.id ? 'border-purple-500 bg-purple-500/5' : 'border-white/5 hover:border-white/15'
                } ${(pack as any).popular ? 'ring-1 ring-purple-500/30' : ''}`}
              >
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
                <div className="text-xl font-bold text-purple-400">{formatPrice(pack.price, currency)}</div>
                <div className="text-xs text-gray-500 mt-1">≈ {(pack.price / pack.coins * 100).toFixed(1)} cts €/Coin</div>
              </motion.button>
            ))}
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">Paiements sécurisés. Coins crédités instantanément. Non remboursable.</p>
          </div>

          <button
            onClick={() => setStep('payment')}
            disabled={!selectedPack}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Coins className="w-4 h-4" />
            {selectedPack
              ? `Continuer — ${formatPrice(selectedPack.price, currency)}`
              : 'Sélectionnez un pack'}
          </button>
        </div>
      )}

      {/* Step 2: Payment */}
      {step === 'payment' && selectedPack && (
        <div className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-amber-400" />
              <div>
                <div className="font-semibold text-white">{selectedPack.name}</div>
                <div className="text-xs text-gray-400">{selectedPack.label}</div>
              </div>
            </div>
            <div className="text-lg font-bold text-purple-400">{formatPrice(selectedPack.price, currency)}</div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Mobile Money</h3>
            <div className="space-y-2">
              {mobilePayMethods.map(method => (
                <button key={method.id} onClick={() => setPaymentMethod(method.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === method.id ? 'border-purple-500 bg-purple-500/5' : `border-white/5 bg-[#111118] ${method.color}`
                  }`}>
                  <method.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-white text-sm">{method.label}</span>
                  {paymentMethod === method.id && <CheckCircle className="w-4 h-4 text-purple-400 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Carte / International</h3>
            <div className="space-y-2">
              {cardPayMethods.map(method => (
                <button key={method.id} onClick={() => setPaymentMethod(method.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === method.id ? 'border-purple-500 bg-purple-500/5' : `border-white/5 bg-[#111118] ${method.color}`
                  }`}>
                  <method.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-white text-sm">{method.label}</span>
                  {paymentMethod === method.id && <CheckCircle className="w-4 h-4 text-purple-400 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {needsPhone && (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Numéro de téléphone *</label>
              <input className="input-field w-full" placeholder="+237 6XX XXX XXX"
                value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          )}

          <button onClick={() => setStep('confirm')}
            disabled={!paymentMethod || (needsPhone && !phone)}
            className="btn-primary w-full py-3 disabled:opacity-50">
            Continuer
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && selectedPack && (
        <div className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Récapitulatif</h3>
            <div className="space-y-3">
              {[
                { label: 'Pack', value: selectedPack.name },
                { label: 'Coins', value: `${selectedPack.coins.toLocaleString()} Coins` },
                { label: 'Paiement', value: PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label },
                { label: 'Montant', value: formatPrice(selectedPack.price, currency) },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                  <span className="text-gray-400">{r.label}</span>
                  <span className="text-white font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">En confirmant, vous acceptez les conditions d&apos;utilisation. Coins crédités après confirmation du paiement.</p>
          </div>

          <button onClick={() => orderMutation.mutate()} disabled={orderMutation.isPending}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
            {orderMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</>
              : <><CreditCard className="w-4 h-4" /> Confirmer — {formatPrice(selectedPack.price, currency)}</>
            }
          </button>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && selectedPack && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Paiement réussi !</h2>
          <p className="text-gray-400 mb-1">Votre commande a été traitée avec succès.</p>
          <p className="text-3xl font-bold text-amber-400 my-4">+{selectedPack.coins.toLocaleString()} Coins</p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="btn-primary">Retour au dashboard</Link>
            <button onClick={() => { setStep('packs'); setSelectedPack(null); setPaymentMethod(''); }} className="btn-secondary">
              Acheter encore
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
