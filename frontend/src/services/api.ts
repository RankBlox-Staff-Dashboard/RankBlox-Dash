import axios from 'axios';
import type { User, Stats, Infraction, Ticket, Analytics, PermissionFlag, LOARequest } from '../types';

const DEFAULT_PROD_API_URL = 'https://ahsback.zenohost.co.uk/api';

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
});

// Add token to requests
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

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle 401 errors for automatic redirect
    // 403 errors mean user is authenticated but not authorized (e.g., not verified)
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !isRedirecting) {
        // Check if we're NOT already on login-related pages to prevent loops
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath === '/login' || 
                          currentPath.startsWith('/auth/') ||
                          currentPath === '/';
        
        if (!isAuthPage) {
          isRedirecting = true;
          localStorage.removeItem('token');
          // Use replace to prevent back button issues
          window.location.replace('/login');
          
          // Reset flag after a delay (in case redirect doesn't happen)
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

// Staff Analytics type
export interface StaffAnalytics {
  id: number;
  discord_id: string;
  discord_username: string;
  discord_avatar: string | null;
  roblox_id: string | null;
  roblox_username: string | null;
  rank: number | null;
  rank_name: string | null;
  status: string;
  created_at: string;
  minutes: number;
  messages_sent: number;
  messages_quota: number;
  quota_met: boolean;
  quota_percentage: number;
}

// Non-Staff Member type
export interface NonStaffMember {
  discord_id: string;
  discord_username: string;
  discord_display_name: string;
  discord_avatar: string | null;
}

// EasyPOS Activity API
export const activityAPI = {
  getActivityData: async (robloxUserId: number): Promise<number> => {
    try {
      console.log('[Activity API] Fetching activity data for userId:', robloxUserId);
      const req = await axios.post('https://papi.easypos.lol/activity/data', {
        token: 'f4ce0b59a2b93faa733f9774e3a57f376d4108edca9252b2050661d8b36b50c5f16bd0ba45a9f22c8493a7a8a9d86f90',
        userId: robloxUserId
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const response = req.data;
      console.log('[Activity API] Response received:', response);
      
      // Extract minutes from response
      // Response structure: { success: true, data: { playtime: { total: 218, week: 218, month: 218, ... }, ... } }
      if (response && response.data && response.data.playtime) {
        // Use week playtime, fallback to total if week not available
        const minutes = response.data.playtime.week || response.data.playtime.total || 0;
        console.log('[Activity API] Extracted minutes from playtime.week:', minutes);
        return minutes;
      } else if (response && response.playtime) {
        // Handle if playtime is at root level
        const minutes = response.playtime.week || response.playtime.total || 0;
        console.log('[Activity API] Extracted minutes from playtime:', minutes);
        return minutes;
      } else if (response && typeof response.minutes === 'number') {
        return response.minutes;
      } else if (response && typeof response.activityMinutes === 'number') {
        return response.activityMinutes;
      } else if (response && typeof response.playtime === 'number') {
        return response.playtime;
      } else if (typeof response === 'number') {
        return response;
      } else {
        console.warn('[Activity API] Unexpected response format:', response);
        console.warn('[Activity API] Response keys:', response ? Object.keys(response) : 'null');
        return 0;
      }
    } catch (error: any) {
      console.error('[Activity API] Error fetching activity data:', error);
      console.error('[Activity API] Error details:', error.response?.data || error.message);
      throw error;
    }
  }
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get<Stats>('/dashboard/stats'),
  getInfractions: () => api.get<Infraction[]>('/dashboard/infractions'),
  getAnalytics: () => api.get<Analytics>('/dashboard/analytics'),
  getStaffStats: (userId: number) => api.get<Stats>(`/dashboard/stats/${userId}`),
  // IMPORTANT: Use the dashboard analytics endpoint, not management
  getStaffAnalytics: () => api.get<StaffAnalytics[]>('/dashboard/analytics/staff'),
  getNonStaffMembers: () => api.get<NonStaffMember[]>('/dashboard/analytics/non-staff'),
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
