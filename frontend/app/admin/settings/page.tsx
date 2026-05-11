'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Settings, Save, Loader2, Shield, Bell, Globe, Coins, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'general', label: 'Général', icon: Settings },
  { id: 'coins', label: 'Coins & Paiements', icon: Coins },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState('general');
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'XHRIS HOST',
    siteDescription: 'Plateforme de déploiement de bots',
    maintenanceMode: false,
    registrationsOpen: true,
    defaultLanguage: 'fr',
  });
  const [coinsSettings, setCoinsSettings] = useState({
    dailyBonusAmount: 3,
    referralBonus: 10,
    transferFee: 1,
    minTransfer: 1,
    maxTransfer: 1000,
  });

  const saveMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/settings', { general: generalSettings, coins: coinsSettings }),
    onSuccess: () => {
      // Apply language setting to document
      if (typeof document !== 'undefined') {
        document.documentElement.lang = generalSettings.defaultLanguage;
      }
      toast.success('Paramètres sauvegardés avec succès', { duration: 5000 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de la sauvegarde'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Paramètres système</h1>
        <p className="text-gray-400 text-sm">Configuration globale de la plateforme</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0D0D14] border border-white/5 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all', tab === t.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Paramètres généraux</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Nom du site</label>
              <input className="input-field w-full" value={generalSettings.siteName} onChange={e => setGeneralSettings(s => ({ ...s, siteName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Langue par défaut</label>
              <select className="input-field w-full" value={generalSettings.defaultLanguage} onChange={e => setGeneralSettings(s => ({ ...s, defaultLanguage: e.target.value }))}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 mb-1.5 block">Description</label>
              <textarea className="input-field w-full resize-none" rows={2} value={generalSettings.siteDescription} onChange={e => setGeneralSettings(s => ({ ...s, siteDescription: e.target.value }))} />
            </div>
          </div>
          {generalSettings.maintenanceMode && (
            <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-orange-400 font-semibold text-sm">Mode maintenance actif</div>
                <div className="text-xs text-orange-300/70 mt-0.5">
                  Le site est inaccessible pour les utilisateurs normaux. Seuls les admins peuvent se connecter.
                  Désactivez ce mode dès que la maintenance est terminée.
                </div>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {[
              { key: 'maintenanceMode', label: 'Mode maintenance', desc: 'Désactive l\'accès au site pour les utilisateurs non-admin' },
              { key: 'registrationsOpen', label: 'Inscriptions ouvertes', desc: 'Permettre aux nouveaux utilisateurs de s\'inscrire' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <div className={`text-sm ${item.key === 'maintenanceMode' && generalSettings.maintenanceMode ? 'text-orange-400' : 'text-white'}`}>{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
                <button
                  onClick={() => setGeneralSettings(s => ({ ...s, [item.key]: !(s as any)[item.key] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${(generalSettings as any)[item.key] ? item.key === 'maintenanceMode' ? 'bg-orange-500' : 'bg-purple-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(generalSettings as any)[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'coins' && (
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Paramètres Coins</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'dailyBonusAmount', label: 'Bonus quotidien (Coins)', min: 1 },
              { key: 'referralBonus', label: 'Bonus parrainage (Coins)', min: 1 },
              { key: 'transferFee', label: 'Frais de transfert (Coins)', min: 0 },
              { key: 'minTransfer', label: 'Transfert minimum (Coins)', min: 1 },
              { key: 'maxTransfer', label: 'Transfert maximum (Coins)', min: 10 },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs text-gray-400 mb-1.5 block">{field.label}</label>
                <input
                  type="number"
                  min={field.min}
                  className="input-field w-full"
                  value={(coinsSettings as any)[field.key]}
                  onChange={e => setCoinsSettings(s => ({ ...s, [field.key]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Sécurité système</h3>
          <div className="space-y-4 text-sm text-gray-400">
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <div className="text-green-400 font-medium">Système sécurisé</div>
                <div className="text-xs">Authentification JWT active, mots de passe hachés bcrypt</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Authentification JWT activée',
                'Hachage bcrypt des mots de passe',
                'Rate limiting API activé',
                'CORS configuré',
                'Middleware admin en place',
                'Sessions sécurisées',
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-gray-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Notifications système</h3>
          <p className="text-xs text-gray-400 mb-4">
            Configuration des alertes et notifications automatiques de la plateforme.
          </p>
          <div className="space-y-3">
            {[
              { label: 'Alertes de paiement', desc: 'Notifier les admins lors de nouveaux paiements' },
              { label: 'Nouveaux tickets', desc: 'Alertes pour chaque nouveau ticket support' },
              { label: 'Utilisateurs bannis', desc: 'Notifier lors d\'une action de bannissement' },
              { label: 'Erreurs système', desc: 'Alertes en cas d\'erreurs critiques' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm text-white">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
                <div className="w-11 h-6 bg-purple-600 rounded-full relative cursor-pointer">
                  <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="btn-primary flex items-center gap-2"
      >
        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Sauvegarder les modifications
      </button>
    </div>
  );
}
