'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Copy, Edit, MoreVertical, Eye, EyeOff, RefreshCw, ExternalLink, CheckCircle, XCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyToClipboard } from '@/lib/utils';

const webhooks = [
  { id: '1', name: 'Discord Notifications', desc: 'Notifications pour mon serveur Discord', url: 'https://discord.com/api/webhooks/...', events: ['paiement.succes', 'abonnement.nouveau', '+2'], status: 'active', lastActivity: '15 Dec 2024, 14:30', lastStatus: '200 OK' },
  { id: '2', name: 'Logs System', desc: 'Logs système et sécurité', url: 'https://logs.xhris.com/webhook', events: ['utilisateur.cree', 'retrait.demande', '+3'], status: 'active', lastActivity: '15 Dec 2024, 14:29', lastStatus: '200 OK' },
  { id: '3', name: 'Paiements', desc: 'Événements de paiement uniquement', url: 'https://api.monsite.com/webhooks/payments', events: ['paiement.succes', 'paiement.echec'], status: 'active', lastActivity: '15 Dec 2024, 14:28', lastStatus: '200 OK' },
  { id: '4', name: 'Test Webhook', desc: 'Webhook de test', url: 'https://webhook.site/abc123', events: ['utilisateur.cree'], status: 'inactive', lastActivity: '10 Dec 2024, 10:15', lastStatus: 'Aucune' },
  { id: '5', name: 'Old Webhook', desc: 'Ancien webhook', url: 'https://old-api.example.com/webhook', events: ['serveur.cree'], status: 'active', lastActivity: '08 Dec 2024, 09:20', lastStatus: '200 OK' },
];

const recentDeliveries = [
  { event: 'paiement.succes', webhook: 'Discord Notifications', time: '15 Dec 2024, 14:30', status: '200 OK', success: true },
  { event: 'abonnement.nouveau', webhook: 'Discord Notifications', time: '15 Dec 2024, 14:30', status: '200 OK', success: true },
  { event: 'utilisateur.cree', webhook: 'Logs System', time: '15 Dec 2024, 14:29', status: '200 OK', success: true },
  { event: 'retrait.demande', webhook: 'Logs System', time: '15 Dec 2024, 14:26', status: '500 Error', success: false },
  { event: 'paiement.succes', webhook: 'Paiements', time: '15 Dec 2024, 14:28', status: '200 OK', success: true },
];

const allEvents = [
  { key: 'paiement.succes', desc: 'Déclenché lorsqu\'un paiement est complété avec succès.', checked: true },
  { key: 'paiement.echec', desc: 'Déclenché lorsqu\'un paiement échoue.', checked: true },
  { key: 'abonnement.nouveau', desc: 'Déclenché lorsqu\'un nouvel abonnement est créé.', checked: true },
  { key: 'abonnement.renouvele', desc: 'Déclenché lorsqu\'un abonnement est renouvelé.', checked: true },
  { key: 'utilisateur.cree', desc: 'Déclenché lorsqu\'un nouvel utilisateur s\'inscrit.', checked: false },
  { key: 'utilisateur.suspendu', desc: 'Déclenché lorsqu\'un utilisateur est suspendu.', checked: false },
  { key: 'retrait.demande', desc: 'Déclenché lorsqu\'une demande de retrait est faite.', checked: false },
  { key: 'retrait.approuve', desc: 'Déclenché lorsqu\'un retrait est approuvé.', checked: false },
  { key: 'serveur.cree', desc: 'Déclenché lorsqu\'un serveur est créé.', checked: false },
  { key: 'serveur.supprime', desc: 'Déclenché lorsqu\'un serveur est supprimé.', checked: false },
  { key: 'pack.achete', desc: 'Déclenché lorsqu\'un pack est acheté.', checked: false },
  { key: 'codepromo.utilise', desc: 'Déclenché lorsqu\'un code promo est utilisé.', checked: false },
];

export default function WebhooksPage() {
  const [showSecret, setShowSecret] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState(allEvents);

  const handleCopy = async (text: string) => { await copyToClipboard(text); toast.success('Copié !'); };

  const toggleEvent = (key: string) => {
    setEvents(events.map(e => e.key === key ? { ...e, checked: !e.checked } : e));
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-gray-400 text-sm mt-1">Recevez des notifications en temps réel lorsque des événements se produisent.</p>
        </div>

        {/* About */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">À propos des webhooks</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-4">
                Les webhooks vous permettent de recevoir des notifications HTTP en temps réel lorsque certains événements se produisent sur votre compte.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '⚡', title: 'En temps réel', desc: 'Recevez les événements instantanément' },
                  { icon: '🎛️', title: 'Personnalisable', desc: 'Choisissez les événements qui vous intéressent' },
                  { icon: '🔒', title: 'Sécurisé', desc: 'Vérification de signature et HTTPS uniquement' },
                ].map(f => (
                  <div key={f.title} className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <div className="text-base mb-1">{f.icon}</div>
                    <div className="text-xs font-semibold text-white">{f.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-40 h-28 bg-gradient-to-br from-purple-900/40 to-blue-900/30 rounded-xl border border-purple-500/20 flex flex-col items-center justify-center gap-2">
                <div className="bg-purple-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg font-mono">POST</div>
                <div className="text-gray-400 text-xs font-mono">webhook.url</div>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook list */}
        <div className="bg-[#111118] border border-white/5 rounded-xl">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-white">Vos webhooks</h2>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Ajouter un webhook
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Nom', 'URL', 'Événements', 'Statut', 'Dernière activité', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {webhooks.map((w, i) => (
                <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-white/2">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white text-sm">{w.name}</div>
                    <div className="text-xs text-gray-400">{w.desc}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-blue-400 font-mono max-w-[180px] truncate">{w.url}</code>
                      <button onClick={() => handleCopy(w.url)} className="text-gray-500 hover:text-white flex-shrink-0">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {w.events.map(e => (
                        <span key={e} className={`badge text-xs ${e.startsWith('+') ? 'bg-white/5 text-gray-400' : 'bg-purple-500/20 text-purple-400'}`}>{e}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {w.status === 'active' ? <span className="badge-green text-xs">Actif</span> : <span className="badge bg-gray-500/20 text-gray-400 text-xs">Désactivé</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-400">{w.lastActivity}</div>
                    <div className={`text-xs mt-0.5 ${w.lastStatus.includes('200') ? 'text-green-400' : 'text-gray-400'}`}>{w.lastStatus}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white"><MoreVertical className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Events */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Événements disponibles</h2>
            <a href="/admin/documentation" className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300">
              Voir la documentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-gray-400 mb-4">Sélectionnez les événements que vous souhaitez recevoir.</p>
          <div className="grid grid-cols-2 gap-3">
            {events.map(e => (
              <label key={e.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${e.checked ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/5 bg-white/2 hover:border-white/10'}`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${e.checked ? 'bg-purple-600' : 'bg-white/5 border border-white/10'}`}
                  onClick={() => toggleEvent(e.key)}>
                  {e.checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div>
                  <div className="text-xs font-mono font-medium text-purple-400">{e.key}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{e.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2.5">
            <span className="text-blue-400 text-sm flex-shrink-0">ℹ</span>
            <p className="text-xs text-gray-400">
              Tous les webhooks nécessitent une URL HTTPS valide. Nous recommandons fortement de{' '}
              <a href="#" className="text-blue-400 hover:underline">vérifier la signature des webhooks</a>{' '}
              pour des raisons de sécurité.
            </p>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-60 flex-shrink-0 space-y-4">
        {/* Stats */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Statistiques</h3>
            <select className="text-xs bg-[#1A1A24] border border-white/5 text-gray-400 rounded px-2 py-1"><option>Ce mois-ci</option></select>
          </div>
          {[
            { l: 'Webhooks actifs', v: '4' },
            { l: 'Événements envoyés', v: '2,843' },
            { l: 'Livraison réussie', v: '98.7%', col: 'text-green-400' },
            { l: 'Livraison échouée', v: '1.3%', col: 'text-red-400' },
            { l: 'Temps de réponse moyen', v: '120ms' },
          ].map(s => (
            <div key={s.l} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-xs">
              <span className="text-gray-400">{s.l}</span>
              <span className={(s as any).col || 'text-white font-medium'}>{s.v}</span>
            </div>
          ))}
        </div>

        {/* Recent deliveries */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Livraisons récentes</h3>
            <button className="text-xs text-purple-400 hover:text-purple-300">Voir tout</button>
          </div>
          <div className="space-y-3">
            {recentDeliveries.map((d, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {d.success ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-purple-400 truncate">{d.event}</div>
                  <div className="text-xs text-gray-400 truncate">{d.webhook}</div>
                  <div className="text-xs text-gray-500">{d.time}</div>
                </div>
                <span className={`text-xs font-medium flex-shrink-0 ${d.success ? 'text-green-400' : 'text-red-400'}`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Sécurité</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">Vos webhooks sont sécurisés avec les signatures HMAC SHA256.</p>
          <div className="text-xs text-gray-400 mb-2">Secret par défaut</div>
          <div className="flex items-center gap-2 bg-[#0D0D14] rounded-lg px-3 py-2 mb-3">
            <code className="flex-1 text-xs text-gray-300 font-mono">
              {showSecret ? 'whsec_xK9mP2qR7nL4vB8cA1sE6tY3uI0oW5h' : 'whsec_•••••••••••••••••••••••••'}
            </code>
            <button onClick={() => setShowSecret(!showSecret)} className="text-gray-500 hover:text-white">
              {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
            <button onClick={() => handleCopy('whsec_xK9mP2qR7nL4vB8cA1sE6tY3uI0oW5h')} className="text-gray-500 hover:text-white">
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600/20 border border-purple-500/20 rounded-lg text-purple-400 text-xs hover:bg-purple-600/30 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Régénérer le secret
          </button>
        </div>

        {/* Help */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Besoin d'aide ?</h3>
          <p className="text-xs text-gray-400 mb-3">Consultez notre documentation ou contactez notre support si vous avez des questions.</p>
          <button className="w-full btn-secondary text-xs py-2">💬 Contacter le support</button>
        </div>
      </div>

      {/* Add webhook modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()} className="bg-[#1A1A24] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Ajouter un webhook</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Nom</label>
                <input className="input-field" placeholder="ex: Discord Notifications" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">URL (HTTPS uniquement)</label>
                <input className="input-field" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2">Événements</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                  {allEvents.map(e => (
                    <label key={e.key} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10">
                      <input type="checkbox" className="w-3.5 h-3.5 accent-purple-600" />
                      <span className="text-xs text-gray-300 font-mono">{e.key}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary text-sm">Annuler</button>
              <button onClick={() => { toast.success('Webhook ajouté !'); setShowModal(false); }} className="flex-1 btn-primary text-sm">Ajouter</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
