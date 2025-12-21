import { Router, Request, Response } from 'express';
import { dbGet, dbAll, dbRun } from '../utils/db-helpers';

const router = Router();

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

    if (!discord_id || typeof messages_count !== 'number') {
      return res.status(400).json({ error: 'discord_id and messages_count are required' });
    }

    // Find user by Discord ID
    const user = await dbGet<{ id: number }>(
      'SELECT id FROM users WHERE discord_id = $1',
      [discord_id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current week start
    const weekStartStr = getCurrentWeekStart();

    // Update or create activity log
    const existing = await dbGet<any>(
      'SELECT * FROM activity_logs WHERE user_id = $1 AND week_start = $2',
      [user.id, weekStartStr]
    );

    if (existing) {
      await dbRun(
        'UPDATE activity_logs SET messages_sent = $1 WHERE user_id = $2 AND week_start = $3',
        [messages_count, user.id, weekStartStr]
      );
    } else {
      await dbRun(
        'INSERT INTO activity_logs (user_id, week_start, messages_sent, tickets_claimed, tickets_resolved) VALUES ($1, $2, $3, 0, 0)',
        [user.id, weekStartStr, messages_count]
      );
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

    if (!discord_channel_id) {
      return res.status(400).json({ error: 'discord_channel_id is required' });
    }

    // Check if ticket already exists
    const existing = await dbGet<any>(
      'SELECT * FROM tickets WHERE discord_channel_id = $1',
      [discord_channel_id]
    );

    if (existing) {
      return res.status(400).json({ error: 'Ticket already exists for this channel' });
    }

    // Create ticket
    const result = await dbRun(
      'INSERT INTO tickets (discord_channel_id, discord_message_id, status) VALUES ($1, $2, $3) RETURNING id',
      [discord_channel_id, discord_message_id || null, 'open']
    );

    res.json({
      message: 'Ticket created successfully',
      ticket_id: result.rows[0].id,
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

    const user = await dbGet<any>(
      'SELECT id, discord_id, discord_username, roblox_username, rank, rank_name, status FROM users WHERE discord_id = $1',
      [discordId]
    );

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
    const channels = await dbAll<any>(
      'SELECT discord_channel_id, channel_name FROM tracked_channels'
    );

    res.json(channels);
  } catch (error) {
    console.error('Error fetching tracked channels:', error);
    res.status(500).json({ error: 'Failed to fetch tracked channels' });
  }
});

export default router;
