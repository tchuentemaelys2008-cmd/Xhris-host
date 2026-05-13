import axios, { AxiosInstance, AxiosError } from 'axios';

// Toujours utiliser /api (relatif) — Next.js rewrites dans next.config.mjs
// proxy vers BACKEND_URL (Railway en prod, localhost:3001 en dev).
// Ne jamais définir NEXT_PUBLIC_API_URL vers Railway : ça causerait du CORS.
const BASE_URL = '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('auth_token');
    if (!token) {
      try {
        const { getSession } = await import('next-auth/react');
        const session = await getSession();
        const accessToken = (session?.user as any)?.accessToken;
        if (accessToken) {
          token = accessToken;
          localStorage.setItem('auth_token', accessToken);
        }
      } catch {}
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/auth')) {
        return Promise.reject(error);
      }
      try {
        const { getSession } = await import('next-auth/react');
        const session = await getSession();
        if (!session) {
          localStorage.removeItem('auth_token');
          window.location.href = '/auth/login';
        }
      } catch {
        localStorage.removeItem('auth_token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// userApi
// ─────────────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => apiClient.get('/users/me'),
  updateProfile: (data: any) => apiClient.patch('/users/me', data),
  updatePassword: (oldPassword: string, newPassword: string) =>
    apiClient.patch('/users/me/password', { oldPassword, newPassword }),
  deleteAccount: (password: string) =>
    apiClient.delete('/users/me', { data: { password } }),
  getDashboardStats: () => apiClient.get('/users/me/stats'),
  getSessions: () => apiClient.get('/users/me/sessions'),
  revokeSession: (sessionId: string) =>
    apiClient.delete(`/users/me/sessions/${sessionId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// botsApi
// ─────────────────────────────────────────────────────────────────────────────
export const botsApi = {
  getAll: (params?: any) => apiClient.get('/bots', { params }),
  deploy: (data: any) => apiClient.post('/bots', data),
  start: (id: string) => apiClient.post(`/bots/${id}/start`),
  stop: (id: string) => apiClient.post(`/bots/${id}/stop`),
  restart: (id: string) => apiClient.post(`/bots/${id}/restart`),
  getLogs: (id: string, params?: any) =>
    apiClient.get(`/bots/${id}/logs`, { params }),
  delete: (id: string) => apiClient.delete(`/bots/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// serversApi
// ─────────────────────────────────────────────────────────────────────────────
export const serversApi = {
  getAll: (params?: any) => apiClient.get('/servers', { params }),
  getOne: (id: string) => apiClient.get(`/servers/${id}`),
  create: (data: any) => apiClient.post('/servers', data),
  start: (id: string) => apiClient.post(`/servers/${id}/start`),
  stop: (id: string) => apiClient.post(`/servers/${id}/stop`),
  restart: (id: string) => apiClient.post(`/servers/${id}/restart`),
  delete: (id: string) => apiClient.delete(`/servers/${id}`),
  getFiles: (id: string, filePath?: string) =>
    apiClient.get(`/servers/${id}/files`, { params: filePath ? { path: filePath } : {} }),
  getFileContent: (id: string, filePath: string) =>
    apiClient.get(`/servers/${id}/file`, { params: { path: filePath } }),
  saveFile: (id: string, filePath: string, content: string, newName?: string) =>
    apiClient.put(`/servers/${id}/file`, { path: filePath, content, ...(newName ? { newName } : {}) }),
  deleteFile: (id: string, filePath: string) =>
    apiClient.delete(`/servers/${id}/file`, { params: { path: filePath } }),
  deploy: (id: string) => apiClient.post(`/servers/${id}/deploy`),
};

// ─────────────────────────────────────────────────────────────────────────────
// marketplaceApi
// ─────────────────────────────────────────────────────────────────────────────
export const marketplaceApi = {
  getAll: (params?: any) => apiClient.get('/marketplace', { params }),
  getOne: (slug: string) => apiClient.get(`/marketplace/${slug}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// coinsApi
// ─────────────────────────────────────────────────────────────────────────────
export const coinsApi = {
  getBalance: () => apiClient.get('/coins/balance'),
  getTransactions: (params?: any) =>
    apiClient.get('/coins/transactions', { params }),
  getPacks: () => apiClient.get('/coins/packs'),
  transfer: (recipientId: string, amount: number) =>
    apiClient.post('/coins/transfer', { recipientId, amount }),
  claimDailyBonus: () => apiClient.post('/coins/daily-bonus'),
  applyBonusCode: (code: string) =>
    apiClient.post('/coins/bonus-code', { code }),
  getReferralStats: () => apiClient.get('/coins/referral'),
  getReferralLeaderboard: () => apiClient.get('/coins/referral/leaderboard'),
};

// ─────────────────────────────────────────────────────────────────────────────
// notificationsApi
// ─────────────────────────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll: (params?: any) => apiClient.get('/notifications', { params }),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// communityApi
// ─────────────────────────────────────────────────────────────────────────────
export const communityApi = {
  getChannels: () => apiClient.get('/community/channels'),
  getMessages: (channelId: string, params?: any) =>
    apiClient.get(`/community/channels/${channelId}/messages`, { params }),
  sendMessage: (channelId: string, content: string) =>
    apiClient.post(`/community/channels/${channelId}/messages`, { content }),
  getOnlineUsers: () => apiClient.get('/community/online'),
  updatePresence: () => apiClient.patch('/community/presence', {}),
};

// ─────────────────────────────────────────────────────────────────────────────
// supportApi
// ─────────────────────────────────────────────────────────────────────────────
export const supportApi = {
  getFaq: () => apiClient.get('/support/faq'),
  getArticles: (params?: any) =>
    apiClient.get('/support/articles', { params }),
  createTicket: (data: any) => apiClient.post('/support/tickets', data),
  getTickets: () => apiClient.get('/support/tickets'),
};

// ─────────────────────────────────────────────────────────────────────────────
// adminApi
// ─────────────────────────────────────────────────────────────────────────────
export const adminApi = {
  getDashboardStats: () => apiClient.get('/admin/stats'),
  getUsers: (params?: any) => apiClient.get('/admin/users', { params }),
  banUser: (id: string, reason: string) =>
    apiClient.post(`/admin/users/${id}/ban`, { reason }),
  unbanUser: (id: string) => apiClient.post(`/admin/users/${id}/unban`),
  addCoins: (id: string, amount: number, reason: string) =>
    apiClient.post(`/admin/users/${id}/coins`, { amount, reason }),
  getBots: (params?: any) => apiClient.get('/admin/bots', { params }),
  reviewBot: (id: string, status: 'approved' | 'rejected') =>
    apiClient.post(`/admin/bots/${id}/review`, { status }),
  getServers: (params?: any) => apiClient.get('/admin/servers', { params }),
  restartServer: (id: string) =>
    apiClient.post(`/admin/servers/${id}/restart`),
  getMessages: (params?: any) => apiClient.get('/admin/messages', { params }),
  replyMessage: (id: string, reply: string) =>
    apiClient.post(`/admin/messages/${id}/reply`, { content: reply }),
  getSubscriptions: (params?: any) =>
    apiClient.get('/admin/subscriptions', { params }),
};

// ─────────────────────────────────────────────────────────────────────────────
// developerApi
// ─────────────────────────────────────────────────────────────────────────────
export const developerApi = {
  getStats: () => apiClient.get('/developer/stats'),
  getPublications: (params?: any) => apiClient.get('/developer/bots', { params }),
  submitBot: (data: any) => apiClient.post('/developer/bots', data),
  updateBot: (id: string, data: any) => apiClient.patch(`/developer/bots/${id}`, data),
  deleteBot: (id: string) => apiClient.delete(`/developer/bots/${id}`),
  getEarnings: (params?: any) => apiClient.get('/developer/earnings', { params }),
  getReferrals: () => apiClient.get('/developer/referrals'),
  getLeaderboard: () => apiClient.get('/developer/leaderboard'),
};

// ─────────────────────────────────────────────────────────────────────────────
// paymentsApi
// ─────────────────────────────────────────────────────────────────────────────
export const paymentsApi = {
  createOrder: (data: { packId: string; method: string; coins: number; amount: number }) =>
    apiClient.post('/payments/order', data),
  verifyPayment: (orderId: string) => apiClient.get(`/payments/verify/${orderId}`),
  getHistory: () => apiClient.get('/payments/history'),
  getPlans: () => apiClient.get('/payments/plans'),
};

export default apiClient;
