import axios, { AxiosInstance, AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const extractApiData = (response: any) => response?.data?.data ?? response?.data ?? response;

export const extractApiList = (response: any, key?: string): any[] => {
  const payload = extractApiData(response);
  // Si payload est déjà un tableau, le retourner directement
  if (Array.isArray(payload)) return payload;
  // Sinon chercher la clé dans l'objet
  const value = key && payload && typeof payload === 'object' ? payload[key] : payload;
  return Array.isArray(value) ? value : [];
};

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
  deploy: (data: any) => apiClient.post('/bots/deploy', data),
  start: (id: string) => apiClient.post(`/bots/${id}/start`),
  stop: (id: string) => apiClient.post(`/bots/${id}/stop`),
  restart: (id: string) => apiClient.post(`/bots/${id}/restart`),
  getLogs: (id: string, params?: any) =>
    apiClient.get(`/bots/${id}/logs`, { params }),
  delete: (id: string) => apiClient.delete(`/bots/${id}`),
  getStats: (id: string) => apiClient.get(`/bots/${id}/stats`),
  updateEnv: (id: string, vars: Record<string, string>) =>
    apiClient.patch(`/bots/${id}/env`, { vars }),
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
  getAll: (params?: any) => apiClient.get('/marketplace/bots', { params }),
  getOne: (id: string) => apiClient.get(`/marketplace/bots/${id}`),
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
  reviewBot: (id: string, status: 'approved' | 'rejected') => {
    const mapped = status === 'approved' ? 'PUBLISHED' : 'REJECTED';
    return apiClient.post(`/admin/bots/${id}/review`, { status: mapped });
  },
  getServers: (params?: any) => apiClient.get('/admin/servers', { params }),
  restartServer: (id: string) =>
    apiClient.post(`/admin/servers/${id}/restart`),
  getMessages: (params?: any) => apiClient.get('/admin/messages', { params }),
  replyMessage: (id: string, reply: string) =>
    apiClient.post(`/admin/messages/${id}/reply`, { content: reply }),
  getSubscriptions: (params?: any) =>
    apiClient.get('/admin/subscriptions', { params }),
  // Marketplace bots management
  getMarketplaceBots: (params?: any) =>
    apiClient.get('/admin/marketplace-bots', { params }),
  getMarketplaceBot: (id: string) =>
    apiClient.get(`/admin/marketplace-bots/${id}`),
  reviewMarketplaceBot: (id: string, status: 'PUBLISHED' | 'REJECTED', reason?: string) =>
    apiClient.post(`/admin/marketplace-bots/${id}/review`, { status, reason }),
  updateMarketplaceBot: (id: string, data: { sessionUrl?: string; githubUrl?: string; demoUrl?: string; coinsPerDay?: number }) =>
    apiClient.patch(`/admin/marketplace-bots/${id}`, data),
};

// ─────────────────────────────────────────────────────────────────────────────
// developerApi
// ─────────────────────────────────────────────────────────────────────────────
export const developerApi = {
  getStats: () => apiClient.get('/developer/stats'),
  getPublications: (params?: any) => apiClient.get('/developer/bots', { params }),
  submitBot: (data: any) => apiClient.post('/developer/bots', data),
  submitBotWithFile: (formData: FormData) =>
    apiClient.post('/developer/bots/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateBot: (id: string, data: any) => apiClient.patch(`/developer/bots/${id}`, data),
  deleteBot: (id: string) => apiClient.delete(`/developer/bots/${id}`),
  getEarnings: (params?: any) => apiClient.get('/developer/earnings', { params }),
  getReferrals: () => apiClient.get('/developer/referrals'),
  getLeaderboard: () => apiClient.get('/developer/leaderboard'),
  downloadConnector: () => `${typeof window !== 'undefined' ? '/api' : ''}/developer/connector/download`,
};

// ─────────────────────────────────────────────────────────────────────────────
// paymentsApi
// ─────────────────────────────────────────────────────────────────────────────
export const paymentsApi = {
  initiate: (data: any) => apiClient.post('/payments/initiate', data),
  initiateFapshi: (data: any) => apiClient.post('/payments/fapshi/initiate', data),
  verify: (reference: string) => apiClient.get(`/payments/verify/${reference}`),
  fapshiVerify: (reference: string) => apiClient.get(`/payments/fapshi/verify/${reference}`),
  withdraw: (data: any) => apiClient.post('/payments/withdraw', data),
  getWithdrawals: () => apiClient.get('/payments/withdrawals'),
};

export default apiClient;
