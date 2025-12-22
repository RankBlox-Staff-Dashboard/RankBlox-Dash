import axios from 'axios';
import type { User, Stats, Infraction, Ticket, Analytics, PermissionFlag, LOARequest } from '../types';

const DEFAULT_PROD_API_URL = 'https://staffapp-9q1t.onrender.com/api';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? DEFAULT_PROD_API_URL : '/api');

export function getApiBaseUrl(): string {
  return API_URL.replace(/\/$/, '');
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Send cookies for session/refresh token rotation
  withCredentials: true,
});

// Add token to requests (backward compatibility for existing storage)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Track if we're already redirecting to prevent loops
let isRedirecting = false;
let refreshPromise: Promise<string | null> | null = null;

async function triggerRefresh(): Promise<string | null> {
  try {
    const result = await authAPI.refresh();
    const token = result.data?.token as string | undefined;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    return token || null;
  } catch (err) {
    return null;
  }
}

// Handle auth errors with silent refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const status = response?.status;

    if (status === 401 && config && !(config as any).__isRetryRequest) {
      (config as any).__isRetryRequest = true;
      if (!refreshPromise) {
        refreshPromise = triggerRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      if (newToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      }

      if (typeof window !== 'undefined' && !isRedirecting) {
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath === '/login' || 
                          currentPath.startsWith('/auth/') ||
                          currentPath === '/';
        
        if (!isAuthPage) {
          isRedirecting = true;
          localStorage.removeItem('token');
          window.location.replace('/login');
          setTimeout(() => { isRedirecting = false; }, 2000);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  getMe: () => api.get<User>('/auth/me'),
  refresh: () => api.post<{ token: string; expires_in: number }>('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

// Verification API
export const verificationAPI = {
  requestCode: () => api.post<{ emoji_code: string; expires_at: string; message: string }>('/verification/roblox/request'),
  verify: (roblox_username: string, emoji_code: string) =>
    api.post<{ 
      message: string; 
      roblox_username: string; 
      rank: number; 
      rank_name: string;
      // New token returned after successful verification
      token?: string;
    }>('/verification/roblox/verify', {
      roblox_username,
      emoji_code,
    }),
  getStatus: () => api.get<{ verified: boolean; roblox_username: string | null; rank: number | null; rank_name: string | null; status: string }>('/verification/roblox/status'),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get<Stats>('/dashboard/stats'),
  getInfractions: () => api.get<Infraction[]>('/dashboard/infractions'),
  getAnalytics: () => api.get<Analytics>('/dashboard/analytics'),
};

// LOA API
export const loaAPI = {
  getStatus: () => api.get<{ has_active_loa: boolean; loa: LOARequest | null }>('/dashboard/loa/status'),
  getRequests: () => api.get<LOARequest[]>('/dashboard/loa'),
  create: (start_date: string, end_date: string, reason: string) =>
    api.post<{ message: string; loa_id: number }>('/dashboard/loa', { start_date, end_date, reason }),
  cancel: (loaId: number) => api.delete(`/dashboard/loa/${loaId}`),
};

// Tickets API
export const ticketsAPI = {
  list: (status?: string) => api.get<Ticket[]>('/tickets', { params: { status } }),
  claim: (ticketId: number) => api.post(`/tickets/${ticketId}/claim`),
  resolve: (ticketId: number) => api.post(`/tickets/${ticketId}/resolve`),
};

// Permissions API
export const permissionsAPI = {
  getPermissions: () => api.get<{ permissions: PermissionFlag[] }>('/permissions'),
  checkPermission: (permission: PermissionFlag) => api.get<{ hasPermission: boolean; permission: string }>('/permissions/check', { params: { permission } }),
};

// Group Sync types
export interface SyncResult {
  success: boolean;
  totalUsers: number;
  updatedUsers: number;
  failedUsers: number;
  errors: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastSyncResult: SyncResult | null;
  nextScheduledSync: string | null;
}

// Management API (admin only)
export const managementAPI = {
  getUsers: () => api.get<User[]>('/management/users'),
  updateUserPermission: (userId: number, permission: PermissionFlag, granted: boolean) =>
    api.put(`/management/users/${userId}/permissions`, { permission, granted }),
  updateUserStatus: (userId: number, status: 'active' | 'inactive' | 'pending_verification') =>
    api.put(`/management/users/${userId}/status`, { status }),
  getTrackedChannels: () => api.get('/management/tracked-channels'),
  addTrackedChannel: (discord_channel_id: string, channel_name: string) =>
    api.post('/management/tracked-channels', { discord_channel_id, channel_name }),
  removeTrackedChannel: (channelId: number) => api.delete(`/management/tracked-channels/${channelId}`),
  // LOA management
  getLOARequests: (status?: string) => api.get<LOARequest[]>('/management/loa', { params: { status } }),
  reviewLOA: (loaId: number, status: 'approved' | 'denied', review_notes?: string) =>
    api.put(`/management/loa/${loaId}/review`, { status, review_notes }),
  // Infractions management
  getAllInfractions: () => api.get<Infraction[]>('/management/infractions'),
  issueInfraction: (user_id: number, reason: string, type: 'warning' | 'strike') =>
    api.post<{ message: string; infraction_id: number }>('/management/infractions', { user_id, reason, type }),
  voidInfraction: (infractionId: number) => api.put(`/management/infractions/${infractionId}/void`),
  getUserInfractions: (userId: number) => api.get<Infraction[]>(`/management/users/${userId}/infractions`),
  // Group rank sync
  getGroupSyncStatus: () => api.get<SyncStatus>('/management/group-sync/status'),
  triggerGroupSync: () => api.post<{ message: string; result: SyncResult }>('/management/group-sync'),
};

export default api;
