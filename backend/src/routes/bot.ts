import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { requireBotAuth } from '../middleware/botAuth';
import { isImmuneRank } from '../utils/immunity';
import { getCurrentWeekStart, getCurrentWeekStartDateTime, countDiscordMessages } from '../utils/messages';

const router = Router();

// All bot routes require shared-secret auth
router.use(requireBotAuth);

/**
 * Bot activity endpoint - receives activity updates from Discord bot
 */
router.post('/activity', async (req: Request, res: Response) => {
  try {
    const { discord_id, messages_count } = req.body;

    if (!discord_id || typeof discord_id !== 'string' || typeof messages_count !== 'number') {
      return res.status(400).json({ error: 'discord_id and messages_count are required' });
    }
    if (!Number.isFinite(messages_count) || messages_count < 0) {
      return res.status(400).json({ error: 'messages_count must be a non-negative number' });
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
    const weekStartDateTime = getCurrentWeekStartDateTime();
    
    // Count messages for this week using shared utility
    const actualCount = await countDiscordMessages(user.id, weekStartDateTime);

    // Update or create activity log with actual count
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
    const weekStartDateTime = getCurrentWeekStartDateTime();

    for (const discordId of Object.keys(userCounts)) {
      const user = await db
        .prepare('SELECT id FROM users WHERE discord_id = ?')
        .get(discordId) as { id: number } | undefined;

      if (user) {
        // Count messages using shared utility
        const actualCount = await countDiscordMessages(user.id, weekStartDateTime);

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
    if (discord_message_id !== undefined && discord_message_id !== null && typeof discord_message_id !== 'string') {
      return res.status(400).json({ error: 'discord_message_id must be a string' });
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

/**
 * Get all staff with quota information (for inactive-staff command)
 * Uses the exact same query logic as /management/users but without LIMIT and accessible via bot auth
 */
router.get('/staff', async (req: Request, res: Response) => {
  try {
    // Get current week start for quota calculation (same as management endpoint)
    const weekStart = getCurrentWeekStart();
    const weekStartDateTime = getCurrentWeekStartDateTime();

    // Get ALL staff members (no limit, unlike management endpoint which limits to 10)
    const staffUsers = await db
      .prepare(
        `SELECT * FROM users 
         WHERE \`rank\` IS NOT NULL
         ORDER BY \`rank\` DESC, created_at ASC`
      )
      .all() as any[];

    // For each user, get their complete information (same as management endpoint)
    const usersWithQuota = await Promise.all(staffUsers.map(async (user) => {
      // Get current week's activity log (same as management endpoint)
      // Use .get() for single row queries
      const currentWeekActivity = await db
        .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
        .get(user.id, weekStart) as any;
      
      // Count messages from discord_messages table (source of truth) using shared utility
      const messagesSentNum = await countDiscordMessages(user.id, weekStartDateTime);
      
      // Get tickets claimed by this user (same as management endpoint)
      const tickets = await db
        .prepare('SELECT * FROM tickets WHERE claimed_by = ?')
        .all(user.id) as any[];
      
      // Calculate values (same as management endpoint logic)
      const minutes = currentWeekActivity?.minutes ? parseInt(currentWeekActivity.minutes as any) : 0;
      const ticketsClaimed = tickets?.length || 0;
      const ticketsResolved = tickets?.filter((t: any) => t.status === 'resolved')?.length || 0;
      
      // Use discord_messages count (source of truth, from shared utility function)
      const finalMessagesSent = messagesSentNum;
      
      const messagesQuota = 150;
      const quotaMet = finalMessagesSent >= messagesQuota;
      const quotaPercentage = Math.min(Math.round((finalMessagesSent / messagesQuota) * 100), 100);

      // Return data in the same format as management endpoint
      return {
        // User table data (same as management endpoint)
        id: user.id,
        discord_id: user.discord_id,
        discord_username: user.discord_username,
        discord_avatar: user.discord_avatar,
        roblox_id: user.roblox_id,
        roblox_username: user.roblox_username,
        rank: user.rank,
        rank_name: user.rank_name,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        
        // Current week activity (same as management endpoint)
        messages_sent: finalMessagesSent,
        messages_quota: messagesQuota,
        quota_met: quotaMet,
        quota_percentage: quotaPercentage,
        minutes: minutes,
        tickets_claimed: ticketsClaimed,
        tickets_resolved: ticketsResolved,
        week_start: weekStart,
      };
    }));

    res.json(usersWithQuota);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

/**
 * Update user minutes from Roblox game (requires bot auth)
 */
router.post('/roblox-minutes', async (req: Request, res: Response) => {
  try {
    const { roblox_id, minutes } = req.body;

    // Accept roblox_id as string or number (Roblox sends it as string)
    if (!roblox_id) {
      return res.status(400).json({ error: 'roblox_id is required' });
    }
    if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
      return res.status(400).json({ error: 'minutes must be a non-negative number' });
    }

    // Convert roblox_id to string for consistent lookup (database stores as VARCHAR)
    const robloxIdStr = String(roblox_id);
    
    console.log(`[Roblox Minutes] Looking up user with roblox_id: ${robloxIdStr} (type: ${typeof roblox_id})`);

    // Find user by Roblox ID (try both string and number formats)
    let user = await db
      .prepare('SELECT id, discord_id, roblox_username FROM users WHERE roblox_id = ?')
      .get(robloxIdStr) as { id: number; discord_id: string; roblox_username: string | null } | undefined;

    // If not found as string, try as number (in case database has it stored differently)
    if (!user && !isNaN(Number(robloxIdStr))) {
      user = await db
        .prepare('SELECT id, discord_id, roblox_username FROM users WHERE roblox_id = ?')
        .get(Number(robloxIdStr)) as { id: number; discord_id: string; roblox_username: string | null } | undefined;
    }

    if (!user) {
      console.warn(`[Roblox Minutes] User not found for roblox_id: ${robloxIdStr}`);
      return res.status(404).json({ 
        error: 'User not found',
        message: `No user found with Roblox ID: ${robloxIdStr}. Make sure the user has verified their Roblox account.`
      });
    }

    console.log(`[Roblox Minutes] Found user: ID ${user.id}, Discord: ${user.discord_id}, Roblox: ${user.roblox_username || 'N/A'}`);

    const weekStartStr = getCurrentWeekStart();

    // Update or create activity log with minutes
    const existing = await db
      .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
      .get(user.id, weekStartStr) as any;

    if (existing) {
      // Update existing log - use max to ensure minutes don't decrease
      // The Roblox script sends total session minutes, so we use max to handle
      // cases where the script might reset or send duplicate data
      const currentMinutes = parseInt(existing.minutes as any) || 0;
      const newMinutes = Math.max(currentMinutes, minutes);
      await db.prepare(
        'UPDATE activity_logs SET minutes = ? WHERE user_id = ? AND week_start = ?'
      ).run(newMinutes, user.id, weekStartStr);
      console.log(`[Roblox Minutes] Updated minutes for user ${user.id}: ${currentMinutes} -> ${newMinutes} (week: ${weekStartStr})`);
    } else {
      // Create new log with minutes
      await db.prepare(
        'INSERT INTO activity_logs (user_id, week_start, minutes) VALUES (?, ?, ?)'
      ).run(user.id, weekStartStr, minutes);
      console.log(`[Roblox Minutes] Created new activity log for user ${user.id}: ${minutes} minutes (week: ${weekStartStr})`);
    }

    res.json({ 
      message: 'Minutes updated successfully', 
      minutes: minutes,
      user_id: user.id,
      week_start: weekStartStr
    });
  } catch (error) {
    console.error('Error updating Roblox minutes:', error);
    res.status(500).json({ error: 'Failed to update minutes' });
  }
});

export default router;

