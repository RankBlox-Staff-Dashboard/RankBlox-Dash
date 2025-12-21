import axios from 'axios';
import type { User, Stats, Infraction, Ticket, Analytics, PermissionFlag } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
    api.post<{ message: string; roblox_username: string; rank: number; rank_name: string }>('/verification/roblox/verify', {
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
};

export default api;

