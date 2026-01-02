import axios from 'axios';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://rankblox-dash-backend-706270663868.europe-west1.run.app/api';
const BOT_API_TOKEN = process.env.BOT_API_TOKEN;

if (!BOT_API_TOKEN || BOT_API_TOKEN.trim().length === 0) {
  // This bot calls /api/bot/* endpoints that require a shared secret.
  // Without this, the backend will respond with 401 (or 500 if backend is also misconfigured).
  console.warn(
    'BOT_API_TOKEN is not set. Bot -> backend calls to /api/bot/* will fail until you set BOT_API_TOKEN on both the bot and backend.'
  );
}

const api = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

api.interceptors.request.use((config) => {
  if (BOT_API_TOKEN) {
    config.headers['X-Bot-Token'] = BOT_API_TOKEN;
  }
  return config;
});

// Add response error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`API Error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
    } else if (error.request) {
      console.error('API Error: No response received from server');
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export interface MessageData {
  discord_id: string;
  discord_message_id: string;
  discord_channel_id: string;
  guild_id: string;
  content_length?: number;
}

export interface InfractionNotification {
  discord_id: string;
  type: 'warning' | 'strike';
  reason: string;
  issued_by: string;
  issued_at: string;
}

export const botAPI = {
  updateActivity: (discordId: string, messagesCount: number) =>
    api.post('/bot/activity', { discord_id: discordId, messages_count: messagesCount }),

  // Record a single message
  recordMessage: (data: MessageData) =>
    api.post('/bot/message', data),

  // Record messages in batch for efficiency
  recordMessagesBatch: (messages: MessageData[]) =>
    api.post('/bot/messages/batch', { messages }),

  createTicket: (discordChannelId: string, discordMessageId?: string) =>
    api.post('/bot/tickets', {
      discord_channel_id: discordChannelId,
      discord_message_id: discordMessageId,
    }),

  closeTicket: (discordChannelId: string) =>
    api.post('/bot/tickets/close', { discord_channel_id: discordChannelId }),

  claimTicketByChannel: (discordChannelId: string, userId: number) =>
    api.post('/bot/tickets/claim-by-channel', { discord_channel_id: discordChannelId, user_id: userId }),

  getUser: (discordId: string) => api.get(`/bot/user/${discordId}`),

  getTrackedChannels: () => api.get('/bot/tracked-channels'),

  // Get user stats
  getUserStats: (discordId: string) => api.get(`/bot/user/${discordId}/stats`),

  // Send infraction notification DM
  sendInfractionNotification: (data: InfractionNotification) =>
    api.post('/bot/notify-infraction', data),

  // Get all staff with quota information (uses management endpoint which is already deployed)
  getStaffQuota: () => api.get('/management/users'),

  // Get all users from the portal (not just staff)
  getAllUsers: () => api.get('/bot/users'),
};

export default api;

