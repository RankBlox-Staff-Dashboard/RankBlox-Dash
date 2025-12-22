import { Events, Message } from 'discord.js';
import { botAPI, MessageData } from '../services/api';

// Cache for tracked channels
let trackedChannels: string[] = [];
let lastChannelFetch = 0;
const CHANNEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for user verification (to avoid hitting API for every message)
const userCache = new Map<string, { isActive: boolean; cachedAt: number }>();
const USER_CACHE_TTL = 60 * 1000; // 1 minute

// Message queue for batch processing
const messageQueue: MessageData[] = [];
const BATCH_INTERVAL = 5000; // 5 seconds
const MAX_BATCH_SIZE = 50;

async function getTrackedChannels(): Promise<string[]> {
  const now = Date.now();
  if (now - lastChannelFetch < CHANNEL_CACHE_TTL && trackedChannels.length > 0) {
    return trackedChannels;
  }

  try {
    const response = await botAPI.getTrackedChannels();
    trackedChannels = response.data.map((ch: any) => ch.discord_channel_id);
    lastChannelFetch = now;
    console.log(`[MessageTracker] Loaded ${trackedChannels.length} tracked channels`);
    return trackedChannels;
  } catch (error) {
    console.error('[MessageTracker] Error fetching tracked channels:', error);
    return trackedChannels; // Return cached on error
  }
}

async function isUserActive(discordId: string): Promise<boolean> {
  const now = Date.now();
  const cached = userCache.get(discordId);
  
  if (cached && now - cached.cachedAt < USER_CACHE_TTL) {
    return cached.isActive;
  }

  try {
    const response = await botAPI.getUser(discordId);
    const isActive = response.data?.status === 'active';
    userCache.set(discordId, { isActive, cachedAt: now });
    return isActive;
  } catch (error) {
    // User not found - cache as inactive
    userCache.set(discordId, { isActive: false, cachedAt: now });
    return false;
  }
}

// Process message queue in batches
async function processMessageQueue() {
  if (messageQueue.length === 0) return;

  const batch = messageQueue.splice(0, MAX_BATCH_SIZE);
  
  try {
    const response = await botAPI.recordMessagesBatch(batch);
    console.log(`[MessageTracker] Recorded ${response.data.recorded} messages`);
  } catch (error: any) {
    console.error('[MessageTracker] Error recording message batch:', error.message || error);
    // Re-queue failed messages (with limit to prevent infinite growth)
    if (messageQueue.length < 500) {
      messageQueue.push(...batch);
    }
  }
}

// Set up batch processing interval
setInterval(processMessageQueue, BATCH_INTERVAL);

// Process remaining messages on shutdown
process.on('SIGINT', async () => {
  console.log('[MessageTracker] Processing remaining messages before shutdown...');
  await processMessageQueue();
  process.exit(0);
});

export const name = Events.MessageCreate;

export async function execute(message: Message) {
  // Ignore bots
  if (message.author.bot) return;

  // Ignore DMs
  if (!message.guild) return;

  // Check if channel is tracked
  const channels = await getTrackedChannels();
  if (!channels.includes(message.channel.id)) return;

  const discordId = message.author.id;

  // Check if user is an active staff member
  const isActive = await isUserActive(discordId);
  if (!isActive) return;

  // Queue message for batch processing
  messageQueue.push({
    discord_id: discordId,
    discord_message_id: message.id,
    discord_channel_id: message.channel.id,
    guild_id: message.guild.id,
    content_length: message.content.length,
  });

  // If queue is getting large, process immediately
  if (messageQueue.length >= MAX_BATCH_SIZE) {
    processMessageQueue();
  }
}

