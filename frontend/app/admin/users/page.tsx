'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Search, Filter, Plus, Eye, Pencil, MoreVertical,
  Ban, Coins, CheckCircle, XCircle, UserX, Loader2,
  TrendingUp, Crown, Shield, User, X
} from 'lucide-react';
import { adminApi, apiClient } from '@/lib/api';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'text-red-400 bg-red-500/10',
  ADMIN: 'text-yellow-400 bg-yellow-500/10',
  MODERATOR: 'text-blue-400 bg-blue-500/10',
  PREMIUM: 'text-purple-400 bg-purple-500/10',
  DEVELOPER: 'text-green-400 bg-green-500/10',
  USER: 'text-gray-400 bg-white/5',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionUser, setActionUser] = useState<any>(null);
  const [coinsAmount, setCoinsAmount] = useState('');
  const [coinsReason, setCoinsReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [showModal, setShowModal] = useState<'ban' | 'coins' | 'edit' | 'create' | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'USER', plan: 'FREE' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, statusFilter, page],
    queryFn: () => adminApi.getUsers({ search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined, page, limit: 20 }),
  });

  const { data: statsData } = useQuery({ queryKey: ['admin-stats'], queryFn: () => adminApi.getDashboardStats() });

  const _raw_users = (data as any)?.data?.users ?? [];
  const users: any[] = Array.isArray(_raw_users) ? _raw_users : [];
  const total: number = (data as any)?.data?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const stats = (statsData as any)?.data || {};

  const banMutation = useMutation({
    mutationFn: () => adminApi.banUser(actionUser.id, banReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setShowModal(null); setBanReason(''); },
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => adminApi.unbanUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const coinsMutation = useMutation({
    mutationFn: () => adminApi.addCoins(actionUser.id, Number(coinsAmount), coinsReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setShowModal(null); setCoinsAmount(''); setCoinsReason(''); toast.success('Coins ajustés avec succès'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  const createUserMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/users', createForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowModal(null);
      setCreateForm({ name: '', email: '', role: 'USER', plan: 'FREE' });
      toast.success('Utilisateur créé avec succès', { duration: 5000 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de la création'),
  });

  const pieData = [
    { name: 'Actifs', value: stats.activeUsers || 0, color: '#22c55e' },
    { name: 'Premium', value: stats.premiumUsers || 0, color: '#a855f7' },
    { name: 'Inactifs', value: Math.max(0, (stats.totalUsers || 0) - (stats.activeUsers || 0)), color: '#f97316' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez les utilisateurs de la plateforme</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setCreateForm({ name: '', email: '', role: 'USER', plan: 'FREE' }); setShowModal('create'); }}>
          <Plus className="w-4 h-4" />
          Ajouter un utilisateur
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Utilisateurs totaux', value: stats.totalUsers?.toLocaleString() || '0', sub: '+12.5%', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Nouveaux utilisateurs', value: stats.newUsers?.toLocaleString() || '0', sub: '+8.4%', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Utilisateurs actifs', value: stats.activeUsers?.toLocaleString() || '0', sub: '+15.7%', icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Utilisateurs premium', value: stats.premiumUsers?.toLocaleString() || '0', sub: '+9.3%', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
            <div className="text-xs text-green-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input className="input-field pl-10 w-full" placeholder="Rechercher un utilisateur..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input-field w-full sm:w-36" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">Tous les rôles</option>
              <option value="USER">Utilisateur</option>
              <option value="PREMIUM">Premium</option>
              <option value="DEVELOPER">Développeur</option>
              <option value="MODERATOR">Modérateur</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select className="input-field w-full sm:w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="BANNED">Banni</option>
            </select>
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div>
                <div className="text-sm font-medium text-white">Liste des utilisateurs</div>
                <div className="text-xs text-gray-400">Retrouvez et gérez tous les utilisateurs inscrits.</div>
              </div>
              <button className="btn-secondary text-xs">Exporter</button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/5">
                        <th className="text-left p-4 font-medium">UTILISATEUR</th>
                        <th className="text-left p-4 font-medium hidden sm:table-cell">EMAIL</th>
                        <th className="text-left p-4 font-medium hidden md:table-cell">INSCRIT LE</th>
                        <th className="text-left p-4 font-medium">RÔLE</th>
                        <th className="text-left p-4 font-medium">STATUT</th>
                        <th className="text-right p-4 font-medium hidden lg:table-cell">DÉPENSES</th>
                        <th className="text-right p-4 font-medium">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map((u: any) => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
                                {u.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <span className="text-white font-medium">{u.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-gray-400 hidden sm:table-cell">{u.email}</td>
                          <td className="p-4 text-gray-400 hidden md:table-cell">{formatDate(u.createdAt)}</td>
                          <td className="p-4">
                            <span className={cn('px-2 py-0.5 rounded-full text-xs', ROLE_COLORS[u.role] || 'text-gray-400 bg-white/5')}>
                              {u.role === 'USER' ? 'Utilisateur' : u.role}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <div className={cn('w-1.5 h-1.5 rounded-full', u.status === 'ACTIVE' ? 'bg-green-500' : u.status === 'BANNED' ? 'bg-red-500' : 'bg-gray-500')} />
                              <span className={u.status === 'ACTIVE' ? 'text-green-400' : u.status === 'BANNED' ? 'text-red-400' : 'text-gray-400'}>
                                {u.status === 'ACTIVE' ? 'Actif' : u.status === 'BANNED' ? 'Banni' : 'Inactif'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right text-gray-400 hidden lg:table-cell">
                            {formatCurrency(u._count?.transactions ? u._count.transactions * 5 : 0)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white" title="Voir">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setActionUser(u); setShowModal('edit'); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white" title="Modifier">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setActionUser(u); setShowModal('coins'); }} className="p-1.5 hover:bg-yellow-500/10 rounded-lg transition-colors text-gray-400 hover:text-yellow-400" title="Coins">
                                <Coins className="w-3.5 h-3.5" />
                              </button>
                              {u.status !== 'BANNED' ? (
                                <button onClick={() => { setActionUser(u); setShowModal('ban'); }} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400" title="Bannir">
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button onClick={() => unbanMutation.mutate(u.id)} className="p-1.5 hover:bg-green-500/10 rounded-lg transition-colors text-gray-400 hover:text-green-400" title="Débannir">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-white/5">
                    <div className="text-xs text-gray-400">Affichage de {(page - 1) * 20 + 1} à {Math.min(page * 20, total)} sur {total} utilisateurs</div>
                    <div className="flex gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Précédent</button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setPage(p)} className={cn('text-xs px-3 py-1.5 rounded-lg transition-colors', p === page ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10')}>{p}</button>
                      ))}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Suivant</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <h4 className="text-sm font-medium text-white mb-3">Statut des utilisateurs</h4>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-gray-400">{d.name}</span></div>
                  <span className="text-white font-medium">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ban modal */}
      {showModal === 'ban' && actionUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-1">Bannir {actionUser.name}</h3>
            <p className="text-sm text-gray-400 mb-4">Cette action bloquera l'accès au compte.</p>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Raison</label>
              <input className="input-field w-full" placeholder="Motif du bannissement" value={banReason} onChange={e => setBanReason(e.target.value)} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowModal(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => banMutation.mutate()} disabled={!banReason || banMutation.isPending} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {banMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-4 h-4" /> Bannir</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Coins modal */}
      {showModal === 'coins' && actionUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Ajuster les coins de {actionUser.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Montant (négatif pour retirer)</label>
                <input className="input-field w-full" type="number" placeholder="Ex: 100 ou -50" value={coinsAmount} onChange={e => setCoinsAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Raison</label>
                <input className="input-field w-full" placeholder="Motif de l'ajustement" value={coinsReason} onChange={e => setCoinsReason(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowModal(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => coinsMutation.mutate()} disabled={!coinsAmount || coinsMutation.isPending} className="btn-primary flex-1">
                {coinsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create user modal */}
      {showModal === 'create' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Ajouter un utilisateur</h3>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Nom *</label>
                <input className="input-field w-full" placeholder="Nom complet" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Email *</label>
                <input type="email" className="input-field w-full" placeholder="email@exemple.com" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Rôle</label>
                  <select className="input-field w-full" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="USER">Utilisateur</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="MODERATOR">Modérateur</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Plan</label>
                  <select className="input-field w-full" value={createForm.plan} onChange={e => setCreateForm(f => ({ ...f, plan: e.target.value }))}>
                    <option value="FREE">Gratuit</option>
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Pro</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="ELITE">Elite</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => createUserMutation.mutate()}
                disabled={!createForm.name || !createForm.email || createUserMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {createUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
