import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCoins(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toString();
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...options,
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, { hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;
  return formatDate(d);
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  return Promise.resolve();
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    running: 'text-green-400',
    active: 'text-green-400',
    online: 'text-green-400',
    stopped: 'text-red-400',
    offline: 'text-red-400',
    error: 'text-red-400',
    starting: 'text-yellow-400',
    paused: 'text-yellow-400',
    maintenance: 'text-yellow-400',
    pending: 'text-blue-400',
    banned: 'text-red-400',
    inactive: 'text-gray-400',
  };
  return colors[status] || 'text-gray-400';
}

export function getStatusDot(status: string): string {
  const colors: Record<string, string> = {
    running: 'bg-green-500',
    active: 'bg-green-500',
    online: 'bg-green-500',
    stopped: 'bg-red-500',
    offline: 'bg-red-500',
    error: 'bg-red-500',
    starting: 'bg-yellow-500',
    paused: 'bg-yellow-500',
    maintenance: 'bg-yellow-500',
    pending: 'bg-blue-500',
    banned: 'bg-red-500',
    inactive: 'bg-gray-500',
  };
  return colors[status] || 'bg-gray-500';
}

export function getStatusLabel(status: string, lang = 'fr'): string {
  const labels: Record<string, string> = {
    running: 'En ligne',
    active: 'Actif',
    online: 'En ligne',
    stopped: 'Arrêté',
    offline: 'Hors ligne',
    error: 'Erreur',
    starting: 'Démarrage',
    paused: 'En pause',
    maintenance: 'Maintenance',
    pending: 'En attente',
    banned: 'Banni',
    inactive: 'Inactif',
    completed: 'Complété',
    failed: 'Échoué',
    cancelled: 'Annulé',
    revoked: 'Révoqué',
    published: 'Publié',
    draft: 'Brouillon',
    rejected: 'Rejeté',
    approved: 'Approuvé',
    expired: 'Expiré',
    disabled: 'Désactivé',
    scheduled: 'Planifié',
  };
  return labels[status] || status;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function randomColor(seed: string): string {
  const colors = ['#7C3AED', '#3B82F6', '#22C55E', '#EF4444', '#F97316', '#06B6D4', '#8B5CF6', '#10B981'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export const COIN_PACKS = [
  { id: 'pack-100', name: '100 Coins', coins: 100, price: 2.49, label: 'Idéal pour commencer' },
  { id: 'pack-250', name: '250 Coins', coins: 250, price: 4.99, label: 'Parfait pour les petits projets' },
  { id: 'pack-500', name: '500 Coins', coins: 500, price: 9.99, label: 'Le plus populaire', popular: true },
  { id: 'pack-1000', name: '1,000 Coins', coins: 1000, price: 17.99, label: 'Pour les utilisateurs réguliers' },
  { id: 'pack-2500', name: '2,500 Coins', coins: 2500, price: 39.99, label: 'Pour les pros' },
];

export const SUBSCRIPTION_PLANS = [
  { id: 'starter', name: 'Starter', price: 9.99, coins: 1000, servers: 1, support: 'standard', backups: 'daily' },
  { id: 'pro', name: 'Pro', price: 29.99, coins: 5000, servers: 5, support: 'prioritaire', backups: 'advanced' },
  { id: 'business', name: 'Business', price: 79.99, coins: 15000, servers: 15, support: 'dédié', backups: 'advanced' },
  { id: 'enterprise', name: 'Enterprise', price: 199.99, coins: 50000, servers: -1, support: '24/7 dédié', backups: 'custom' },
];
