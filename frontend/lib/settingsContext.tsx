'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { userApi } from './api';

interface SettingsContextValue {
  language: string;
  currency: string;
  theme: string;
  timezone: string;
  formatCurrency: (amount: number) => string;
  t: (fr: string, en: string) => string;
}

const SettingsContext = createContext<SettingsContextValue>({
  language: 'fr',
  currency: 'EUR',
  theme: 'dark',
  timezone: 'UTC',
  formatCurrency: (amount) => `${amount} Coins`,
  t: (fr) => fr,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('xhris_language') || 'fr';
    }
    return 'fr';
  });
  const [currency, setCurrency] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('xhris_currency') || 'EUR';
    }
    return 'EUR';
  });
  const [theme, setTheme] = useState('dark');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    if (!user) return;
    userApi.getProfile().then((res: any) => {
      const p = res?.data;
      if (!p) return;
      // Only set from profile if not already set in localStorage
      const storedLang = typeof window !== 'undefined' ? localStorage.getItem('xhris_language') : null;
      const storedCurrency = typeof window !== 'undefined' ? localStorage.getItem('xhris_currency') : null;
      if (p.language && !storedLang) setLanguage(p.language);
      if (p.currency && !storedCurrency) setCurrency(p.currency);
      if (p.theme) setTheme(p.theme);
      if (p.timezone) setTimezone(p.timezone);
    }).catch(() => {});
  }, [user?.id]);

  // Apply lang attribute to <html>
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: '€',
    USD: '$',
    XAF: 'FCFA',
    GBP: '£',
  };

  const formatCurrency = (amount: number): string => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    if (currency === 'XAF') return `${amount.toLocaleString('fr-FR')} FCFA`;
    return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: currency === 'XAF' ? 'XAF' : currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const t = (fr: string, en: string): string => {
    return language === 'en' ? en : fr;
  };

  return (
    <SettingsContext.Provider value={{ language, currency, theme, timezone, formatCurrency, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
