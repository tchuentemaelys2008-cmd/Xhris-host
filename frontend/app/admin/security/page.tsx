'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronRight as Arr, Shield, Download } from 'lucide-react';

const tabs = ['Aperçu', 'Authentification', 'Sessions', 'Activité', 'Pare-feu (IP)', 'Clés API', 'Audit de sécurité'];

const securityLogs = [
  { date: '18 Mai 2024, 10:24:31', event: 'Connexion réussie',                  details: 'Connexion depuis Chrome sur Windows',            ip: '192.168.1.12',  location: '🇫🇷 Paris, France',          badge: 'Connexion réussie',   col: 'bg-green-500/20 text-green-400' },
  { date: '18 Mai 2024, 09:58:22', event: 'Vérification 2FA réussie',           details: 'Vérification 2FA réussie',                       ip: '192.168.1.12',  location: '🇫🇷 Paris, France',          badge: 'Info',                col: 'bg-blue-500/20 text-blue-400' },
  { date: '18 Mai 2024, 09:32:11', event: 'Authentification',                   details: 'Méthode : Application (TOTP)',                   ip: '192.168.1.12',  location: '🇫🇷 Paris, France',          badge: 'Authentification',    col: 'bg-purple-500/20 text-purple-400' },
  { date: '18 Mai 2024, 08:59:33', event: 'Tentative de connexion avec MDP err', details: 'Tentative de connexion avec mot de passe incorrect', ip: '203.0.113.45', location: '🇬🇧 Londres, Royaume-Uni',  badge: 'Avertissement',       col: 'bg-yellow-500/20 text-yellow-400' },
  { date: '18 Mai 2024, 08:45:19', event: 'Connexion réussie',                  details: 'Connexion depuis Firefox sur macOS',             ip: '198.51.100.23', location: '🇫🇷 Lyon, France',           badge: 'Connexion réussie',   col: 'bg-green-500/20 text-green-400' },
  { date: '17 Mai 2024, 22:14:05', event: 'Tentative de connexion bloquée',     details: 'Tentative de connexion bloquée (IP suspecte)',   ip: '185.220.101.5', location: '🇷🇺 Moscou, Russie',         badge: 'Erreur',              col: 'bg-red-500/20 text-red-400' },
  { date: '17 Mai 2024, 21:47:08', event: 'Déconnexion de toutes les sessions', details: 'Déconnexion de toutes les sessions',             ip: '192.168.1.12',  location: '🇫🇷 Paris, France',          badge: 'Info',                col: 'bg-blue-500/20 text-blue-400' },
  { date: '17 Mai 2024, 19:12:34', event: 'Connexion réussie',                  details: 'Connexion depuis Safari sur iOS',                ip: '203.0.113.91',  location: '🇫🇷 Marseille, France',      badge: 'Connexion réussie',   col: 'bg-green-500/20 text-green-400' },
];

const devices = [
  { browser: 'Chrome', os: 'Windows', location: 'Paris, France',    status: 'Actuel',   ago: '',          icon: '🌐', color: 'text-green-400' },
  { browser: 'Firefox', os: 'macOS',  location: 'Lyon, France',     status: 'Actif',    ago: 'Il y a 2h', icon: '🦊', color: 'text-gray-400' },
  { browser: 'Safari', os: 'iOS',     location: 'Marseille, France', status: 'Actif',   ago: 'Il y a 1 jour', icon: '🧭', color: 'text-gray-400' },
  { browser: 'Chrome', os: 'Android', location: 'Toulouse, France', status: 'Inconnu',  ago: '',          icon: '🌐', color: 'text-yellow-400' },
  { browser: 'Edge',   os: 'Windows', location: 'Bordeaux, France', status: 'Actif',    ago: 'Il y a 3 jours', icon: '🔵', color: 'text-gray-400' },
];

const recommendations = [
  { icon: '📱', title: 'Vérifiez vos appareils connectés', desc: '2 sessions actives n\'ont pas été reconnues.' },
  { icon: '🔑', title: 'Activer une clé de sécurité (WebAuthn)', desc: 'Renforcez la sécurité de votre compte avec une clé physique.' },
  { icon: '🔐', title: 'Mettre à jour votre mot de passe', desc: 'Votre mot de passe a été changé il y a plus de 180 jours.' },
];

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState('Aperçu');
  const [page, setPage] = useState(1);

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sécurité</h1>
          <p className="text-gray-400 text-sm mt-1">Protégez votre compte et gérez les paramètres de sécurité de votre plateforme.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/5">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === t ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'}`}>{t}</button>
          ))}
        </div>

        {/* Security score */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4">Score de sécurité</h2>
            <div className="flex items-center gap-6">
              {/* Circle */}
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                  <circle cx="64" cy="64" r="52" fill="none" stroke="url(#scoreGrad)" strokeWidth="12" strokeDasharray={`${2 * Math.PI * 52 * 0.87} ${2 * Math.PI * 52 * 0.13}`} strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22C55E" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-white">87</div>
                  <div className="text-xs text-gray-400">/100</div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-green-400">Niveau : Élevé</span>
                  <span className="text-green-400">✓</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">Votre compte est bien protégé. Continuez ainsi !</p>
                <div className="space-y-1.5">
                  {[
                    { ok: true,  text: 'Authentification à deux facteurs activée' },
                    { ok: true,  text: 'Mot de passe fort' },
                    { ok: true,  text: 'Aucune activité suspecte détectée' },
                    { ok: false, text: '2 sessions actives sur des appareils inconnus' },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={c.ok ? 'text-green-400' : 'text-yellow-400'}>{c.ok ? '✓' : '⚠'}</span>
                      <span className={c.ok ? 'text-gray-300' : 'text-gray-400'}>{c.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4">Recommandations</h2>
            <div className="space-y-3">
              {recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#1A1A24] rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
                  <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center text-base flex-shrink-0">{r.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{r.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
                  </div>
                  <Arr className="w-4 h-4 text-gray-500 group-hover:text-white mt-1 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security activity table */}
        <div className="bg-[#111118] border border-white/5 rounded-xl">
          <div className="p-4 border-b border-white/5">
            <h2 className="font-semibold text-white">Activité de sécurité récente</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['DATE & HEURE', 'ÉVÉNEMENT', 'DÉTAILS', 'IP', 'LOCALISATION', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {securityLogs.map((log, i) => (
                <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{log.date}</td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${log.col}`}>{log.badge}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-300 max-w-[200px]">{log.details}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ip}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{log.location}</td>
                  <td className="px-4 py-3"><button className="text-gray-500 hover:text-white text-base">⋯</button></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span>Affichage de 1 à 8 sur 43 événements</span>
            <div className="flex gap-1">
              {[1,2,3,'...',6].map((p, i) => (
                <button key={i} onClick={() => typeof p === 'number' && setPage(p)} className={`w-7 h-7 rounded text-xs ${page === p ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-60 flex-shrink-0 space-y-4">
        {/* Security status */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Statut de sécurité</h3>
          {[
            { icon: '🔐', label: 'Authentification 2FA', v: 'Activée', col: 'text-green-400' },
            { icon: '🔑', label: 'Mot de passe', v: 'Fort', col: 'text-green-400' },
            { icon: '💻', label: 'Sessions actives', v: '5', col: 'text-white' },
            { icon: '📱', label: 'Appareils reconnus', v: '3 / 5', col: 'text-white' },
            { icon: '📊', label: 'Dernière analyse', v: 'Aujourd\'hui à 10:24', col: 'text-white' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs">{s.icon}</span>
                <span className="text-xs text-gray-400">{s.label}</span>
              </div>
              <span className={`text-xs font-medium ${s.col}`}>{s.v}</span>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Actions rapides</h3>
          {[
            { icon: '🔑', label: 'Changer le mot de passe', sub: 'Mettez à jour votre mot de passe.' },
            { icon: '💻', label: 'Gérer les sessions', sub: 'Déconnectez-vous des appareils.' },
            { icon: '📜', label: 'Voir l\'historique d\'activité', sub: 'Consultez les événements récents.' },
            { icon: '📄', label: 'Télécharger le rapport', sub: 'Générez un rapport de sécurité.' },
          ].map(a => (
            <button key={a.label} className="w-full flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors text-left rounded">
              <span className="text-base">{a.icon}</span>
              <div className="flex-1">
                <div className="text-xs font-medium text-white">{a.label}</div>
                <div className="text-xs text-gray-500">{a.sub}</div>
              </div>
              <Arr className="w-3.5 h-3.5 text-gray-500 mt-1 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Recent devices */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Appareils récents</h3>
            <button className="text-xs text-purple-400 hover:text-purple-300">Voir toutes les sessions</button>
          </div>
          <div className="space-y-3">
            {devices.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-base flex-shrink-0">{d.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white">{d.browser} — {d.os}</div>
                  <div className="text-xs text-gray-400 truncate">{d.location}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  {d.status === 'Actuel' && <div className="flex items-center gap-1 text-xs text-green-400"><div className="w-1.5 h-1.5 bg-green-400 rounded-full" />Actuel</div>}
                  {d.status === 'Inconnu' && <div className="text-xs text-yellow-400">{d.status}</div>}
                  {d.ago && <div className="text-xs text-gray-500">{d.ago}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
