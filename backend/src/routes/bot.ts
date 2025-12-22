import { Router, Request, Response } from 'express';
import { db } from '../models/database';
import { requireBotAuth } from '../middleware/botAuth';

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

    // Get current week start
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const weekStartStr = monday.toISOString().split('T')[0];

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

export default router;

