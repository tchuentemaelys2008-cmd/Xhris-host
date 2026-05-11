'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, Plus, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const tabs = ['Vue d\'ensemble', 'Sauvegardes manuelles', 'Planification', 'Stockage', 'Restauration', 'Paramètres'];

const backups = [
  { date: '18 Mai 2024, 03:15:22', type: 'Automatique', source: 'Base de données + Fichiers', size: '12.4 GB', status: 'Réussie', retention: '30 jours' },
  { date: '17 Mai 2024, 15:00:11', type: 'Planifiée',   source: 'Base de données',             size: '3.2 GB',  status: 'Réussie', retention: '30 jours' },
  { date: '17 Mai 2024, 03:15:18', type: 'Automatique', source: 'Base de données + Fichiers', size: '11.8 GB', status: 'Réussie', retention: '30 jours' },
  { date: '16 Mai 2024, 15:00:09', type: 'Planifiée',   source: 'Fichiers uniquement',         size: '8.7 GB',  status: 'Réussie', retention: '30 jours' },
  { date: '16 Mai 2024, 03:15:14', type: 'Automatique', source: 'Base de données + Fichiers', size: '12.1 GB', status: 'Échouée', retention: '30 jours' },
  { date: '15 Mai 2024, 15:00:10', type: 'Planifiée',   source: 'Base de données',             size: '3.1 GB',  status: 'Réussie', retention: '30 jours' },
  { date: '15 Mai 2024, 03:15:19', type: 'Automatique', source: 'Base de données + Fichiers', size: '11.9 GB', status: 'Réussie', retention: '30 jours' },
  { date: '14 Mai 2024, 15:00:12', type: 'Planifiée',   source: 'Fichiers uniquement',         size: '8.6 GB',  status: 'Réussie', retention: '30 jours' },
];

const storageData = [
  { name: 'Base de données', value: 49, color: '#7C3AED', size: '120.4 GB' },
  { name: 'Fichiers',        value: 40, color: '#3B82F6', size: '98.7 GB' },
  { name: 'Logs',            value: 6,  color: '#EAB308', size: '15.3 GB' },
  { name: 'Autres',          value: 5,  color: '#6B7280', size: '11.2 GB' },
];

export default function BackupsPage() {
  const [activeTab, setActiveTab] = useState('Vue d\'ensemble');
  const [page, setPage] = useState(1);
  const [dbChecked, setDbChecked] = useState(true);
  const [filesChecked, setFilesChecked] = useState(true);

  const typeBadge = (t: string) => (
    <span className={`badge text-xs ${t === 'Automatique' ? 'bg-blue-500/20 text-blue-400' : t === 'Planifiée' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>{t}</span>
  );

  const statusBadge = (s: string) => (
    s === 'Réussie'
      ? <span className="badge-green text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full" />{s}</span>
      : <span className="badge bg-red-500/20 text-red-400 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-400 rounded-full" />{s}</span>
  );

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sauvegardes</h1>
          <p className="text-gray-400 text-sm mt-1">Protégez vos données avec des sauvegardes sécurisées et planifiées.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/5">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === t ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'}`}>{t}</button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: '📅', label: 'Dernière sauvegarde', v: 'Aujourd\'hui à 03:15', sub: '18 Mai 2024, 03:15:22', badge: 'Réussie', badgeColor: 'text-green-400 bg-green-500/10' },
            { icon: '⏰', label: 'Prochaine sauvegarde', v: 'Aujourd\'hui à 15:00', sub: 'Dans 6h 32m', badge: 'Planifiée', badgeColor: 'text-blue-400 bg-blue-500/10' },
            { icon: '📦', label: 'Total des sauvegardes', v: '128', sub: '+18 ce mois-ci', badge: null, badgeColor: '' },
            { icon: '💾', label: 'Espace utilisé', v: '245.6 GB / 500 GB', sub: '49% utilisé', badge: null, badgeColor: '' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-[#111118] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center text-base">{s.icon}</div>
                <span className="text-xs text-gray-400">{s.label}</span>
              </div>
              <div className="text-lg font-bold text-white">{s.v}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{s.sub}</span>
                {s.badge && <span className={`badge text-xs ${s.badgeColor}`}>{s.badge}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Backup history table */}
        <div className="bg-[#111118] border border-white/5 rounded-xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-white">Historique des sauvegardes</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 w-44" placeholder="Rechercher..." />
              </div>
              <button className="btn-secondary text-xs flex items-center gap-1.5 py-1.5">
                <Search className="w-3.5 h-3.5" /> Filtres
              </button>
              <button className="btn-primary text-xs flex items-center gap-1.5 py-1.5">
                <Plus className="w-3.5 h-3.5" /> Nouvelle sauvegarde
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['DATE & HEURE', 'TYPE', 'SOURCE', 'TAILLE', 'STATUT', 'RÉTENTION', 'ACTIONS'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {backups.map((b, i) => (
                <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-300 font-mono">{b.date}</td>
                  <td className="px-4 py-3">{typeBadge(b.type)}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">{b.source}</td>
                  <td className="px-4 py-3 text-xs text-white font-medium">{b.size}</td>
                  <td className="px-4 py-3">{statusBadge(b.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{b.retention}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="text-gray-400 hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
                      <button className="text-gray-400 hover:text-white transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                      <button className="text-gray-400 hover:text-white transition-colors text-base">⋯</button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span>Affichage de 1 à 8 sur 128 sauvegardes</span>
            <div className="flex gap-1">
              <button className="w-7 h-7 bg-white/5 rounded flex items-center justify-center hover:bg-white/10" onClick={() => setPage(Math.max(1, page-1))}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {[1, 2, 3, '...', 16].map((p, i) => (
                <button key={i} onClick={() => typeof p === 'number' && setPage(p)} className={`w-7 h-7 rounded text-xs ${page === p ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{p}</button>
              ))}
              <button className="w-7 h-7 bg-white/5 rounded flex items-center justify-center hover:bg-white/10" onClick={() => setPage(Math.min(16, page+1))}>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Manual + Schedule */}
        <div className="grid grid-cols-2 gap-6">
          {/* Manual backup */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-1">Sauvegarde manuelle</h3>
            <p className="text-xs text-gray-400 mb-4">Créez une sauvegarde manuelle de vos données à tout moment.</p>
            <div className="text-xs text-gray-400 mb-3">Source de la sauvegarde</div>
            <div className="space-y-2 mb-5">
              {[
                { label: 'Base de données', desc: 'Sauvegarder toutes les bases de données.', checked: dbChecked, set: setDbChecked },
                { label: 'Fichiers', desc: 'Sauvegarder tous les fichiers et configurations.', checked: filesChecked, set: setFilesChecked },
              ].map(opt => (
                <label key={opt.label} className="flex items-start gap-3 cursor-pointer">
                  <div
                    onClick={() => opt.set(!opt.checked)}
                    className={`w-4.5 h-4.5 w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0 border transition-all ${opt.checked ? 'bg-purple-600 border-purple-600' : 'bg-white/5 border-white/20'}`}
                  >
                    {opt.checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div>
                    <div className="text-sm text-white">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <button className="btn-primary text-sm w-full py-2.5 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Créer une sauvegarde maintenant
            </button>
          </div>

          {/* Schedule */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-1">Planification des sauvegardes</h3>
            <p className="text-xs text-gray-400 mb-4">Configurez la fréquence des sauvegardes automatiques.</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Fréquence</label>
                <select className="input-field text-sm">
                  <option>Tous les jours</option>
                  <option>Toutes les heures</option>
                  <option>Toutes les semaines</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Heure</label>
                <input defaultValue="03:00" className="input-field text-sm" />
              </div>
            </div>
            <div className="mb-5">
              <label className="text-xs text-gray-400 block mb-1.5">Fuseau horaire</label>
              <select className="input-field text-sm">
                <option>Europe/Paris (UTC+01:00)</option>
                <option>UTC</option>
                <option>America/New_York</option>
              </select>
            </div>
            <button className="btn-primary text-sm w-full py-2.5 flex items-center justify-center gap-2">
              Enregistrer la planification
            </button>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-60 flex-shrink-0 space-y-4">
        {/* Status */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Statut des sauvegardes</h3>
          <div className="flex justify-center mb-4">
            <div className="relative w-28 h-28">
              <ResponsiveContainer width={112} height={112}>
                <PieChart>
                  <Pie data={[{ value: 96 }, { value: 4 }]} cx="50%" cy="50%" innerRadius={36} outerRadius={52} startAngle={90} endAngle={-270} dataKey="value">
                    <Cell fill="#22C55E" />
                    <Cell fill="#EF4444" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-white">96%</div>
                <div className="text-xs text-gray-400">Taux de réussite</div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-gray-400">Réussies</span></div>
              <span className="text-white font-medium">123 (96%)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full" /><span className="text-gray-400">Échouées</span></div>
              <span className="text-white font-medium">5 (4%)</span>
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Utilisation du stockage</h3>
          <div className="text-xl font-bold text-white mb-1">245.6 GB <span className="text-sm font-normal text-gray-400">/ 500 GB</span></div>
          <div className="text-xs text-gray-400 mb-3">49% utilisé</div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-purple-600 rounded-full" style={{ width: '49%' }} />
          </div>
          {storageData.map(s => (
            <div key={s.name} className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-gray-400">{s.name}</span>
              </div>
              <span className="text-white">{s.size} ({s.value}%)</span>
            </div>
          ))}
        </div>

        {/* Retention */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Rétention des sauvegardes</h3>
          {[
            { icon: '🔄', label: 'Sauvegardes automatiques', v: '30 jours' },
            { icon: '📅', label: 'Sauvegardes planifiées', v: '30 jours' },
            { icon: '✋', label: 'Sauvegardes manuelles', v: '90 jours' },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs">{r.icon}</span>
                <span className="text-xs text-gray-400">{r.label}</span>
              </div>
              <span className="text-xs text-white font-medium">{r.v}</span>
            </div>
          ))}
          <button className="w-full mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors py-2 border border-purple-500/20 rounded-lg hover:bg-purple-500/5">
            Gérer la rétention
          </button>
        </div>

        {/* Help */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Besoin d'aide ?</h3>
          <p className="text-xs text-gray-400 mb-3">Consultez notre guide sur les sauvegardes ou contactez le support.</p>
          <button className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1 mb-2">
            Voir le guide <ExternalLink className="w-3 h-3" />
          </button>
          <button className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1">
            💬 Contacter le support
          </button>
        </div>
      </div>
    </div>
  );
}
