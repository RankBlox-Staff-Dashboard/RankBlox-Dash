import { Events, Channel, TextChannel } from 'discord.js';
import { botAPI } from '../services/api';

// Main server ID - only track tickets in this server
const MAIN_SERVER_ID = '980206068628074566';

// Categories to monitor for tickets (from main Discord server)
const TICKET_CATEGORIES = [
  '980275354704953415', // Category 1
  '993210302185345124', // Category 2
];

export const name = Events.ChannelCreate;

export async function execute(channel: Channel) {
  // Only process text channels
  if (!channel.isTextBased() || channel.isDMBased()) return;

  const textChannel = channel as TextChannel;
  
  // Only track tickets in main server
  if (textChannel.guild?.id !== MAIN_SERVER_ID) return;
  
  // Check if channel is in a monitored category
  if (!textChannel.parentId || !TICKET_CATEGORIES.includes(textChannel.parentId)) {
    return;
  }

  try {
    // Create ticket record in database
    await botAPI.createTicket(textChannel.id, undefined);
    console.log(`[TicketTracker] Auto-created ticket for channel ${textChannel.id} (${textChannel.name}) in guild ${textChannel.guild?.name || 'unknown'}`);
  } catch (error: any) {
    // If ticket already exists, that's fine (might be a duplicate event)
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log(`[TicketTracker] Ticket already exists for channel ${textChannel.id}`);
      return;
    }
    console.error(`[TicketTracker] Error creating ticket for channel ${textChannel.id}:`, error.message || error);
  }
}

