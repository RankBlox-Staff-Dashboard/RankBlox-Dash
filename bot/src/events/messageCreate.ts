import { Events, Message } from 'discord.js';
import { botAPI } from '../services/api';

// Cache to store message counts per user per week
const messageCounts = new Map<string, number>();

// Get current week start (Monday)
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

// Get tracked channels from backend
let trackedChannels: string[] = [];
let lastChannelFetch = 0;
const CHANNEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTrackedChannels(): Promise<string[]> {
  const now = Date.now();
  if (now - lastChannelFetch < CHANNEL_CACHE_TTL && trackedChannels.length > 0) {
    return trackedChannels;
  }

  try {
    const response = await botAPI.getTrackedChannels();
    trackedChannels = response.data.map((ch: any) => ch.discord_channel_id);
    lastChannelFetch = now;
    return trackedChannels;
  } catch (error) {
    console.error('Error fetching tracked channels:', error);
    return trackedChannels; // Return cached on error
  }
}

// Debounced update function to batch updates
const pendingUpdates = new Map<string, number>();
const UPDATE_INTERVAL = 30000; // 30 seconds

setInterval(async () => {
  const updates = Array.from(pendingUpdates.entries());
  pendingUpdates.clear();

  for (const [discordId, count] of updates) {
    try {
      await botAPI.updateActivity(discordId, count);
    } catch (error) {
      console.error(`Error updating activity for user ${discordId}:`, error);
    }
  }
}, UPDATE_INTERVAL);

export const name = Events.MessageCreate;
export async function execute(message: Message) {
    // Ignore bots
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

    // Check if channel is tracked
    const channels = await getTrackedChannels();
    if (!channels.includes(message.channel.id)) return;

    // Get user's Discord ID
    const discordId = message.author.id;

    // Verify user is a staff member
    try {
      const userResponse = await botAPI.getUser(discordId);
      if (!userResponse.data || userResponse.data.status !== 'active') {
        return; // Not an active staff member, don't track
      }
    } catch (error) {
      // User not found or error, don't track
      return;
    }

    // Increment message count
    const currentCount = pendingUpdates.get(discordId) || 0;
    pendingUpdates.set(discordId, currentCount + 1);
  }

