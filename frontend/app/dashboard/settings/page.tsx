'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Settings, Globe, Bell, Shield, Moon, Sun, Save,
  Loader2, Trash2, LogOut, ChevronRight,
  Mail, Smartphone, Eye, EyeOff, CheckCircle,
} from 'lucide-react';
import { userApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useSettings } from '@/lib/settingsContext';

const TABS_DEF = [
  { id: 'general', key: 'settings.general', fallback: 'Général', icon: Settings },
  { id: 'notifs',  key: 'settings.notifications', fallback: 'Notifications', icon: Bell },
  { id: 'privacy', key: 'settings.privacy', fallback: 'Confidentialité', icon: Shield },
  { id: 'danger',  key: 'settings.account', fallback: 'Compte', icon: Trash2 },
];

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const TIMEZONES = [
  'UTC', 'Europe/Paris', 'Africa/Douala', 'Africa/Lagos', 'Africa/Abidjan',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo',
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const user = session?.user as any;
  const { setLanguage: applyLanguage, setTheme: applyTheme, setCurrency: applyCurrency, setTimezone: applyTimezone, t, language: currentLang } = useSettings();
  const [tab, setTab] = useState('general');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    language: 'fr',
    timezone: 'UTC',
    theme: 'dark',
    currency: 'EUR',
    notifEmail: true,
    notifPush: true,
    notifBots: true,
    notifCoins: true,
    notifMarketing: false,
    profilePublic: true,
    showCoins: true,
    showBots: true,
  });

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userApi.getProfile(),
    enabled: !!user,
  });

  useEffect(() => {
    const profile = (profileData as any)?.data;
    if (profile) {
      setSettings(prev => ({
        ...prev,
        language: profile.language || 'fr',
        timezone: profile.timezone || 'UTC',
        currency: profile.currency || 'EUR',
        theme: profile.theme || 'dark',
      }));
    }
  }, [profileData]);

  const saveMutation = useMutation({
    mutationFn: () => userApi.updateProfile({
      language: settings.language,
      timezone: settings.timezone,
      currency: settings.currency,
      theme: settings.theme,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      // Apply immediately to DOM + localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('xhris_language', settings.language);
        localStorage.setItem('xhris_currency', settings.currency);
        localStorage.setItem('xhris_theme', settings.theme);
        localStorage.setItem('xhris_timezone', settings.timezone);
        document.documentElement.lang = settings.language;
        document.documentElement.setAttribute('data-theme', settings.theme);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success(
        settings.language === 'en'
          ? 'Settings saved! The site is now in English.'
          : 'Paramètres enregistrés ! Le site est maintenant configuré.',
        { duration: 5000 }
      );
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de la sauvegarde'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => userApi.deleteAccount(deletePassword),
    onSuccess: () => {
      toast.success('Compte supprimé');
      signOut({ callbackUrl: '/' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de la suppression'),
  });

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-purple-600' : 'bg-white/10'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('settings.title', 'Paramètres')}</h1>
        <p className="text-gray-400 text-sm mt-1">{t('settings.subtitle', 'Configurez votre expérience XHRIS Host.')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0D0D14] border border-white/5 rounded-xl p-1 overflow-x-auto">
        {TABS_DEF.map(td => (
          <button key={td.id} onClick={() => setTab(td.id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all',
              tab === td.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}>
            <td.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t(td.key, td.fallback)}</span>
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* Username change */}
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-white text-sm">{t('settings.username_title', 'Changer de pseudo')}</h3>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                placeholder={user?.name || 'Nouveau pseudo'}
                value={settings.language === 'fr' ? (settings as any).newName || '' : (settings as any).newName || ''}
                onChange={e => setSettings(s => ({ ...s, newName: e.target.value } as any))}
              />
              <button
                onClick={async () => {
                  const newName = (settings as any).newName?.trim();
                  if (!newName) return toast.error('Entrez un pseudo');
                  try {
                    const { userApi } = await import('@/lib/api');
                    await userApi.updateProfile({ name: newName });
                    toast.success(`Pseudo changé en "${newName}" !`, { duration: 5000 });
                    setSettings(s => ({ ...s, newName: '' } as any));
                    qc.invalidateQueries({ queryKey: ['profile'] });
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message || 'Erreur');
                  }
                }}
                className="btn-primary flex items-center gap-2 flex-shrink-0"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Sauvegarder</span>
              </button>
            </div>
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl p-6 space-y-5">
            <h3 className="font-semibold text-white">{t('settings.language', 'Langue & Région')}</h3>

            <div>
              <label className="text-xs text-gray-400 mb-2 block">{t('settings.language', 'Langue de l\'interface')}</label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={async () => {
                      setSettings(s => ({ ...s, language: lang.code }));
                      await applyLanguage(lang.code as any);
                      toast.success(lang.code === 'en' ? 'Language changed to English!' : 'Langue changée en Français !', { duration: 4000 });
                    }}
                    className={cn('flex items-center gap-2 p-3 rounded-lg border transition-all text-sm',
                      settings.language === lang.code
                        ? 'border-purple-500 bg-purple-500/10 text-white'
                        : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/15')}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">{t('settings.timezone', 'Fuseau horaire')}</label>
              <select
                className="input-field w-full"
                value={settings.timezone}
                onChange={async e => {
                  setSettings(s => ({ ...s, timezone: e.target.value }));
                  await applyTimezone(e.target.value);
                }}
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">{t('settings.currency', 'Devise')}</label>
              <select
                className="input-field w-full sm:w-48"
                value={settings.currency}
                onChange={async e => {
                  setSettings(s => ({ ...s, currency: e.target.value }));
                  await applyCurrency(e.target.value);
                }}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="XAF">XAF (FCFA)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-2 block">Thème</label>
              <div className="flex gap-2">
                {[
                  { value: 'dark',  label: t('settings.theme_dark',  'Sombre'), icon: Moon },
                  { value: 'light', label: t('settings.theme_light', 'Clair'),  icon: Sun },
                ].map(th => (
                  <button
                    key={th.value}
                    onClick={async () => {
                      setSettings(s => ({ ...s, theme: th.value }));
                      await applyTheme(th.value);
                    }}
                    className={cn('flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all',
                      settings.theme === th.value
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/15')}
                  >
                    <th.icon className="w-4 h-4" />
                    {th.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            {saveMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : saved
                ? <CheckCircle className="w-4 h-4 text-green-400" />
                : <Save className="w-4 h-4" />
            }
            {saved ? t('settings.saved', 'Enregistré !') : t('settings.save', 'Enregistrer les modifications')}
          </button>
        </motion.div>
      )}

      {/* Notifications */}
      {tab === 'notifs' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#111118] border border-white/5 rounded-xl p-6 space-y-0 divide-y divide-white/5">
          {[
            { key: 'notifEmail', icon: Mail, label: t('settings.notif_email', 'Notifications par email'), desc: t('settings.notif_email_desc', 'Recevez des alertes importantes par email') },
            { key: 'notifPush', icon: Bell, label: t('settings.notif_push', 'Notifications push'), desc: t('settings.notif_push_desc', 'Alertes instantanées dans votre navigateur') },
            { key: 'notifBots', icon: Smartphone, label: t('settings.notif_bots', 'Activité des bots'), desc: t('settings.notif_bots_desc', 'Démarrages, arrêts et erreurs de vos bots') },
            { key: 'notifCoins', icon: Smartphone, label: t('settings.notif_coins', 'Transactions Coins'), desc: t('settings.notif_coins_desc', 'Réceptions, envois et bonus de Coins') },
            { key: 'notifMarketing', icon: Mail, label: t('settings.notif_marketing', 'Emails promotionnels'), desc: t('settings.notif_marketing_desc', 'Offres spéciales et nouveautés') },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              </div>
              <Toggle
                value={(settings as any)[item.key]}
                onChange={(v) => setSettings(s => ({ ...s, [item.key]: v }))}
              />
            </div>
          ))}
        </motion.div>
      )}

      {/* Privacy */}
      {tab === 'privacy' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-6 space-y-0 divide-y divide-white/5">
            {[
              { key: 'profilePublic', label: t('settings.profile_public', 'Profil public'), desc: t('settings.profile_public_desc', 'Votre profil est visible par les autres membres') },
              { key: 'showCoins', label: t('settings.show_coins', 'Afficher mon solde'), desc: t('settings.show_coins_desc', 'Votre solde Coins visible sur votre profil') },
              { key: 'showBots', label: t('settings.show_bots', 'Afficher mes bots'), desc: t('settings.show_bots_desc', 'Votre liste de bots visible publiquement') },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
                <Toggle
                  value={(settings as any)[item.key]}
                  onChange={(v) => setSettings(s => ({ ...s, [item.key]: v }))}
                />
              </div>
            ))}
          </div>
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-white mb-3">{t('settings.sessions', 'Sessions actives')}</h4>
            <p className="text-xs text-gray-400 mb-3">{t('settings.sessions_sub', 'Gérez les appareils connectés à votre compte.')}</p>
            <Link href="/dashboard/profile" className="btn-secondary text-sm flex items-center gap-2 w-fit">
              {t('settings.see_sessions', 'Voir les sessions')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* Danger zone */}
      {tab === 'danger' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">{t('settings.logout', 'Se déconnecter')}</div>
              <div className="text-xs text-gray-400">{t('settings.logout_desc', 'Fermer cette session')}</div>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="btn-secondary flex items-center gap-2 text-sm text-red-400 border-red-500/20 hover:bg-red-500/10">
              <LogOut className="w-4 h-4" /> {t('nav.logout', 'Déconnexion')}
            </button>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
            <h3 className="text-base font-semibold text-red-400 mb-1">{t('settings.danger', 'Zone de danger')}</h3>
            <p className="text-sm text-gray-400 mb-4">
              {t('settings.danger_sub', 'La suppression de votre compte est irréversible. Toutes vos données, Coins, bots et serveurs seront définitivement supprimés.')}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">
                  {t('settings.delete_confirm_label', 'Tapez SUPPRIMER pour confirmer')}
                </label>
                <input
                  className="input-field w-full border-red-500/20"
                  placeholder={t('settings.delete_word', 'SUPPRIMER')}
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showDeletePwd ? 'text' : 'password'}
                    className="input-field w-full pr-10 border-red-500/20"
                    placeholder="Confirmez votre mot de passe"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePwd(!showDeletePwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showDeletePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteConfirm !== t('settings.delete_word', 'SUPPRIMER') || !deletePassword || deleteMutation.isPending}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t('settings.delete_btn', 'Supprimer définitivement mon compte')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
