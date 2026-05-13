// ============ USER TYPES ============
export type UserRole = 'user' | 'premium' | 'developer' | 'moderator' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  coins: number;
  plan: 'free' | 'starter' | 'pro' | 'advanced' | 'elite';
  planExpiry?: string;
  avatar?: string;
  bio?: string;
  whatsapp?: string;
  location?: string;
  language?: string;
  referralCode: string;
  referredBy?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  totalSpent: number;
  createdAt: string;
  lastLogin?: string;
  xp: number;
  level: number;
  badges: string[];
}

// ============ BOT TYPES ============
export type BotStatus = 'running' | 'stopped' | 'starting' | 'error' | 'paused';
export type BotPlatform = 'whatsapp' | 'discord' | 'telegram' | 'instagram' | 'tiktok';

export interface Bot {
  id: string;
  name: string;
  description: string;
  version: string;
  platform: BotPlatform;
  status: BotStatus;
  userId: string;
  serverId?: string;
  sessionLink?: string;
  envVars: Record<string, string>;
  cpuUsage: number;
  ramUsage: number;
  storageUsage: number;
  uptime: string;
  restarts: number;
  coinsPerDay: number;
  logs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceBot {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  version: string;
  platform: BotPlatform;
  tags: string[];
  downloads: number;
  rating: number;
  reviewCount: number;
  developerId: string;
  developerName: string;
  status: 'pending' | 'published' | 'rejected' | 'draft';
  icon?: string;
  screenshots: string[];
  coinsPerDay: number;
  createdAt: string;
  updatedAt: string;
}

// ============ SERVER TYPES ============
export type ServerStatus = 'online' | 'offline' | 'starting' | 'stopping' | 'maintenance' | 'error';
export type ServerPlan = 'starter' | 'pro' | 'advanced' | 'elite';

export interface Server {
  id: string;
  name: string;
  userId: string;
  plan: ServerPlan;
  status: ServerStatus;
  domain: string;
  cpuUsage: number;
  ramUsage: number;
  storageUsed: number;
  storageTotal: number;
  uptime: string;
  coinsPerDay: number;
  location: string;
  ipAddress?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ TRANSACTION TYPES ============
export type TransactionType = 'daily_bonus' | 'deploy_bot' | 'create_server' | 'purchase' | 'transfer_sent' | 'transfer_received' | 'referral' | 'bonus_code' | 'subscription' | 'withdrawal' | 'refund';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  method?: string;
  reference?: string;
  createdAt: string;
}

// ============ COINS TYPES ============
export interface CoinPack {
  id: string;
  name: string;
  coins: number;
  price: number;
  currency: string;
  bonus?: number;
  popular?: boolean;
  bestValue?: boolean;
}

// ============ API KEY TYPES ============
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: ('read' | 'write' | 'payments' | 'admin')[];
  status: 'active' | 'revoked';
  lastUsed?: string;
  createdAt: string;
  requestCount: number;
}

// ============ WEBHOOK TYPES ============
export type WebhookEvent = 
  | 'paiement.succes' | 'paiement.echec'
  | 'abonnement.nouveau' | 'abonnement.renouvele'
  | 'utilisateur.cree' | 'utilisateur.suspendu'
  | 'retrait.demande' | 'retrait.approuve'
  | 'serveur.cree' | 'serveur.supprime'
  | 'pack.achete' | 'codepromo.utilise';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  status: 'active' | 'inactive';
  lastActivity?: string;
  lastStatus?: string;
  createdAt: string;
}

// ============ COMMUNITY TYPES ============
export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
  description?: string;
  unread?: number;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  channelId: string;
  content: string;
  attachments?: string[];
  reactions: { emoji: string; count: number; users: string[] }[];
  createdAt: string;
  editedAt?: string;
}

// ============ SUBSCRIPTION TYPES ============
export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  amount: number;
  cycle: 'weekly' | 'monthly' | 'annual';
  status: 'active' | 'pending' | 'cancelled' | 'expired';
  nextPayment: string;
  createdAt: string;
}

// ============ PROMO CODE TYPES ============
export interface PromoCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free';
  discount: number;
  usageCount: number;
  usageLimit: number;
  expiry?: string;
  status: 'active' | 'pending' | 'expired' | 'disabled';
  createdAt: string;
}

// ============ ANNOUNCEMENT TYPES ============
export interface Announcement {
  id: string;
  title: string;
  description: string;
  placement: string;
  status: 'active' | 'scheduled' | 'inactive';
  impressions: number;
  clicks: number;
  ctr: number;
  priority: 'high' | 'medium' | 'low';
  startDate: string;
  endDate: string;
  createdAt: string;
}

// ============ PAGINATION ============
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============ API RESPONSE ============
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============ DASHBOARD STATS ============
export interface DashboardStats {
  coins: number;
  coinsTodayEarned: number;
  deploymentsToday: number;
  deploymentsLimit: number;
  deploymentsReset: string;
  activeServers: number;
  activeBots: number;
  plan: string;
  planExpiry?: string;
  totalSpent: number;
  totalEarned: number;
}

export interface AdminStats {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  premiumUsers: number;
  activeServers: number;
  deployedBots: number;
  coinsCirculating: number;
  totalRevenue: number;
  revenueChange: number;
  usersChange: number;
  serversChange: number;
  botsChange: number;
}
