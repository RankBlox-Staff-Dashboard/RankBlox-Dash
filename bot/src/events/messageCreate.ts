import { Events, Message } from 'discord.js';
import { botAPI, MessageData } from '../services/api';
import { isImmuneRank } from '../utils/immunity';

// Staff server ID - track messages globally in this server
const STAFF_SERVER_ID = '1342858249694613524';
// Main server ID - track tickets in this server
const MAIN_SERVER_ID = '980206068628074566';

// Cache for user verification (to avoid hitting API for every message)
const userCache = new Map<string, { isActive: boolean; rank: number | null; cachedAt: number }>();
const USER_CACHE_TTL = 60 * 1000; // 1 minute

// Message queue for batch processing
const messageQueue: MessageData[] = [];
const BATCH_INTERVAL = 5000; // 5 seconds
const MAX_BATCH_SIZE = 50;

// Removed getTrackedChannels - now tracking globally in staff server

async function isUserAllowed(discordId: string): Promise<boolean> {
  const now = Date.now();
  const cached = userCache.get(discordId);
  
  if (cached && now - cached.cachedAt < USER_CACHE_TTL) {
    // Immune ranks (254-255) are always allowed regardless of status
    return cached.isActive || isImmuneRank(cached.rank);
  }

  try {
    const response = await botAPI.getUser(discordId);
    const isActive = response.data?.status === 'active';
    const rank = response.data?.rank ?? null;
    userCache.set(discordId, { isActive, rank, cachedAt: now });
    // Immune ranks (254-255) are always allowed regardless of status
    return isActive || isImmuneRank(rank);
  } catch (error) {
    // User not found - cache as inactive with no rank
    userCache.set(discordId, { isActive: false, rank: null, cachedAt: now });
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

// Categories to monitor for tickets
const TICKET_CATEGORIES = [
  '980275354704953415', // Category 1
  '993210302185345124', // Category 2
];

export async function execute(message: Message) {
  // Ignore bots
  if (message.author.bot) return;

  // Ignore DMs
  if (!message.guild) return;

  // Handle !claim command in ticket channels (only in main server)
  if (message.content.toLowerCase().trim() === '!claim') {
    const channel = message.channel;
    
    // Only process !claim in main server
    if (message.guild?.id !== MAIN_SERVER_ID) return;
    
    // Check if channel is in a ticket category
    if (channel.isTextBased() && !channel.isDMBased()) {
      const textChannel = channel as any;
      const parentId = textChannel.parentId;
      
      if (parentId && TICKET_CATEGORIES.includes(parentId)) {
        try {
          // Get user from backend to verify they're staff
          const discordId = message.author.id;
          const isAllowed = await isUserAllowed(discordId);
          
          if (!isAllowed) {
            await message.reply('❌ You must be an active staff member to claim tickets.');
            return;
          }

          // Get user info to find their user ID
          const userResponse = await botAPI.getUser(discordId);
          if (!userResponse.data) {
            await message.reply('❌ You are not registered in the staff system.');
            return;
          }

          // Claim ticket by channel ID using bot API
          try {
            const claimResponse = await botAPI.claimTicketByChannel(channel.id, userResponse.data.id);
            if (claimResponse.data.success) {
              await message.reply(`✅ Ticket claimed by ${message.author.username}!`);
            } else {
              await message.reply(`❌ ${claimResponse.data.error || 'Failed to claim ticket'}`);
            }
          } catch (claimError: any) {
            // If ticket doesn't exist, try to create it first
            if (claimError.response?.status === 404) {
              try {
                await botAPI.createTicket(channel.id, message.id);
                // Try claiming again
                const retryResponse = await botAPI.claimTicketByChannel(channel.id, userResponse.data.id);
                if (retryResponse.data.success) {
                  await message.reply(`✅ Ticket created and claimed by ${message.author.username}!`);
                } else {
                  await message.reply(`❌ ${retryResponse.data.error || 'Failed to claim ticket'}`);
                }
              } catch (createError: any) {
                await message.reply('❌ Failed to create or claim ticket. Please contact an administrator.');
              }
            } else {
              const errorMsg = claimError.response?.data?.error || 'Failed to claim ticket';
              await message.reply(`❌ ${errorMsg}`);
            }
          }
        } catch (error: any) {
          console.error('[TicketTracker] Error handling !claim:', error);
          await message.reply('❌ An error occurred while claiming the ticket.');
        }
        return;
      }
    }
  }

  // Track messages globally in staff server only
  if (message.guild?.id !== STAFF_SERVER_ID) return;

  const discordId = message.author.id;

  // Check if user is an active staff member (or has immune rank)
  const isAllowed = await isUserAllowed(discordId);
  if (!isAllowed) return;

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

