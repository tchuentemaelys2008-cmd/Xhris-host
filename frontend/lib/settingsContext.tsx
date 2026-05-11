'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { userApi } from './api';
import toast from 'react-hot-toast';

interface Settings {
  theme: 'dark' | 'light';
  language: 'fr' | 'en';
  timezone: string;
  currency: string;
}

interface SettingsCtx {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  loading: boolean;
  formatCurrency: (amount: number) => string;
  t: (fr: string, en: string) => string;
}

const defaultSettings: Settings = {
  theme: 'dark',
  language: 'fr',
  timezone: 'UTC',
  currency: 'EUR',
};

const SettingsContext = createContext<SettingsCtx>({
  settings: defaultSettings,
  updateSetting: async () => {},
  loading: false,
  formatCurrency: (a) => `${a}`,
  t: (fr) => fr,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === 'undefined') return defaultSettings;
    return {
      theme: (localStorage.getItem('xhris_theme') as any) || 'dark',
      language: (localStorage.getItem('xhris_language') as any) || 'fr',
      timezone: localStorage.getItem('xhris_timezone') || 'UTC',
      currency: localStorage.getItem('xhris_currency') || 'EUR',
    };
  });
  const [loading, setLoading] = useState(false);

  // Load from profile on mount
  useEffect(() => {
    if (!user) return;
    userApi.getProfile().then((res: any) => {
      const p = res?.data;
      if (!p) return;
      const update: Partial<Settings> = {};
      if (p.language && !localStorage.getItem('xhris_language')) update.language = p.language;
      if (p.currency && !localStorage.getItem('xhris_currency')) update.currency = p.currency;
      if (p.theme && !localStorage.getItem('xhris_theme')) update.theme = p.theme;
      if (p.timezone && !localStorage.getItem('xhris_timezone')) update.timezone = p.timezone;
      if (Object.keys(update).length > 0) setSettings(s => ({ ...s, ...update }));
    }).catch(() => {});
  }, [user?.id]);

  // Apply theme and language to DOM
  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.language, settings.theme]);

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const prev = settings[key];
    setSettings(s => ({ ...s, [key]: value }));
    localStorage.setItem(`xhris_${key}`, value as string);
    if (key === 'theme') document.documentElement.setAttribute('data-theme', value as string);
    if (key === 'language') document.documentElement.lang = value as string;

    setLoading(true);
    try {
      await userApi.updateProfile({ [key]: value });
    } catch (err: any) {
      setSettings(s => ({ ...s, [key]: prev }));
      localStorage.setItem(`xhris_${key}`, prev as string);
      toast.error(err?.response?.data?.message || 'Erreur de sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', XAF: 'FCFA', GBP: '£' };

  const formatCurrency = (amount: number): string => {
    if (settings.currency === 'XAF') return `${amount.toLocaleString('fr-FR')} FCFA`;
    try {
      return new Intl.NumberFormat(settings.language === 'fr' ? 'fr-FR' : 'en-US', {
        style: 'currency',
        currency: settings.currency,
        minimumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${CURRENCY_SYMBOLS[settings.currency] || settings.currency}${amount}`;
    }
  };

  const t = (fr: string, en: string): string => settings.language === 'en' ? en : fr;

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loading, formatCurrency, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
