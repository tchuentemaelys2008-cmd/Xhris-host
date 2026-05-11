'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, ExternalLink, Play, Code, ChevronRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyToClipboard } from '@/lib/utils';

const navItems = ['Introduction', 'Authentification', 'Endpoints', 'Limites de taux', 'Codes de réponse', 'Webhooks', 'Exemples', 'SDK & Bibliothèques'];

const steps = [
  { num: 1, title: 'Obtenez votre clé API', desc: 'Générez votre clé API depuis votre espace administrateur dans la section', link: { label: 'Clés API', href: '/admin/api' } },
  { num: 2, title: 'Authentifiez vos requêtes', desc: 'Incluez votre clé API dans l\'en-tête', code: 'Authorization', desc2: 'de chaque requête.' },
  { num: 3, title: 'Effectuez votre première requête', desc: 'Testez l\'API avec un endpoint simple pour vous assurer que tout fonctionne correctement.' },
];

const features = [
  { icon: '🔒', title: 'Sécurisée', desc: 'Authentification par clé API et HTTPS' },
  { icon: '⚡', title: 'Rapide', desc: 'Réponses rapides et optimisées' },
  { icon: '📦', title: 'Complète', desc: 'De nombreux endpoints et fonctionnalités' },
  { icon: '🛡️', title: 'Fiable', desc: 'Haute disponibilité et monitoring' },
  { icon: '🎛️', title: 'Contrôlée', desc: 'Limites de taux et quotas personnalisés' },
];

const curlExample = `curl -X GET "https://api.xhris.host/v1/user" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;

const responseExample = `{
  "success": true,
  "data": {
    "id": "usr_123456",
    "username": "User123",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2024-12-15T14:30:00Z"
  }
}`;

export default function DocumentationPage() {
  const [activeNav, setActiveNav] = useState('Introduction');
  const [activeTab, setActiveTab] = useState('CURL');
  const handleCopy = async (text: string) => { await copyToClipboard(text); toast.success('Copié !'); };

  const codeExamples: Record<string, string> = {
    'CURL': curlExample,
    'JavaScript': `const response = await fetch('https://api.xhris.host/v1/user', {\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY',\n    'Content-Type': 'application/json'\n  }\n});\nconst data = await response.json();`,
    'PHP': `<?php\n$client = new GuzzleHttp\\Client();\n$response = $client->get('https://api.xhris.host/v1/user', [\n  'headers' => [\n    'Authorization' => 'Bearer YOUR_API_KEY',\n    'Content-Type' => 'application/json'\n  ]\n]);\n$data = json_decode($response->getBody(), true);`,
    'Python': `import requests\n\nresponse = requests.get(\n  'https://api.xhris.host/v1/user',\n  headers={\n    'Authorization': 'Bearer YOUR_API_KEY',\n    'Content-Type': 'application/json'\n  }\n)\ndata = response.json()`,
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documentation API</h1>
          <p className="text-gray-400 text-sm mt-1">Intégrez et automatisez vos services avec l'API XHRIS HOST.</p>
        </div>

        {/* Hero */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Bienvenue dans la documentation de l'API
              </h2>
              <p className="text-sm text-gray-400 mb-5">
                L'API XHRIS HOST vous permet d'interagir avec notre plateforme de manière sécurisée.
                Utilisez nos endpoints pour gérer vos utilisateurs, transactions, abonnements et bien plus encore.
              </p>
              <div className="flex gap-3">
                <button className="btn-primary flex items-center gap-2 text-sm">
                  <Play className="w-4 h-4" />
                  Commencer maintenant
                </button>
                <button className="btn-secondary flex items-center gap-2 text-sm">
                  <Code className="w-4 h-4" />
                  Voir les exemples
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-52 h-40 bg-gradient-to-br from-purple-900/40 to-blue-900/30 rounded-xl border border-purple-500/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-black text-purple-400 font-mono">API</div>
                  <div className="text-2xl font-mono text-gray-400 mt-1">&lt;/&gt;</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-5 gap-3">
          {features.map(f => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111118] border border-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-xs font-semibold text-white mb-1">{f.title}</div>
              <div className="text-xs text-gray-400">{f.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Getting started */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">Premiers pas</h2>
          <p className="text-sm text-gray-400 mb-5">Suivez ces étapes pour commencer à utiliser l'API XHRIS HOST.</p>
          <div className="space-y-4">
            {steps.map(s => (
              <div key={s.num} className="flex gap-4">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{s.num}</div>
                <div className="flex-1 pt-1">
                  <div className="font-medium text-white text-sm mb-1">{s.title}</div>
                  <div className="text-xs text-gray-400">
                    {s.desc}{' '}
                    {s.link && <a href={s.link.href} className="text-purple-400 hover:text-purple-300">{s.link.label}</a>}
                    {s.code && <code className="bg-white/10 text-purple-400 px-1.5 py-0.5 rounded text-xs mx-1">{s.code}</code>}
                    {s.desc2}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Base URL */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-2">Base URL</h2>
          <p className="text-sm text-gray-400 mb-4">Toutes les requêtes doivent être envoyées à l'URL de base suivante :</p>
          <div className="flex items-center justify-between bg-[#0D0D14] border border-white/10 rounded-lg px-4 py-3 font-mono text-sm text-blue-400">
            <span>https://api.xhris.host/v1</span>
            <button onClick={() => handleCopy('https://api.xhris.host/v1')} className="text-gray-500 hover:text-white transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Important */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
          <span className="text-blue-400 text-lg flex-shrink-0">ℹ</span>
          <div>
            <div className="font-medium text-white text-sm mb-1">Important</div>
            <p className="text-xs text-gray-400">Toutes les requêtes doivent être effectuées en HTTPS. Les requêtes non sécurisées seront refusées.</p>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-60 flex-shrink-0 space-y-4">
        {/* Nav */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4 sticky top-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dans cette page</h3>
          <nav className="space-y-0.5">
            {navItems.map(item => (
              <button
                key={item}
                onClick={() => setActiveNav(item)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${activeNav === item ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        {/* API Status */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Statut de l'API</h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full status-pulse" />
            <span className="text-xs text-green-400">Tous les systèmes opérationnels</span>
          </div>
          {[
            { l: 'Disponibilité', v: '99.98%' },
            { l: 'Temps de réponse moyen', v: '120ms' },
            { l: 'Dernière mise à jour', v: '15 Dec 2024, 14:30' },
          ].map(s => (
            <div key={s.l} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-xs">
              <span className="text-gray-400">{s.l}</span>
              <span className="text-white">{s.v}</span>
            </div>
          ))}
          <a href="#" className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-3">
            Voir la page de statut <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Code example */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Exemple de requête</h3>
          <div className="flex gap-1 mb-2">
            {['CURL', 'JavaScript', 'PHP', 'Python'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-2 py-1 rounded text-xs transition-all ${activeTab === t ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>{t}</button>
            ))}
          </div>
          <div className="relative bg-[#0D0D14] rounded-lg p-3 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">{codeExamples[activeTab]}</pre>
            <button onClick={() => handleCopy(codeExamples[activeTab])} className="absolute top-2 right-2 text-gray-500 hover:text-white">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Response example */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">Exemple de réponse</h3>
            <span className="badge-green text-xs">200 OK</span>
          </div>
          <div className="relative bg-[#0D0D14] rounded-lg p-3">
            <pre className="text-xs text-blue-400 font-mono whitespace-pre leading-relaxed">{responseExample}</pre>
            <button onClick={() => handleCopy(responseExample)} className="absolute top-2 right-2 text-gray-500 hover:text-white">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <button className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
            Voir plus d'exemples <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
