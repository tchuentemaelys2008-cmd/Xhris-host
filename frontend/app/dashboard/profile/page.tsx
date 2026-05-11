'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  User, Shield, Settings, Monitor, Camera, Copy, Save, Eye, EyeOff,
  Bot, Server, Coins, TrendingUp, Award, CheckCircle, Loader2,
  LogOut, Trash2, Clock, Globe, LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { userApi } from '@/lib/api';
import { formatDate, formatRelative, copyToClipboard, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'info', label: 'Infos', icon: User },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'prefs', label: 'Préférences', icon: Settings },
  { id: 'sessions', label: 'Sessions', icon: Monitor },
];

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const qc = useQueryClient();
  const user = session?.user as any;
  const [tab, setTab] = useState('info');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', whatsapp: '', location: '', language: 'fr', timezone: 'UTC', currency: 'EUR', theme: 'dark' });
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '' });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userApi.getProfile(),
    onSuccess: (data: any) => {
      const u = data?.data;
      if (u) setForm({ name: u.name || '', bio: u.bio || '', whatsapp: u.whatsapp || '', location: u.location || '', language: u.language || 'fr', timezone: u.timezone || 'UTC', currency: u.currency || 'EUR', theme: u.theme || 'dark' });
    },
  } as any);

  const { data: statsData } = useQuery({ queryKey: ['user-stats'], queryFn: () => userApi.getDashboardStats() });
  const { data: sessionsData } = useQuery({ queryKey: ['sessions'], queryFn: () => userApi.getSessions(), enabled: tab === 'sessions' });

  const profile = (profileData as any)?.data || {};
  const stats = (statsData as any)?.data || {};
  const _rawSessions = (sessionsData as any)?.data?.sessions ?? (sessionsData as any)?.data;
  const sessions: any[] = Array.isArray(_rawSessions) ? _rawSessions : [];

  const updateMutation = useMutation({
    mutationFn: () => userApi.updateProfile(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); toast.success('Profil mis à jour !'); },
    onError: (e: any) => toast.error(e.message),
  });

  const pwdMutation = useMutation({
    mutationFn: () => userApi.updatePassword(pwdForm.oldPassword, pwdForm.newPassword),
    onSuccess: () => { setPwdForm({ oldPassword: '', newPassword: '' }); toast.success('Mot de passe mis à jour !'); },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => userApi.revokeSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Session révoquée'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (pwd: string) => userApi.deleteAccount(pwd),
    onSuccess: () => { toast.success('Compte supprimé'); signOut({ callbackUrl: '/' }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePwd, setDeletePwd] = useState('');
  const [showDeletePwd, setShowDeletePwd] = useState(false);

  const displayName = profile?.name || user?.name || 'Utilisateur';
  const initials = displayName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();

  const isGoogleAccount = !!(profile?.googleId || (!profile?.password && profile?.emailVerified));

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-white">Mon Profil</h1>
        <p className="text-gray-400 text-sm mt-1">Gérez vos informations personnelles et consultez vos statistiques.</p>
      </div>

      {/* Profile card */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden">
        <div className="h-20 sm:h-24 bg-gradient-to-r from-purple-900/40 to-blue-900/40 relative">
          {profile?.banner && <img src={profile.banner} alt="" className="w-full h-full object-cover opacity-40" />}
        </div>
        <div className="px-4 sm:px-6 pb-5">
          <div className="flex items-end justify-between -mt-8 sm:-mt-10 mb-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full border-4 border-[#111118] flex items-center justify-center text-xl sm:text-2xl font-bold text-white overflow-hidden">
                {profile?.avatar ? <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials}
              </div>
              <button className="absolute bottom-0 right-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                <Link href="/admin" className="btn-secondary flex items-center gap-2 text-sm text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/10">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Panel Admin</span>
                </Link>
              )}
              <button className="btn-secondary flex items-center gap-2 text-sm"><Settings className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white truncate max-w-[200px] sm:max-w-none">{displayName}</h2>
            {user?.plan && user.plan !== 'FREE' && (
              <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs rounded-full flex-shrink-0">{user.plan}</span>
            )}
            <div className="flex items-center gap-1.5 text-green-400 text-xs sm:text-sm flex-shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              En ligne
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 min-w-0">
            {profile?.createdAt && <span className="flex items-center gap-1 flex-shrink-0"><Clock className="w-3.5 h-3.5" /> {formatDate(profile.createdAt, { month: 'short', year: 'numeric' })}</span>}
            <button
              onClick={() => copyToClipboard(user?.id || '').then(() => toast.success('ID copié !'))}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded px-2 py-0.5 hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <span className="text-purple-400 font-mono text-[10px]">{(user?.id || 'USR-XXXXX').slice(0, 10)}…</span>
              <Copy className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: Bot, label: 'Bots Deployés', value: stats?.activeBots ?? 0, href: '/dashboard/bots', color: 'text-blue-400' },
          { icon: Server, label: 'Serveurs Créés', value: stats?.activeServers ?? 0, href: '/dashboard/servers', color: 'text-purple-400' },
          { icon: Coins, label: 'Coins Actuels', value: stats?.coins ?? user?.coins ?? 0, href: '/dashboard/coins', color: 'text-yellow-400' },
          { icon: TrendingUp, label: 'Total Dépensé', value: stats?.totalEarned ?? 0, href: '/dashboard/coins', color: 'text-green-400' },
          { icon: Award, label: 'Badge', value: user?.plan || 'Membre', href: '#', color: 'text-orange-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-lg font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0D0D14] border border-white/5 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all',
              tab === t.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#111118] border border-white/5 rounded-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Nom d'utilisateur</label>
                <input className="input-field w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Adresse e-mail</label>
                <div className="relative">
                  <input className="input-field w-full pr-20" value={profile?.email || user?.email || ''} readOnly />
                  {profile?.emailVerified && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Vérifié</span>}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Numéro WhatsApp (optionnel)</label>
                <input className="input-field w-full" placeholder="+237 6XX XXX XXX" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Localisation</label>
                <input className="input-field w-full" placeholder="Pays / Ville" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Langue</label>
                <select className="input-field w-full" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Fuseau horaire</label>
                <select className="input-field w-full" value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
                  <option value="UTC">UTC</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Africa/Douala">Africa/Douala</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 mb-1.5 block">Bio <span className="text-gray-600">{form.bio.length}/160</span></label>
                <textarea
                  className="input-field w-full resize-none"
                  rows={3}
                  maxLength={160}
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Décrivez-vous en quelques mots..."
                />
              </div>
            </div>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="btn-primary mt-4 flex items-center gap-2"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer les modifications
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-white mb-4">Niveau & Progression</h4>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white capitalize">{user?.plan || 'Gratuit'}</div>
                  <div className="text-xs text-gray-400">Niveau {profile?.level || 1}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>{profile?.xp || 0} XP</span>
                <span>Niveau suivant</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${Math.min(((profile?.xp || 0) % 2000) / 20, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Changer le mot de passe</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Ancien mot de passe</label>
                <div className="relative">
                  <input className="input-field w-full pr-10" type={showOldPwd ? 'text' : 'password'}
                    value={pwdForm.oldPassword} onChange={e => setPwdForm(f => ({ ...f, oldPassword: e.target.value }))} />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShowOldPwd(!showOldPwd)}>
                    {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Nouveau mot de passe</label>
                <div className="relative">
                  <input className="input-field w-full pr-10" type={showNewPwd ? 'text' : 'password'}
                    value={pwdForm.newPassword} onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShowNewPwd(!showNewPwd)}>
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button onClick={() => pwdMutation.mutate()}
                disabled={!pwdForm.oldPassword || !pwdForm.newPassword || pwdMutation.isPending}
                className="btn-primary flex items-center gap-2">
                {pwdMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Mettre à jour
              </button>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-red-400 mb-1">Supprimer le compte</h3>
            <p className="text-xs text-gray-400 mb-3">Action irréversible. Toutes vos données seront supprimées.</p>
            <div className="space-y-2">
              <input className="input-field w-full border-red-500/20 text-xs" placeholder='Tapez "SUPPRIMER" pour confirmer'
                value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
              {!isGoogleAccount && (
                <div className="relative">
                  <input className="input-field w-full pr-10 border-red-500/20 text-xs"
                    type={showDeletePwd ? 'text' : 'password'}
                    placeholder="Votre mot de passe"
                    value={deletePwd} onChange={e => setDeletePwd(e.target.value)} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowDeletePwd(!showDeletePwd)}>
                    {showDeletePwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
              {isGoogleAccount && (
                <p className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                  Compte Google — aucun mot de passe requis.
                </p>
              )}
              <button
                onClick={() => deleteMutation.mutate(isGoogleAccount ? '' : deletePwd)}
                disabled={deleteConfirm !== 'SUPPRIMER' || (!isGoogleAccount && !deletePwd) || deleteMutation.isPending}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer mon compte
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'prefs' && (
        <div className="max-w-lg bg-[#111118] border border-white/5 rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Thème</label>
            <div className="flex gap-3">
              {['dark', 'light'].map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, theme: t }))}
                  className={cn('px-4 py-2 rounded-lg text-sm border transition-all capitalize', form.theme === t ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-white/5 bg-white/5 text-gray-400')}
                >
                  {t === 'dark' ? 'Sombre' : 'Clair'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Devise</label>
            <select className="input-field w-full" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="XAF">XAF (FCFA)</option>
            </select>
          </div>
          <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary flex items-center gap-2">
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="bg-[#111118] border border-white/5 rounded-xl divide-y divide-white/5">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Aucune session active</div>
          ) : sessions.map((s: any) => (
            <div key={s.id} className="flex items-center gap-4 p-4">
              <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center">
                <Monitor className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{s.userAgent || 'Navigateur inconnu'}</div>
                <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                  {s.ip && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{s.ip}</span>}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Expire {formatRelative(s.expiresAt)}</span>
                </div>
              </div>
              <button onClick={() => revokeMutation.mutate(s.id)} className="btn-secondary text-xs text-red-400 border-red-500/20 hover:bg-red-500/10">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
