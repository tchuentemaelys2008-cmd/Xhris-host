'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

const methods = [
  { id: 'card', icon: '💳', label: 'Carte bancaire', desc: 'Retrait sur votre carte bancaire', fees: '1.5%', selected: true },
  { id: 'paypal', icon: '🅿️', label: 'PayPal', desc: 'Retrait sur votre compte PayPal', fees: '2.5%' },
  { id: 'crypto', icon: '₿', label: 'Cryptomonnaie', desc: 'Retrait en USDT, BTC, ETH...', fees: '1.0%' },
  { id: 'bank', icon: '🏦', label: 'Virement bancaire', desc: 'Virement SEPA/IBAN', fees: '0.5%' },
];

const recent = [
  { amount: '€250.00', method: 'PayPal', date: '12 Dec 2024, 14:30', status: 'Réussi', col: 'text-green-400' },
  { amount: '€1,000.00', method: 'Carte bancaire', date: '10 Dec 2024, 10:15', status: 'Réussi', col: 'text-green-400' },
  { amount: '€500.00', method: 'Cryptomonnaie', date: '08 Dec 2024, 16:45', status: 'Réussi', col: 'text-green-400' },
  { amount: '€750.00', method: 'Virement bancaire', date: '06 Dec 2024, 09:20', status: 'En cours', col: 'text-yellow-400' },
  { amount: '€200.00', method: 'Carte bancaire', date: '04 Dec 2024, 11:30', status: 'Réussi', col: 'text-green-400' },
];

const amounts = ['€100', '€250', '€500', '€1,000'];

export default function WithdrawalsPage() {
  const [selected, setSelected] = useState('card');
  const [amount, setAmount] = useState('500');
  const [step, setStep] = useState(1);

  const fee = parseFloat(amount) * 0.015;
  const receive = parseFloat(amount) - fee;

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Retraits</h1>
          <p className="text-gray-400 text-sm mt-1">Retirez vos fonds en toute sécurité sur votre méthode préférée.</p>
        </div>

        {/* Step 1 - Method */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">1. Sélectionner une méthode de retrait</h2>
          <div className="grid grid-cols-4 gap-3">
            {methods.map(m => (
              <motion.div
                key={m.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelected(m.id)}
                className={`relative p-4 rounded-xl border cursor-pointer transition-all ${selected === m.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-[#1A1A24] hover:border-white/20'}`}
              >
                {selected === m.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className="text-2xl mb-2">{m.icon}</div>
                <div className="text-sm font-semibold text-white mb-0.5">{m.label}</div>
                <div className="text-xs text-gray-400 mb-2">{m.desc}</div>
                <div className="text-xs text-purple-400 font-medium">Frais: {m.fees}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Step 2 - Details */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">2. Détails du retrait</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="text-xs text-gray-400 block mb-1.5">Montant à retirer</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-2.5 flex-1">
                    <span className="text-gray-400 text-sm">€</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="bg-transparent text-white text-lg font-bold outline-none flex-1 w-full"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {amounts.map(a => (
                    <button
                      key={a}
                      onClick={() => setAmount(a.replace('€', '').replace(',', ''))}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all ${amount === a.replace('€', '').replace(',', '') ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                      {a}
                    </button>
                  ))}
                  <button className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-400 hover:bg-white/10">Max</button>
                </div>
                <div className="mt-3 bg-[#1A1A24] rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400">Vous recevrez</div>
                    <div className="text-xl font-bold text-green-400">€{isNaN(receive) ? '0.00' : receive.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Estimation après frais</div>
                  </div>
                </div>
              </div>

              {/* Card info */}
              <div>
                <div className="text-sm font-medium text-white mb-3">Informations de paiement</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Titulaire de la carte</label>
                    <input className="input-field" defaultValue="Jean Dupont" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Numéro de carte</label>
                    <div className="relative">
                      <input className="input-field pr-12" defaultValue="•••• •••• •••• 4242" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">💳</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Date d'expiration</label>
                      <input className="input-field" defaultValue="12 / 26" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Code CVV</label>
                      <input className="input-field" type="password" defaultValue="123" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <div className="text-sm font-medium text-white mb-3">3. Résumé du retrait</div>
              <div className="bg-[#1A1A24] border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Montant demandé</span>
                  <span className="text-white font-medium">€{amount || '0'}.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Frais de traitement (1.5%)</span>
                  <span className="text-red-400 font-medium">- €{isNaN(fee) ? '0.00' : fee.toFixed(2)}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="text-white font-semibold">Vous recevrez</span>
                  <span className="text-green-400 font-bold text-lg">€{isNaN(receive) ? '0.00' : receive.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>⏱</span>
                  <span>Délai de traitement estimé</span>
                  <span className="text-yellow-400 font-medium ml-auto">24h à 48h</span>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm">
                  ← Retour
                </button>
                <button className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm">
                  🔒 Confirmer le retrait
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-3">
                En confirmant ce retrait, vous acceptez nos{' '}
                <a href="#" className="text-purple-400 hover:underline">conditions générales de retrait</a>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-56 flex-shrink-0 space-y-4">
        {/* Account summary */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Résumé du compte</h3>
          {[
            { l: 'Solde disponible', v: '€8,732.20', col: 'text-green-400' },
            { l: 'Retraits en attente', v: '€1,567.80', col: 'text-yellow-400' },
            { l: 'Total retiré', v: '€24,578.50' },
            { l: 'Limite mensuelle', v: '€20,000.00' },
          ].map(s => (
            <div key={s.l} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-xs">
              <span className="text-gray-400">{s.l}</span>
              <span className={(s as any).col || 'text-white font-medium'}>{s.v}</span>
            </div>
          ))}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Utilisé ce mois-ci</span>
              <span className="text-white">43.7%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full" style={{ width: '43.7%' }} />
            </div>
          </div>
        </div>

        {/* Important info */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Informations importantes</h3>
          {[
            'Délai de traitement : 24h à 48h ouvrées',
            'Retraits minimum : €10',
            'Limite maximale par retrait : €5,000',
            'Vérifiez bien vos informations avant de confirmer',
            'Les frais varient selon la méthode choisie',
          ].map((info, i) => (
            <div key={i} className="flex items-start gap-2 mb-2 text-xs text-gray-400">
              <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          ))}
        </div>

        {/* Recent withdrawals */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Retraits récents</h3>
            <button className="text-xs text-purple-400 hover:text-purple-300">Voir tout</button>
          </div>
          <div className="space-y-3">
            {recent.map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">{r.amount}</div>
                  <div className="text-xs text-gray-400">{r.method}</div>
                  <div className="text-xs text-gray-500">{r.date}</div>
                </div>
                <span className={`text-xs font-medium ${r.col}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Help */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Besoin d'aide ?</h3>
          <p className="text-xs text-gray-400 mb-3">Si vous avez des questions concernant vos retraits, notre équipe est là pour vous aider.</p>
          <button className="w-full btn-primary text-xs py-2">💬 Contacter le support</button>
        </div>
      </div>
    </div>
  );
}
