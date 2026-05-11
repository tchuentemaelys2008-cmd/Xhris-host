'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, MoreVertical, TrendingUp, Image, MousePointer, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

const announcements = [
  { id: '1', title: 'Black Friday 50% OFF', desc: 'Profitez de -50% sur tous nos packs d\'hébergement !', placement: 'Bannière d\'accueil', status: 'active', impressions: 28540, clicks: 1245, ctr: 4.36, priority: 'Haute', start: '01 Dec 2024', end: '31 Dec 2024', img: '🛍️', bg: 'from-orange-600 to-red-600' },
  { id: '2', title: 'Nouveau Pack PRO', desc: 'Découvrez notre nouveau Pack PRO avec des fonctionnalités avancées.', placement: 'Bannière d\'accueil', status: 'active', impressions: 22130, clicks: 892, ctr: 4.03, priority: 'Haute', start: '10 Dec 2024', end: '10 Jan 2025', img: '⭐', bg: 'from-purple-600 to-blue-600' },
  { id: '3', title: 'Parrainez & Gagnez', desc: 'Invitez vos amis et gagnez 20% sur chaque achat.', placement: 'Barre latérale', status: 'active', impressions: 18265, clicks: 745, ctr: 4.08, priority: 'Moyenne', start: '01 Nov 2024', end: '31 Dec 2024', img: '🎁', bg: 'from-green-600 to-teal-600' },
  { id: '4', title: 'Paiement en Crypto', desc: 'Nous acceptons maintenant plus de 50 cryptomonnaies.', placement: 'Page de paiement', status: 'active', impressions: 15980, clicks: 512, ctr: 3.21, priority: 'Moyenne', start: '15 Nov 2024', end: '15 Jan 2025', img: '💎', bg: 'from-blue-600 to-cyan-600' },
  { id: '5', title: 'Maintenance planifiée', desc: 'Maintenance de nos serveurs le 20 Décembre à 02:00 UTC.', placement: 'Notification globale', status: 'scheduled', impressions: 0, clicks: 0, ctr: 0, priority: 'Haute', start: '20 Dec 2024', end: '20 Dec 2024', img: '🔧', bg: 'from-gray-600 to-gray-700' },
  { id: '6', title: 'Rejoignez notre Discord', desc: 'Rejoignez notre communauté Discord pour des offres exclusives.', placement: 'Barre latérale', status: 'active', impressions: 12845, clicks: 423, ctr: 3.29, priority: 'Basse', start: '01 Nov 2024', end: '31 Dec 2024', img: '💬', bg: 'from-indigo-600 to-purple-600' },
  { id: '7', title: 'Cyber Monday Promo', desc: 'Jusqu\'à -60% sur une sélection de packs d\'hébergement.', placement: 'Popup', status: 'inactive', impressions: 8450, clicks: 254, ctr: 3.00, priority: 'Haute', start: '25 Nov 2024', end: '02 Dec 2024', img: '🎯', bg: 'from-cyan-600 to-blue-600' },
];

const placements = [
  { name: 'Bannière d\'accueil', value: 45.8, color: '#7C3AED' },
  { name: 'Barre latérale', value: 25.0, color: '#3B82F6' },
  { name: 'Page de paiement', value: 12.5, color: '#22C55E' },
  { name: 'Popup', value: 8.3, color: '#F97316' },
  { name: 'Notification globale', value: 8.3, color: '#6B7280' },
];

const performanceData = [
  { d: '1', imp: 18000, clicks: 620 }, { d: '5', imp: 20000, clicks: 720 },
  { d: '10', imp: 22000, clicks: 800 }, { d: '15', imp: 24580, clicks: 892 },
];

const CT = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className="bg-[#1A1A24] border border-white/10 rounded-lg p-2.5 text-xs">
      {payload.map((p: any) => <p key={p.name} style={{ color: p.stroke }}>{p.name}: {p.value?.toLocaleString()}</p>)}
    </div>
  ) : null;

export default function AnnouncementsPage() {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const statusBadge = (s: string) => ({
    active: <span className="badge-green text-xs">Active</span>,
    inactive: <span className="badge bg-gray-500/20 text-gray-400 text-xs">Désactive</span>,
    scheduled: <span className="badge bg-blue-500/20 text-blue-400 text-xs">Planifiée</span>,
  }[s] || null);

  const priorityBadge = (p: string) => ({
    Haute: <span className="badge bg-red-500/20 text-red-400 text-xs">{p}</span>,
    Moyenne: <span className="badge bg-yellow-500/20 text-yellow-400 text-xs">{p}</span>,
    Basse: <span className="badge bg-gray-500/20 text-gray-400 text-xs">{p}</span>,
  }[p] || null);

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Annonces</h1>
          <p className="text-gray-400 text-sm mt-1">Créez et gérez les annonces affichées sur votre plateforme.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { icon: '📢', label: 'Total des annonces', v: '12', sub: '+2 ce mois-ci', bg: 'bg-purple-500/10' },
            { icon: '✅', label: 'Annonces actives', v: '8', sub: '66.7% du total', bg: 'bg-green-500/10' },
            { icon: '👁️', label: 'Impressions totales', v: '124,580', sub: '+18.2% ce mois-ci', bg: 'bg-blue-500/10' },
            { icon: '🖱️', label: 'Clics totaux', v: '4,892', sub: '+12.7% ce mois-ci', bg: 'bg-yellow-500/10' },
            { icon: '📊', label: 'Taux de clics moyen', v: '3.93%', sub: '+0.45% ce mois-ci', bg: 'bg-red-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
              <div className="text-xs text-gray-400 mb-1">{s.label}</div>
              <div className="text-xl font-bold text-white">{s.v}</div>
              <div className="text-xs text-green-400 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <input className="input-field max-w-56" placeholder="Rechercher une annonce..." />
          <select className="bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            <option>Tous les emplacements</option>
            {placements.map(p => <option key={p.name}>{p.name}</option>)}
          </select>
          <select className="bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            <option>Tous les statuts</option>
            <option>Actif</option><option>Inactif</option><option>Planifié</option>
          </select>
          <select className="bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            <option>Toutes les priorités</option>
            <option>Haute</option><option>Moyenne</option><option>Basse</option>
          </select>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm ml-auto">
            <Plus className="w-4 h-4" />
            Créer une annonce
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Annonce', 'Emplacement', 'Statut', 'Impressions', 'Clics', 'CTR', 'Priorité', 'Période', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {announcements.map((a, i) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-white/2"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-9 rounded-lg bg-gradient-to-r ${a.bg} flex items-center justify-center text-sm flex-shrink-0`}>
                        {a.img}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{a.title}</div>
                        <div className="text-xs text-gray-400 max-w-[160px] truncate">{a.desc}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{a.placement}</td>
                  <td className="px-4 py-3">{statusBadge(a.status)}</td>
                  <td className="px-4 py-3 text-white text-sm">{a.impressions > 0 ? a.impressions.toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-white text-sm">{a.clicks > 0 ? a.clicks.toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-white text-sm">{a.ctr > 0 ? `${a.ctr}%` : '—'}</td>
                  <td className="px-4 py-3">{priorityBadge(a.priority)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    <div>{a.start}</div>
                    <div>- {a.end}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span>Affichage de 1 à 7 sur 12 annonces</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page-1))} className="w-7 h-7 bg-white/5 rounded flex items-center justify-center hover:bg-white/10">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {[1,2].map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded text-xs ${page === p ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(Math.min(2, page+1))} className="w-7 h-7 bg-white/5 rounded flex items-center justify-center hover:bg-white/10">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <select className="bg-[#1A1A24] border border-white/5 rounded px-2 py-1 text-xs text-white">
              <option>10 / page</option>
              <option>25 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-64 flex-shrink-0 space-y-4">
        {/* Placement overview */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Aperçu des emplacements</h3>
          <div className="flex justify-center mb-3">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={placements} cx="50%" cy="50%" outerRadius={55} paddingAngle={2} dataKey="value">
                  {placements.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          {placements.map(p => (
            <div key={p.name} className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="text-gray-400">{p.name}</span>
              </div>
              <span className="text-white font-medium">{p.value}%</span>
            </div>
          ))}
        </div>

        {/* Performance */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-1">Performance (ce mois-ci)</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-gray-400">Impressions</div>
              <div className="text-base font-bold text-white">24,580</div>
              <div className="text-xs text-green-400">+18.2%</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Clics</div>
              <div className="text-base font-bold text-white">892</div>
              <div className="text-xs text-green-400">+12.7%</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={performanceData}>
              <Line type="monotone" dataKey="imp" stroke="#7C3AED" strokeWidth={1.5} dot={false} />
              <Tooltip content={<CT />} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tips */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Conseils</h3>
          {[
            { icon: '🖼️', title: 'Utilisez des images attractives', desc: 'Les annonces avec des visuels obtiennent 2x plus de clics.' },
            { icon: '🔬', title: 'Testez différentes variantes', desc: 'Testez plusieurs messages pour optimiser vos performances.' },
            { icon: '🎯', title: 'Ciblez le bon emplacement', desc: 'Choisissez l\'emplacement le plus visible pour votre annonce.' },
          ].map(t => (
            <div key={t.title} className="flex gap-3 mb-3 last:mb-0">
              <span className="text-base flex-shrink-0 mt-0.5">{t.icon}</span>
              <div>
                <div className="text-xs font-medium text-white">{t.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Help */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-2">Besoin d'aide ?</div>
          <div className="text-xs text-gray-400 mb-3">Consultez notre guide sur la création d'annonces efficaces.</div>
          <button className="w-full btn-secondary text-xs py-2">📖 Voir le guide</button>
          <button className="w-full btn-secondary text-xs py-2 mt-2">💬 Contacter le support</button>
        </div>
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#1A1A24] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-4">Créer une annonce</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Titre</label>
                <input className="input-field" placeholder="Titre de l'annonce" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Description</label>
                <textarea className="input-field resize-none h-20" placeholder="Description de l'annonce" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Emplacement</label>
                  <select className="input-field text-sm">
                    {placements.map(p => <option key={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Priorité</label>
                  <select className="input-field text-sm">
                    <option>Haute</option><option>Moyenne</option><option>Basse</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Date de début</label>
                  <input type="date" className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Date de fin</label>
                  <input type="date" className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary text-sm">Annuler</button>
              <button onClick={() => setShowModal(false)} className="flex-1 btn-primary text-sm">Créer l'annonce</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
