'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import {
  User, Shield, Settings, Monitor, Camera, Copy, Save, Eye, EyeOff,
  Bot, Server, Coins, Award, CheckCircle, Loader2,
  LogOut, Trash2, Clock, Globe, LayoutDashboard, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { userApi, coinsApi } from '@/lib/api';
import { useCoinsBalance } from '@/lib/useCoinsBalance';
import { Share2, Link2 } from 'lucide-react';
import { formatDate, formatRelative, copyToClipboard, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'info',     label: 'Infos',        icon: User },
  { id: 'security', label: 'Sécurité',     icon: Shield },
  { id: 'prefs',    label: 'Préfs',        icon: Settings },
  { id: 'sessions', label: 'Sessions',     icon: Monitor },
];

export default function ProfilePage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const user = session?.user as any;
  const [tab, setTab] = useState('info');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', whatsapp: '', location: '', language: 'fr', timezone: 'UTC', currency: 'EUR', theme: 'dark' });
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePwd, setDeletePwd] = useState('');
  const [showDeletePwd, setShowDeletePwd] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userApi.getProfile(),
    onSuccess: (data: any) => {
      const u = data?.data;
      if (u) setForm({
        name: u.name || '', bio: u.bio || '', whatsapp: u.whatsapp || '',
        location: u.location || '', language: u.language || 'fr',
        timezone: u.timezone || 'UTC', currency: u.currency || 'EUR', theme: u.theme || 'dark',
      });
    },
  } as any);

  const { data: statsData } = useQuery({ queryKey: ['user-stats'], queryFn: () => userApi.getDashboardStats() });
  const { data: sessionsData } = useQuery({ queryKey: ['sessions'], queryFn: () => userApi.getSessions(), enabled: tab === 'sessions' });
  const { data: referralData } = useQuery({ queryKey: ['referral'], queryFn: () => coinsApi.getReferralStats(), enabled: !!user });
  const referral = (referralData as any)?.data?.data ?? {};
  const referralLink = typeof window !== 'undefined' && referral.referralCode ? `${window.location.origin}/auth/register?ref=${referral.referralCode}` : '';
  const requestLink = typeof window !== 'undefined' && user?.id ? `${window.location.origin}/request-coins/${user.id}` : '';

  const { balance: coinsBalance } = useCoinsBalance();
  const profile = (profileData as any)?.data || {};
  const stats = (statsData as any)?.data || {};
  const _raw = (sessionsData as any)?.data?.sessions ?? (sessionsData as any)?.data;
  const sessions: any[] = Array.isArray(_raw) ? _raw : [];

  const updateMutation = useMutation({
    mutationFn: () => userApi.updateProfile(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); toast.success('Profil mis à jour !'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
  });

  const pwdMutation = useMutation({
    mutationFn: () => userApi.updatePassword(pwdForm.oldPassword, pwdForm.newPassword),
    onSuccess: () => { setPwdForm({ oldPassword: '', newPassword: '' }); toast.success('Mot de passe mis à jour !'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur'),
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

  const displayName = profile?.name || user?.name || 'Utilisateur';
  const initials = displayName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
  const isGoogleAccount = !!(profile?.googleId || (!profile?.password && profile?.emailVerified));

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Mon Profil</h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Gérez vos informations personnelles.</p>
      </div>

      {/* Profile card */}
      <div className="bg-[#111118] border border-white/5 rounded-xl overflow-hidden w-full">
        <div className="h-16 sm:h-20 bg-gradient-to-r from-purple-900/40 to-blue-900/40" />
        <div className="px-3 sm:px-5 pb-4">
          <div className="flex items-end justify-between -mt-7 sm:-mt-9 mb-3">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full border-[3px] border-[#111118] flex items-center justify-center text-lg font-bold text-white overflow-hidden flex-shrink-0">
                {profile?.avatar ? <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials}
              </div>
              <button className="absolute bottom-0 right-0 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                <Camera className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                <Link href="/admin" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs hover:bg-yellow-500/20 transition-colors">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <Link href="/dashboard/settings" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 text-xs hover:bg-white/10 transition-colors">
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Paramètres</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
            <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-[160px] sm:max-w-xs">{displayName}</h2>
            {user?.plan && user.plan !== 'FREE' && (
              <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] rounded-full">{user.plan}</span>
            )}
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              En ligne
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {profile?.createdAt && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(profile.createdAt, { month: 'short', year: 'numeric' })}</span>
            )}
            <button
              onClick={() => copyToClipboard(user?.id || '').then(() => toast.success('ID copié !'))}
              className="flex items-center gap-1 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 hover:bg-white/10 transition-colors"
            >
              <span className="text-purple-400 font-mono text-[10px] max-w-[80px] truncate">{(user?.id || '').slice(0, 8)}…</span>
              <Copy className="w-2.5 h-2.5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats — compact on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 w-full">
        {[
          { icon: Bot,       label: 'Bots',     value: stats?.activeBots   ?? 0, color: 'text-blue-400' },
          { icon: Server,    label: 'Serveurs', value: stats?.activeServers ?? 0, color: 'text-purple-400' },
          { icon: Coins,     label: 'Coins',    value: coinsBalance, color: 'text-amber-400' },
          { icon: TrendingUp,label: 'Dépensé',  value: stats?.totalEarned  ?? 0, color: 'text-green-400' },
          { icon: Award,     label: 'Badge',    value: user?.plan || 'Free', color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-white/5 rounded-xl p-3">
            <s.icon className={`w-4 h-4 ${s.color} mb-1.5`} />
            <div className="text-sm sm:text-base font-bold text-white truncate">{typeof s.value === 'number' ? s.value.toLocaleString('fr-FR') : s.value}</div>
            <div className="text-[10px] sm:text-xs text-gray-500 truncate">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 sm:gap-1 bg-[#0D0D14] border border-white/5 rounded-xl p-1 overflow-x-auto w-full">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-all flex-1 justify-center sm:flex-none',
              tab === t.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="space-y-4 w-full">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4 sm:p-5 w-full">
            <h3 className="text-sm font-semibold text-white mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <div className="w-full">
                <label className="text-xs text-gray-400 mb-1.5 block">Nom d'utilisateur</label>
                <input className="input-field w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="w-full">
                <label className="text-xs text-gray-400 mb-1.5 block">Adresse e-mail</label>
                <div className="relative w-full">
                  <input className="input-field w-full pr-16" value={profile?.email || user?.email || ''} readOnly />
                  {profile?.emailVerified && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-green-400 flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5" /> OK
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full">
                <label className="text-xs text-gray-400 mb-1.5 block">WhatsApp (optionnel)</label>
                <input className="input-field w-full" placeholder="+237 6XX XXX XXX" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
              <div className="w-full">
                <label className="text-xs text-gray-400 mb-1.5 block">Localisation</label>
                <input className="input-field w-full" placeholder="Pays / Ville" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="w-full">
                <label className="text-xs text-gray-400 mb-1.5 block">Langue</label>
                <select className="input-field w-full" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="w-full">
                <label className="text-xs text-gray-400 mb-1.5 block">Fuseau horaire</label>
                <select className="input-field w-full" value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
                  <option value="UTC">UTC</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Africa/Douala">Africa/Douala</option>
                  <option value="America/New_York">America/NY</option>
                </select>
              </div>
              <div className="sm:col-span-2 w-full">
                <label className="text-xs text-gray-400 mb-1.5 block">Bio <span className="text-gray-600">{form.bio.length}/160</span></label>
                <textarea
                  className="input-field w-full resize-none"
                  rows={2}
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
              className="btn-primary mt-4 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>

          {/* XP card */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4 w-full">
            <h4 className="text-xs font-semibold text-white mb-3">Niveau & Progression</h4>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{user?.plan || 'Gratuit'}</div>
                <div className="text-xs text-gray-400">Niveau {profile?.level || 1}</div>
              </div>
              <div className="ml-auto text-xs text-gray-500">{profile?.xp || 0} XP</div>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${Math.min(((profile?.xp || 0) % 2000) / 20, 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {tab === 'security' && (
        <div className="space-y-4 w-full">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-4 sm:p-5 w-full">
            <h3 className="text-sm font-semibold text-white mb-4">Changer le mot de passe</h3>
            <div className="space-y-3">
              {[
                { key: 'oldPassword', label: 'Ancien mot de passe', show: showOldPwd, toggle: () => setShowOldPwd(!showOldPwd) },
                { key: 'newPassword', label: 'Nouveau mot de passe', show: showNewPwd, toggle: () => setShowNewPwd(!showNewPwd) },
              ].map(({ key, label, show, toggle }) => (
                <div key={key} className="w-full">
                  <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
                  <div className="relative w-full">
                    <input
                      className="input-field w-full pr-10"
                      type={show ? 'text' : 'password'}
                      value={(pwdForm as any)[key]}
                      onChange={e => setPwdForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" onClick={toggle}>
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => pwdMutation.mutate()}
                disabled={!pwdForm.oldPassword || !pwdForm.newPassword || pwdMutation.isPending}
                className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {pwdMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Mettre à jour
              </button>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 w-full">
            <h3 className="text-sm font-semibold text-red-400 mb-1">Supprimer le compte</h3>
            <p className="text-xs text-gray-400 mb-3">Action irréversible — toutes vos données seront supprimées.</p>
            <div className="space-y-2 w-full">
              <input
                className="input-field w-full border-red-500/20 text-xs"
                placeholder='Tapez "SUPPRIMER" pour confirmer'
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
              />
              {!isGoogleAccount && (
                <div className="relative w-full">
                  <input
                    className="input-field w-full pr-10 border-red-500/20 text-xs"
                    type={showDeletePwd ? 'text' : 'password'}
                    placeholder="Votre mot de passe"
                    value={deletePwd}
                    onChange={e => setDeletePwd(e.target.value)}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShowDeletePwd(!showDeletePwd)}>
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

      {/* Tab: Préférences */}
      {tab === 'prefs' && (
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4 sm:p-5 space-y-4 w-full">
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Thème</label>
            <div className="flex gap-2">
              {[{ v: 'dark', l: 'Sombre' }, { v: 'light', l: 'Clair' }].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setForm(f => ({ ...f, theme: v }))}
                  className={cn('flex-1 py-2.5 rounded-lg text-sm border transition-all', form.theme === v ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-white/5 bg-white/5 text-gray-400')}
                >
                  {l}
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
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
        </div>
      )}

      {/* Referral + Request coins — always visible below tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {/* Referral link */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-white">Lien de parrainage</span>
          </div>
          {!profile?.emailVerified && !profile?.googleId ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400">
              Vérifiez votre email pour activer le parrainage. Les coins ne sont crédités qu'après vérification.
            </div>
          ) : referralLink ? (
            <>
              <p className="text-xs text-gray-400 mb-2">
                Partagez ce lien · <span className="text-green-400 font-medium">{referral.totalReferrals || 0} filleuls</span> · <span className="text-amber-400">{referral.totalEarned || 0} Coins gagnés</span>
              </p>
              <div className="flex gap-2">
                <div className="flex-1 bg-[#1A1A24] border border-white/5 rounded-lg px-2.5 py-2 text-xs text-green-400 truncate">{referralLink}</div>
                <button className="btn-secondary px-2.5" onClick={() => copyToClipboard(referralLink).then(() => toast.success('Copié !'))}><Copy className="w-3.5 h-3.5" /></button>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500">Chargement...</div>
          )}
        </div>

        {/* Request coins link */}
        <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Demander des Coins</span>
          </div>
          <p className="text-xs text-gray-400 mb-2">Partagez ce lien pour recevoir des Coins.</p>
          {requestLink ? (
            <div className="flex gap-2">
              <div className="flex-1 bg-[#1A1A24] border border-white/5 rounded-lg px-2.5 py-2 text-xs text-blue-400 truncate">{requestLink}</div>
              <button className="btn-secondary px-2.5" onClick={() => copyToClipboard(requestLink).then(() => toast.success('Copié !'))}><Copy className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="text-xs text-gray-500">Chargement...</div>
          )}
        </div>
      </div>

      {/* Tab: Sessions */}
      {tab === 'sessions' && (
        <div className="bg-[#111118] border border-white/5 rounded-xl w-full overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Aucune session active</div>
          ) : sessions.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 p-3 sm:p-4 border-b border-white/5 last:border-0">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                <Monitor className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm text-white truncate">{s.userAgent || 'Navigateur inconnu'}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 flex flex-wrap gap-2 mt-0.5">
                  {s.ip && <span className="flex items-center gap-1 truncate"><Globe className="w-3 h-3 flex-shrink-0" />{s.ip}</span>}
                  <span className="flex items-center gap-1 whitespace-nowrap"><Clock className="w-3 h-3" />Expire {formatRelative(s.expiresAt)}</span>
                </div>
              </div>
              <button
                onClick={() => revokeMutation.mutate(s.id)}
                className="flex-shrink-0 p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
