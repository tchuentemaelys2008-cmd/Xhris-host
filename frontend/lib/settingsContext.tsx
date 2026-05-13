'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { userApi } from './api';
import toast from 'react-hot-toast';
import frMessages from '../messages/fr.json';
import enMessages from '../messages/en.json';

type Lang = 'fr' | 'en';
type Currency = 'EUR' | 'USD' | 'XAF' | 'GBP';

const MESSAGES: Record<Lang, Record<string, string>> = {
  fr: frMessages as Record<string, string>,
  en: enMessages as Record<string, string>,
};

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', XAF: 'FCFA', GBP: '£' };

interface SettingsCtx {
  language: Lang;
  currency: string;
  theme: string;
  timezone: string;
  setLanguage: (lang: Lang) => Promise<void>;
  setCurrency: (c: string) => Promise<void>;
  setTheme: (t: string) => Promise<void>;
  setTimezone: (tz: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  formatCurrency: (amount: number) => string;
  loading: boolean;
}

const SettingsContext = createContext<SettingsCtx>({
  language: 'fr', currency: 'EUR', theme: 'dark', timezone: 'UTC',
  setLanguage: async () => {}, setCurrency: async () => {},
  setTheme: async () => {}, setTimezone: async () => {},
  t: (k, f) => f || k,
  formatCurrency: (a) => `${a}`,
  loading: false,
});

function readLS(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(`xhris_${key}`) || fallback;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [loading, setLoading] = useState(false);

  const [language, setLang] = useState<Lang>(() => readLS('language', 'fr') as Lang);
  const [currency, setCurr] = useState(() => readLS('currency', 'EUR'));
  const [theme, setThm] = useState(() => readLS('theme', 'dark'));
  const [timezone, setTz] = useState(() => readLS('timezone', 'UTC'));
  const [loaded, setLoaded] = useState(false);

  // Load from profile (only once, if localStorage not set)
  useEffect(() => {
    if (!user || loaded) return;
    userApi.getProfile().then((res: any) => {
      const p = res?.data;
      if (!p) return;
      if (!localStorage.getItem('xhris_language') && p.language) setLang(p.language as Lang);
      if (!localStorage.getItem('xhris_currency') && p.currency) setCurr(p.currency);
      if (!localStorage.getItem('xhris_theme') && p.theme) setThm(p.theme);
      if (!localStorage.getItem('xhris_timezone') && p.timezone) setTz(p.timezone);
      setLoaded(true);
    }).catch(() => { setLoaded(true); });
  }, [user?.id, loaded]);

  // Apply to DOM whenever settings change
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.setAttribute('data-theme', theme);
  }, [language, theme]);

  const saveToAPI = async (key: string, value: string) => {
    setLoading(true);
    try {
      await userApi.updateProfile({ [key]: value });
      localStorage.setItem(`xhris_${key}`, value);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur de sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const setLanguage = async (lang: Lang) => {
    setLang(lang);
    document.documentElement.lang = lang;
    await saveToAPI('language', lang);
  };

  const setCurrency = async (c: string) => {
    setCurr(c);
    await saveToAPI('currency', c);
  };

  const setTheme = async (t: string) => {
    setThm(t);
    document.documentElement.setAttribute('data-theme', t);
    await saveToAPI('theme', t);
  };

  const setTimezone = async (tz: string) => {
    setTz(tz);
    await saveToAPI('timezone', tz);
  };

  const t = (key: string, fallback?: string): string => {
    const messages = MESSAGES[language] || MESSAGES.fr;
    return messages[key] || MESSAGES.fr[key] || fallback || key;
  };

  const formatCurrency = (amount: number): string => {
    if (currency === 'XAF') return `${amount.toLocaleString('fr-FR')} FCFA`;
    try {
      return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
        style: 'currency', currency, minimumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${CURRENCY_SYMBOLS[currency] || ''}${amount}`;
    }
  };

  return (
    <SettingsContext.Provider value={{ language, currency, theme, timezone, setLanguage, setCurrency, setTheme, setTimezone, t, formatCurrency, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
