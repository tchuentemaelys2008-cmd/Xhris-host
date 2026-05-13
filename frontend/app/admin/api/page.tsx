'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Plus, Eye, EyeOff, MoreVertical, Trash2, RefreshCw, Key, Shield, Zap, CheckCircle, Code, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyToClipboard, formatDateTime, formatRelative } from '@/lib/utils';

const mockKeys = [
  { id: '1', name: 'Application principale', key: 'xhs_live_a7b3c9d2e4f5g6h7', permissions: ['Lecture', 'Écriture'], status: 'active', created: '2024-12-15', lastUsed: 'Aujourd\'hui, 14:30', requests: 15420 },
  { id: '2', name: 'Bot Auto-Manager', key: 'xhs_live_f4e8b1c3d2e5f6g7', permissions: ['Lecture seule'], status: 'active', created: '2024-12-12', lastUsed: 'Hier, 18:45', requests: 8230 },
  { id: '3', name: 'Intégration Paiements', key: 'xhs_live_d1f9a2b5c3e4f5g6', permissions: ['Paiements'], status: 'active', created: '2024-12-10', lastUsed: '2024-12-10, 09:20', requests: 3140 },
  { id: '4', name: 'Ancienne clé', key: 'xhs_live_9c8d7e6f5b4c3d2e', permissions: ['Lecture seule'], status: 'revoked', created: '2024-12-01', lastUsed: '2024-12-05, 11:10', requests: 420 },
];

const endpoints = [
  { method: 'GET', path: '/api/v1/user', desc: 'Récupère les informations du profil utilisateur', color: 'bg-green-500/20 text-green-400' },
  { method: 'GET', path: '/api/v1/transactions', desc: 'Liste les transactions avec filtres', color: 'bg-green-500/20 text-green-400' },
  { method: 'POST', path: '/api/v1/payments', desc: 'Crée un nouveau paiement', color: 'bg-blue-500/20 text-blue-400' },
  { method: 'GET', path: '/api/v1/servers', desc: 'Récupère la liste des serveurs', color: 'bg-green-500/20 text-green-400' },
  { method: 'GET', path: '/api/v1/bots', desc: 'Récupère la liste des bots', color: 'bg-green-500/20 text-green-400' },
];

export default function ApiKeysPage() {
  const [showKey, setShowKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>(['Lecture seule']);
  const [usage] = useState({ requests: 24856, limit: 100000, pct: 24.9 });

  const maskKey = (key: string) => {
    const parts = key.split('_');
    return `${parts[0]}_${parts[1]}_${'•'.repeat(18)}${key.slice(-8)}`;
  };

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    toast.success('Clé copiée !');
  };

  const permColors: Record<string, string> = {
    'Lecture': 'bg-green-500/20 text-green-400',
    'Écriture': 'bg-blue-500/20 text-blue-400',
    'Paiements': 'bg-yellow-500/20 text-yellow-400',
    'Lecture seule': 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">API</h1>
          <p className="text-gray-400 text-sm mt-1">Intégrez et automatisez vos services avec l'API XHRIS HOST.</p>
        </div>

        {/* About */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">À propos de l'API</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-4">
                L'API XHRIS HOST vous permet d'interagir avec notre plateforme de manière sécurisée.
                Créez des clés API pour accéder à nos services et automatiser vos tâches.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Shield, title: 'Sécurisée', desc: 'Authentification par clé API', color: 'text-green-400', bg: 'bg-green-500/10' },
                  { icon: Zap, title: 'Rapide', desc: 'Réponses en JSON', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { icon: CheckCircle, title: 'Fiable', desc: 'Uptime 99.9%', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  { icon: Code, title: 'Complète', desc: 'Documentation détaillée', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                ].map((f) => (
                  <div key={f.title} className={`${f.bg} rounded-lg p-3 flex items-start gap-2`}>
                    <f.icon className={`w-4 h-4 ${f.color} mt-0.5 flex-shrink-0`} />
                    <div>
                      <div className="text-xs font-semibold text-white">{f.title}</div>
                      <div className="text-xs text-gray-400">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-48 h-36 bg-gradient-to-br from-purple-900/50 to-blue-900/30 rounded-xl border border-purple-500/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-black text-purple-400 font-mono">API</div>
                  <div className="text-lg font-mono text-gray-400 mt-1">&lt;/&gt;</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keys */}
        <div className="bg-[#111118] border border-white/5 rounded-xl">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Vos clés API</h2>
              <p className="text-xs text-gray-400 mt-0.5">Gérez vos clés API pour accéder à nos services.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Créer une clé API
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Nom', 'Clé API', 'Permissions', 'Créée le', 'Dernière utilisation', 'Statut', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mockKeys.map((k) => (
                  <motion.tr
                    key={k.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium text-sm">{k.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-purple-400 font-mono">
                          {showKey === k.id ? k.key : maskKey(k.key)}
                        </code>
                        <button onClick={() => setShowKey(showKey === k.id ? null : k.id)} className="text-gray-500 hover:text-white transition-colors">
                          {showKey === k.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleCopy(k.key)} className="text-gray-500 hover:text-white transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {k.permissions.map(p => (
                          <span key={p} className={`badge text-xs ${permColors[p] || 'bg-gray-500/20 text-gray-400'}`}>{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{k.created}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{k.lastUsed}</td>
                    <td className="px-4 py-3">
                      {k.status === 'active' ? (
                        <span className="badge-green text-xs">Active</span>
                      ) : (
                        <span className="badge bg-red-500/20 text-red-400 text-xs">Révoquée</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-gray-500 hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Security warning */}
          <div className="mx-4 mb-4 mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-3">
            <Shield className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-yellow-400">Conservez vos clés API en sécurité</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Ne partagez jamais vos clés API avec des tiers. Si une clé est compromise, révoquez-la immédiatement et créez-en une nouvelle.
              </div>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-2">Endpoints populaires</h2>
          <p className="text-xs text-gray-400 mb-4">Découvrez les endpoints les plus utilisés de notre API.</p>
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-4 px-3 py-2 text-xs text-gray-500 font-medium">
              <span>Méthode</span><span>Endpoint</span><span>Description</span>
            </div>
            {endpoints.map((ep) => (
              <div key={ep.path} className="grid grid-cols-3 gap-4 px-3 py-2.5 bg-[#1A1A24] rounded-lg items-center">
                <span className={`badge text-xs font-mono ${ep.color} w-fit`}>{ep.method}</span>
                <code className="text-xs text-blue-400 font-mono">{ep.path}</code>
                <span className="text-xs text-gray-400">{ep.desc}</span>
              </div>
            ))}
          </div>
          <a href="/admin/documentation" className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs mt-4 transition-colors">
            Voir toute la documentation
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-64 flex-shrink-0 space-y-4">
        {/* Usage */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Utilisation de l'API</h3>
            <select className="text-xs bg-[#1A1A24] border border-white/5 text-gray-400 rounded px-2 py-1">
              <option>Ce mois-ci</option>
            </select>
          </div>
          <div className="text-xs text-gray-400 mb-1">Requêtes</div>
          <div className="text-xl font-bold text-white mb-2">{usage.requests.toLocaleString()} / {usage.limit.toLocaleString()}</div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-purple-600 rounded-full" style={{ width: `${usage.pct}%` }} />
          </div>
          <div className="space-y-2 text-xs">
            {[
              { l: 'Limite de requêtes', v: '100,000 / mois' },
              { l: 'Requêtes restantes', v: '75,144' },
              { l: 'Réinitialisation', v: '01 Jan 2025, 00:00' },
            ].map(s => (
              <div key={s.l} className="flex justify-between">
                <span className="text-gray-400">{s.l}</span>
                <span className="text-white font-medium">{s.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick start */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Démarrage rapide</h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-gray-400 mb-1">1. Installez le SDK (Optionnel)</div>
              <div className="bg-[#0D0D14] rounded-lg p-2.5 font-mono text-green-400 flex items-center justify-between">
                <span>npm install xhris-sdk</span>
                <button onClick={() => handleCopy('npm install xhris-sdk')} className="text-gray-500 hover:text-white">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">2. Initialisez le client</div>
              <div className="bg-[#0D0D14] rounded-lg p-2.5 font-mono text-blue-400 text-xs leading-relaxed">
                <div className="text-gray-400">const Xhris = require('xhris-sdk');</div>
                <div className="text-gray-300 mt-1">const client = new Xhris({'{'}</div>
                <div className="text-gray-300 pl-2">apiKey: 'xhs_live_votre_clé',</div>
                <div className="text-gray-300 pl-2">secret: 'votre_secret'</div>
                <div className="text-gray-300">{'}'});</div>
              </div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">3. Faites votre première requête</div>
              <div className="bg-[#0D0D14] rounded-lg p-2.5 font-mono text-purple-400 text-xs leading-relaxed">
                <div>client.user.get().then(user =&gt; {'{'}</div>
                <div className="pl-2">console.log(user);</div>
                <div>{'}'});</div>
              </div>
            </div>
          </div>
          <button className="w-full mt-3 bg-purple-600 text-white text-xs py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium">
            Voir plus d'exemples
          </button>
        </div>

        {/* Resources */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Ressources</h3>
          {[
            { icon: '📖', label: 'Documentation API', sub: 'Guide complet de l\'API' },
            { icon: '📝', label: 'Changelog', sub: 'Dernières mises à jour' },
            { icon: '🎧', label: 'Support API', sub: 'Obtenir de l\'aide' },
            { icon: '💬', label: 'Discord', sub: 'Rejoindre notre communauté' },
          ].map(r => (
            <a key={r.label} href="#" className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0 hover:text-white group transition-colors cursor-pointer">
              <span className="text-base">{r.icon}</span>
              <div className="flex-1">
                <div className="text-xs font-medium text-white">{r.label}</div>
                <div className="text-xs text-gray-500">{r.sub}</div>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-white" />
            </a>
          ))}
        </div>
      </div>

      {/* Create key modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1A1A24] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-4">Créer une clé API</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Nom de la clé</label>
                <input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="input-field"
                  placeholder="ex: Application principale"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Lecture seule', 'Lecture', 'Écriture', 'Paiements'].map(p => (
                    <label key={p} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${newKeyPerms.includes(p) ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5'}`}>
                      <input type="checkbox" checked={newKeyPerms.includes(p)} onChange={(e) => {
                        if (e.target.checked) setNewKeyPerms([...newKeyPerms, p]);
                        else setNewKeyPerms(newKeyPerms.filter(x => x !== p));
                      }} className="hidden" />
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${newKeyPerms.includes(p) ? 'bg-purple-600' : 'bg-white/10'}`}>
                        {newKeyPerms.includes(p) && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-white">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Annuler</button>
              <button onClick={() => { toast.success('Clé API créée !'); setShowModal(false); }} className="flex-1 btn-primary">
                Créer la clé
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
