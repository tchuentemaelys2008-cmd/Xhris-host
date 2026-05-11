'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Search, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

const tabs = ['Tous', 'Revenus', 'Abonnements', 'Achats', 'Retraits', 'Codes Promo', 'Ajouts manuels', 'Remboursements'];

const transactions = [
  { id: 'REV-2024-1248', icon: '⬆️', type: 'Revenu', desc: 'Abonnement Premium - User123', method: 'Carte bancaire', amount: '+€19.99', status: 'Réussi', date: '15 Dec 2024  14:30', col: 'text-green-400' },
  { id: 'REV-2024-1247', icon: '⬆️', type: 'Revenu', desc: 'Crédits achetés - User456', method: 'PayPal', amount: '+€49.99', status: 'Réussi', date: '15 Dec 2024  13:45', col: 'text-green-400' },
  { id: 'REV-2024-1246', icon: '⬆️', type: 'Revenu', desc: 'Pack PRO - User789', method: 'Cryptomonnaie', amount: '+€29.99', status: 'Réussi', date: '15 Dec 2024  12:20', col: 'text-green-400' },
  { id: 'REV-2024-1245', icon: '⬆️', type: 'Revenu', desc: 'Abonnement Standard - User101', method: 'Carte bancaire', amount: '+€9.99', status: 'En attente', date: '15 Dec 2024  11:15', col: 'text-yellow-400' },
  { id: 'REV-2024-1244', icon: '⬆️', type: 'Revenu', desc: 'Crédits achetés - User202', method: 'Carte bancaire', amount: '+€15.00', status: 'Réussi', date: '15 Dec 2024  10:30', col: 'text-green-400' },
  { id: 'WDR-2024-058', icon: '⬇️', type: 'Retrait', desc: 'Retrait vers PayPal', method: 'PayPal', amount: '-€250.00', status: 'Réussi', date: '14 Dec 2024  16:10', col: 'text-red-400' },
  { id: 'WDR-2024-057', icon: '⬇️', type: 'Retrait', desc: 'Retrait vers carte bancaire', method: 'Carte bancaire', amount: '-€500.00', status: 'Réussi', date: '13 Dec 2024  09:22', col: 'text-red-400' },
  { id: 'SUB-2024-034', icon: '⭐', type: 'Abonnement', desc: 'Abonnement Premium - User345', method: 'Carte bancaire', amount: '+€19.99', status: 'Réussi', date: '12 Dec 2024  18:05', col: 'text-green-400' },
  { id: 'BUY-2024-089', icon: '🛒', type: 'Achat', desc: 'Achat de 500 crédits', method: 'Carte bancaire', amount: '-€4.50', status: 'Réussi', date: '12 Dec 2024  17:40', col: 'text-red-400' },
  { id: 'ADD-2024-031', icon: '➕', type: 'Ajout manuel', desc: 'Ajout de crédits - Bonus', method: 'Manuel (Admin)', amount: '+€10.00', status: 'Réussi', date: '11 Dec 2024  15:30', col: 'text-green-400' },
  { id: 'CPN-2024-022', icon: '🎫', type: 'Code promo', desc: 'Code promo SUMMER20 utilisé', method: 'Code promo', amount: '-€5.00', status: 'Réussi', date: '11 Dec 2024  14:22', col: 'text-red-400' },
  { id: 'REF-2024-015', icon: '↩️', type: 'Remboursement', desc: 'Remboursement à User555', method: 'PayPal', amount: '-€9.99', status: 'Réussi', date: '10 Dec 2024  11:10', col: 'text-red-400' },
  { id: 'BUY-2024-088', icon: '🛒', type: 'Achat', desc: 'Achat de 1000 crédits', method: 'Cryptomonnaie', amount: '-€8.99', status: 'Réussi', date: '09 Dec 2024  20:15', col: 'text-red-400' },
  { id: 'SUB-2024-033', icon: '⭐', type: 'Abonnement', desc: 'Abonnement Standard - User666', method: 'PayPal', amount: '+€9.99', status: 'Réussi', date: '08 Dec 2024  19:50', col: 'text-green-400' },
  { id: 'WDR-2024-056', icon: '⬇️', type: 'Retrait', desc: 'Retrait en USDT (TRC20)', method: 'Cryptomonnaie', amount: '-€750.00', status: 'En attente', date: '08 Dec 2024  13:05', col: 'text-yellow-400' },
];

const typePie = [
  { name: 'Revenus', value: 68.5, color: '#22C55E' },
  { name: 'Retraits', value: 15.2, color: '#EF4444' },
  { name: 'Achats', value: 8.7, color: '#EAB308' },
  { name: 'Abonnements', value: 5.6, color: '#7C3AED' },
  { name: 'Autres', value: 2.0, color: '#6B7280' },
];

const methods = [
  { name: 'Carte bancaire', pct: 45.2, color: '#7C3AED' },
  { name: 'PayPal', pct: 28.7, color: '#3B82F6' },
  { name: 'Cryptomonnaie', pct: 15.3, color: '#F97316' },
  { name: 'Virement bancaire', pct: 7.8, color: '#22C55E' },
  { name: 'Autres', pct: 3.0, color: '#6B7280' },
];

const activityData = [
  { d: '1', v: 24 }, { d: '5', v: 18 }, { d: '10', v: 32 }, { d: '15', v: 28 }, { d: '20', v: 35 }, { d: '25', v: 22 }, { d: '29', v: 24 },
];

const CT = ({ active, payload }: any) => active && payload?.length ? (
  <div className="bg-[#1A1A24] border border-white/10 rounded-lg p-2 text-xs">
    {payload.map((p: any) => <p key={p.name} style={{ color: p.stroke }}>{p.value}</p>)}
  </div>
) : null;

export default function FinancialHistoryPage() {
  const [activeTab, setActiveTab] = useState('Tous');
  const [page, setPage] = useState(1);
  const totalPages = 17;

  const statusBadge = (s: string) => ({
    'Réussi': <span className="badge-green text-xs">Réussi</span>,
    'En attente': <span className="badge bg-yellow-500/20 text-yellow-400 text-xs">En attente</span>,
    'Échoué': <span className="badge bg-red-500/20 text-red-400 text-xs">Échoué</span>,
  }[s] || <span className="badge bg-gray-500/20 text-gray-400 text-xs">{s}</span>);

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Historique financier</h1>
          <p className="text-gray-400 text-sm mt-1">Consultez l'historique complet de toutes vos activités financières.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === t ? 'bg-purple-600 text-white' : 'bg-[#1A1A24] text-gray-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400">
            <span>📅</span>
            <span>29 Nov 2024 - 29 Dec 2024</span>
          </div>
          <select className="bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
            <option>Toutes les méthodes</option>
            {methods.map(m => <option key={m.name}>{m.name}</option>)}
          </select>
          <select className="bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
            <option>Tous les statuts</option>
            <option>Réussi</option><option>En attente</option><option>Échoué</option>
          </select>
          <div className="flex items-center gap-2 bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <input placeholder="Rechercher..." className="bg-transparent text-xs text-white outline-none w-36" />
          </div>
          <button className="ml-auto flex items-center gap-2 btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            Exporter
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['ID', 'Type', 'Description', 'Méthode', 'Montant', 'Statut', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx, i) => (
                <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-purple-400 text-xs font-mono">{tx.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{tx.icon}</span>
                      <span className="text-xs text-gray-300">{tx.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{tx.desc}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{tx.method}</td>
                  <td className={`px-4 py-3 text-xs font-bold ${tx.col}`}>{tx.amount}</td>
                  <td className="px-4 py-3">{statusBadge(tx.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{tx.date}</td>
                  <td className="px-4 py-3">
                    <button className="text-gray-500 hover:text-white transition-colors text-base">⋯</button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span>Affichage de 1 à 15 sur 248 transactions</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} className="w-7 h-7 bg-white/5 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-50" disabled={page === 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {[1, 2, 3, 4, 5, '...', totalPages].map((p, i) => (
                <button key={i} onClick={() => typeof p === 'number' && setPage(p)} className={`w-7 h-7 rounded text-xs transition-all ${page === p ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} className="w-7 h-7 bg-white/5 rounded flex items-center justify-center hover:bg-white/10" disabled={page === totalPages}>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-60 flex-shrink-0 space-y-4">
        {/* Financial summary */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Résumé financier</h3>
            <select className="text-xs bg-[#1A1A24] border border-white/5 text-gray-400 rounded px-2 py-1"><option>Ce mois-ci</option></select>
          </div>
          {[
            { l: 'Revenus', v: '+ €8,732.20', col: 'text-green-400' },
            { l: 'Dépenses', v: '- €1,567.80', col: 'text-red-400' },
            { l: 'Retraits', v: '- €1,890.50', col: 'text-red-400' },
            { l: 'Remboursements', v: '- €9.99', col: 'text-red-400' },
          ].map(s => (
            <div key={s.l} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-xs">
              <span className="text-gray-400">{s.l}</span>
              <span className={`${s.col} font-medium`}>{s.v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 text-sm font-bold">
            <span className="text-white">Total net</span>
            <span className="text-green-400">€5,264.91</span>
          </div>
        </div>

        {/* Type distribution */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Répartition par type</h3>
          <div className="flex justify-center mb-3">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={typePie} cx="50%" cy="50%" innerRadius={35} outerRadius={52} paddingAngle={2} dataKey="value">
                  {typePie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          {typePie.map(t => (
            <div key={t.name} className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: t.color }} /><span className="text-gray-400">{t.name}</span></div>
              <span className="text-white">{t.value}%</span>
            </div>
          ))}
        </div>

        {/* Methods */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Méthodes les plus utilisées</h3>
          {methods.map(m => (
            <div key={m.name} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{m.name}</span>
                <span className="text-white">{m.pct}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Activity */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Activité récente</h3>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-2xl font-bold text-green-400">+24</span>
          </div>
          <div className="text-xs text-gray-400 mb-3">Transactions vs mois dernier</div>
          <ResponsiveContainer width="100%" height={50}>
            <LineChart data={activityData}>
              <Tooltip content={<CT />} />
              <Line type="monotone" dataKey="v" stroke="#22C55E" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="text-xl font-bold text-green-400">€5,264.91</div>
            <div className="text-xs text-gray-400">Total net</div>
            <div className="text-xs text-green-400 mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +18.7% vs mois dernier
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
