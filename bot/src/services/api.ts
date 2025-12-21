import axios from 'axios';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const botAPI = {
  updateActivity: (discordId: string, messagesCount: number) =>
    api.post('/bot/activity', { discord_id: discordId, messages_count: messagesCount }),

  createTicket: (discordChannelId: string, discordMessageId?: string) =>
    api.post('/bot/tickets', {
      discord_channel_id: discordChannelId,
      discord_message_id: discordMessageId,
    }),

  getUser: (discordId: string) => api.get(`/bot/user/${discordId}`),

  getTrackedChannels: () => api.get('/bot/tracked-channels'),
};

export default api;

