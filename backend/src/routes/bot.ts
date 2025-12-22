import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { requireBotAuth } from '../middleware/botAuth';
import { isImmuneRank } from '../utils/immunity';
import { botRateLimit } from '../middleware/rateLimits';
import { isValidDiscordId, parsePositiveInt, logSecurityEvent, getClientIp } from '../utils/security';

const router = Router();

// All bot routes require shared-secret auth and rate limiting
router.use(requireBotAuth);
router.use(botRateLimit);

/**
 * Get current week start (Monday)
 */
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

/**
 * Bot activity endpoint - receives activity updates from Discord bot
 */
router.post('/activity', async (req: Request, res: Response) => {
  try {
    const { discord_id, messages_count } = req.body;

    if (!discord_id || typeof discord_id !== 'string' || typeof messages_count !== 'number') {
      return res.status(400).json({ error: 'discord_id and messages_count are required' });
    }
    
    // Validate Discord ID format
    if (!isValidDiscordId(discord_id)) {
      return res.status(400).json({ error: 'Invalid discord_id format' });
    }
    
    if (!Number.isFinite(messages_count) || messages_count < 0 || messages_count > 1000000) {
      return res.status(400).json({ error: 'messages_count must be a non-negative number within reasonable bounds' });
    }

    // Find user by Discord ID
    const user = await db
      .prepare('SELECT id FROM users WHERE discord_id = ?')
      .get(discord_id) as { id: number } | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const weekStartStr = getCurrentWeekStart();

    // Update or create activity log
    const existing = await db
      .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
      .get(user.id, weekStartStr) as any;

    if (existing) {
      await db.prepare(
        'UPDATE activity_logs SET messages_sent = ? WHERE user_id = ? AND week_start = ?'
      ).run(messages_count, user.id, weekStartStr);
    } else {
      await db.prepare(
        'INSERT INTO activity_logs (user_id, week_start, messages_sent) VALUES (?, ?, ?)'
      ).run(user.id, weekStartStr, messages_count);
    }

    res.json({ message: 'Activity updated successfully' });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

/**
 * Record a single Discord message (for accurate tracking)
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { discord_id, discord_message_id, discord_channel_id, guild_id, content_length } = req.body;

    if (!discord_id || !discord_message_id || !discord_channel_id || !guild_id) {
      return res.status(400).json({ error: 'discord_id, discord_message_id, discord_channel_id, and guild_id are required' });
    }

    // Validate all Discord snowflake IDs
    if (!isValidDiscordId(discord_id) || !isValidDiscordId(discord_message_id) || 
        !isValidDiscordId(discord_channel_id) || !isValidDiscordId(guild_id)) {
      return res.status(400).json({ error: 'Invalid Discord ID format' });
    }
    
    // Validate content_length if provided
    if (content_length !== undefined && (typeof content_length !== 'number' || content_length < 0 || content_length > 4000)) {
      return res.status(400).json({ error: 'Invalid content_length' });
    }

    // Find user by Discord ID
    const user = await db
      .prepare('SELECT id, status, `rank` FROM users WHERE discord_id = ?')
      .get(discord_id) as { id: number; status: string; rank: number | null } | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Immune ranks (254-255) bypass status restrictions
    if (user.status !== 'active' && !isImmuneRank(user.rank)) {
      return res.status(403).json({ error: 'User is not active' });
    }

    // Insert message record (ignore duplicates)
    try {
      await db.prepare(
        `INSERT INTO discord_messages (discord_message_id, user_id, discord_channel_id, guild_id, content_length) 
         VALUES (?, ?, ?, ?, ?)`
      ).run(discord_message_id, user.id, discord_channel_id, guild_id, content_length || 0);
    } catch (err: any) {
      // Ignore duplicate key errors
      if (err.code !== 'ER_DUP_ENTRY' && err.errno !== 1062) {
        throw err;
      }
    }

    // Update weekly activity log
    const weekStartStr = getCurrentWeekStart();
    
    // Count messages for this week
    const weekStart = new Date(weekStartStr);
    const messageCount = await db
      .prepare(
        `SELECT COUNT(*) as count FROM discord_messages 
         WHERE user_id = ? AND created_at >= ?`
      )
      .get(user.id, weekStart.toISOString()) as { count: number };

    // Update or create activity log with actual count
    const existing = await db
      .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
      .get(user.id, weekStartStr) as any;

    const actualCount = parseInt(messageCount.count as any) || 0;

    if (existing) {
      await db.prepare(
        'UPDATE activity_logs SET messages_sent = ? WHERE user_id = ? AND week_start = ?'
      ).run(actualCount, user.id, weekStartStr);
    } else {
      await db.prepare(
        'INSERT INTO activity_logs (user_id, week_start, messages_sent) VALUES (?, ?, ?)'
      ).run(user.id, weekStartStr, actualCount);
    }

    res.json({ message: 'Message recorded successfully', weekly_count: actualCount });
  } catch (error) {
    console.error('Error recording message:', error);
    res.status(500).json({ error: 'Failed to record message' });
  }
});

/**
 * Batch record messages (for efficiency)
 */
router.post('/messages/batch', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    if (messages.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 messages per batch' });
    }
    
    // Validate each message has valid Discord IDs
    for (const msg of messages) {
      if (!msg.discord_id || !msg.discord_message_id || !msg.discord_channel_id || !msg.guild_id) {
        continue; // Skip invalid entries silently
      }
      if (!isValidDiscordId(msg.discord_id) || !isValidDiscordId(msg.discord_message_id) ||
          !isValidDiscordId(msg.discord_channel_id) || !isValidDiscordId(msg.guild_id)) {
        return res.status(400).json({ error: 'Invalid Discord ID format in batch' });
      }
    }

    let recorded = 0;
    const userCounts: Record<string, number> = {};

    for (const msg of messages) {
      const { discord_id, discord_message_id, discord_channel_id, guild_id, content_length } = msg;

      if (!discord_id || !discord_message_id || !discord_channel_id || !guild_id) {
        continue;
      }

      // Find user
      const user = await db
        .prepare('SELECT id, status, `rank` FROM users WHERE discord_id = ?')
        .get(discord_id) as { id: number; status: string; rank: number | null } | undefined;

      // Immune ranks (254-255) bypass status restrictions
      if (!user || (user.status !== 'active' && !isImmuneRank(user.rank))) {
        continue;
      }

      try {
        await db.prepare(
          `INSERT INTO discord_messages (discord_message_id, user_id, discord_channel_id, guild_id, content_length) 
           VALUES (?, ?, ?, ?, ?)`
        ).run(discord_message_id, user.id, discord_channel_id, guild_id, content_length || 0);
        recorded++;
        userCounts[discord_id] = (userCounts[discord_id] || 0) + 1;
      } catch (err: any) {
        // Ignore duplicate key errors
        if (err.code !== 'ER_DUP_ENTRY' && err.errno !== 1062) {
          console.error('Error inserting message:', err);
        }
      }
    }

    // Update activity logs for all affected users
    const weekStartStr = getCurrentWeekStart();
    const weekStart = new Date(weekStartStr);

    for (const discordId of Object.keys(userCounts)) {
      const user = await db
        .prepare('SELECT id FROM users WHERE discord_id = ?')
        .get(discordId) as { id: number } | undefined;

      if (user) {
        const messageCount = await db
          .prepare(
            `SELECT COUNT(*) as count FROM discord_messages 
             WHERE user_id = ? AND created_at >= ?`
          )
          .get(user.id, weekStart.toISOString()) as { count: number };

        const actualCount = parseInt(messageCount.count as any) || 0;

        const existing = await db
          .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
          .get(user.id, weekStartStr) as any;

        if (existing) {
          await db.prepare(
            'UPDATE activity_logs SET messages_sent = ? WHERE user_id = ? AND week_start = ?'
          ).run(actualCount, user.id, weekStartStr);
        } else {
          await db.prepare(
            'INSERT INTO activity_logs (user_id, week_start, messages_sent) VALUES (?, ?, ?)'
          ).run(user.id, weekStartStr, actualCount);
        }
      }
    }

    res.json({ message: 'Messages recorded successfully', recorded });
  } catch (error) {
    console.error('Error recording messages:', error);
    res.status(500).json({ error: 'Failed to record messages' });
  }
});

/**
 * Bot ticket creation endpoint
 */
router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const { discord_channel_id, discord_message_id } = req.body;

    if (!discord_channel_id || typeof discord_channel_id !== 'string') {
      return res.status(400).json({ error: 'discord_channel_id is required' });
    }
    
    // Validate Discord channel ID format
    if (!isValidDiscordId(discord_channel_id)) {
      return res.status(400).json({ error: 'Invalid discord_channel_id format' });
    }
    
    if (discord_message_id !== undefined && discord_message_id !== null) {
      if (typeof discord_message_id !== 'string' || !isValidDiscordId(discord_message_id)) {
        return res.status(400).json({ error: 'Invalid discord_message_id format' });
      }
    }

    // Check if ticket already exists
    const existing = await db
      .prepare('SELECT * FROM tickets WHERE discord_channel_id = ?')
      .get(discord_channel_id) as any;

    if (existing) {
      return res.status(400).json({ error: 'Ticket already exists for this channel' });
    }

    // Create ticket
    const result = await db
      .prepare(
        'INSERT INTO tickets (discord_channel_id, discord_message_id, status) VALUES (?, ?, ?)'
      )
      .run(discord_channel_id, discord_message_id || null, 'open');

    res.json({
      message: 'Ticket created successfully',
      ticket_id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

/**
 * Bot ticket close endpoint
 */
router.post('/tickets/close', async (req: Request, res: Response) => {
  try {
    const { discord_channel_id } = req.body;

    if (!discord_channel_id || typeof discord_channel_id !== 'string') {
      return res.status(400).json({ error: 'discord_channel_id is required' });
    }
    
    // Validate Discord channel ID format
    if (!isValidDiscordId(discord_channel_id)) {
      return res.status(400).json({ error: 'Invalid discord_channel_id format' });
    }

    // Find and close the ticket
    const ticket = await db
      .prepare('SELECT * FROM tickets WHERE discord_channel_id = ?')
      .get(discord_channel_id) as any;

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Ticket is already closed' });
    }

    await db
      .prepare("UPDATE tickets SET status = 'closed' WHERE id = ?")
      .run(ticket.id);

    res.json({
      message: 'Ticket closed successfully',
      ticket_id: ticket.id,
    });
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

/**
 * Get user by Discord ID (for bot to check permissions)
 */
router.get('/user/:discord_id', async (req: Request, res: Response) => {
  try {
    const discordId = req.params.discord_id;
    if (!discordId || typeof discordId !== 'string') {
      return res.status(400).json({ error: 'discord_id is required' });
    }
    
    // Validate Discord ID format
    if (!isValidDiscordId(discordId)) {
      return res.status(400).json({ error: 'Invalid discord_id format' });
    }

    const user = await db
      .prepare(
        'SELECT id, discord_id, discord_username, roblox_username, `rank`, rank_name, status FROM users WHERE discord_id = ?'
      )
      .get(discordId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * Get tracked channels (for bot to know which channels to monitor)
 */
router.get('/tracked-channels', async (req: Request, res: Response) => {
  try {
    const channels = await db
      .prepare('SELECT discord_channel_id, channel_name FROM tracked_channels')
      .all() as any[];

    res.json(channels);
  } catch (error) {
    console.error('Error fetching tracked channels:', error);
    res.status(500).json({ error: 'Failed to fetch tracked channels' });
  }
});

export default router;

