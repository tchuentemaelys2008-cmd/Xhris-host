'use client';

import { useState } from 'react';
import { FileText, Eye, Edit, Globe, Lock } from 'lucide-react';
import Link from 'next/link';

const STATIC_PAGES = [
  { slug: '/', title: 'Page d\'accueil', path: '/', public: true, desc: 'Page principale de la plateforme' },
  { slug: 'terms', title: 'Conditions d\'utilisation', path: '/terms', public: true, desc: 'CGU de la plateforme' },
  { slug: 'privacy', title: 'Politique de confidentialité', path: '/privacy', public: true, desc: 'Politique RGPD' },
  { slug: 'docs', title: 'Documentation', path: '/docs', public: true, desc: 'Documentation développeur et API' },
  { slug: 'dashboard', title: 'Dashboard utilisateur', path: '/dashboard', public: false, desc: 'Espace personnel' },
  { slug: 'admin', title: 'Panel admin', path: '/admin', public: false, desc: 'Administration' },
  { slug: 'marketplace', title: 'Marketplace', path: '/marketplace', public: true, desc: 'Bots disponibles' },
  { slug: 'community', title: 'Communauté', path: '/community', public: true, desc: 'Forum et chat' },
];

export default function AdminPagesPage() {
  const [search, setSearch] = useState('');
  const filtered = STATIC_PAGES.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Pages</h1>
        <p className="text-gray-400 text-sm">Aperçu des pages de la plateforme</p>
      </div>

      <input
        className="input-field w-full max-w-sm"
        placeholder="Rechercher une page..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map(page => (
          <div key={page.slug} className="bg-[#111118] border border-white/5 rounded-xl p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${page.public ? 'bg-green-500/10' : 'bg-purple-500/10'}`}>
              {page.public ? <Globe className={`w-5 h-5 text-green-400`} /> : <Lock className="w-5 h-5 text-purple-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-white">{page.title}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${page.public ? 'bg-green-500/10 text-green-400' : 'bg-purple-500/10 text-purple-400'}`}>
                  {page.public ? 'Public' : 'Privé'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">{page.desc}</div>
              <div className="font-mono text-xs text-purple-400">{page.path}</div>
            </div>
            <Link href={page.path} target="_blank" className="flex-shrink-0 text-gray-400 hover:text-white">
              <Eye className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
