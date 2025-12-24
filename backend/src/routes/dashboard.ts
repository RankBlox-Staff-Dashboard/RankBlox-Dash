import { Router, Request, Response } from 'express';
import { authenticateToken, requireVerified } from '../middleware/auth';
import { requirePermission, requireAdmin } from '../middleware/permissions';
import { db } from '../models/database';

const router = Router();

// All dashboard routes require:
// 1. Valid authentication (JWT + session)
// 2. Full verification (Discord + Roblox + active status + rank)
router.use(authenticateToken);
router.use(requireVerified);

/**
 * Get current week start (Monday)
 */
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

/**
 * Get user's activity stats
 */
router.get('/stats', requirePermission('VIEW_DASHBOARD'), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const weekStart = getCurrentWeekStart();

    // Get or create activity log for current week
    let activityLog = await db
      .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
      .get(req.user.id, weekStart) as any;

    if (!activityLog) {
      await db.prepare(
        'INSERT INTO activity_logs (user_id, week_start, messages_sent, tickets_claimed, tickets_resolved) VALUES (?, ?, 0, 0, 0)'
      ).run(req.user.id, weekStart);
      activityLog = {
        messages_sent: 0,
        tickets_claimed: 0,
        tickets_resolved: 0,
      };
    }

    // Get infraction count (non-voided) - use false for PostgreSQL boolean
    const infractionCount = await db
      .prepare('SELECT COUNT(*) as count FROM infractions WHERE user_id = ? AND voided = false')
      .get(req.user.id) as { count: number };

    res.json({
      messages_sent: activityLog.messages_sent || 0,
      messages_quota: 150,
      tickets_claimed: activityLog.tickets_claimed || 0,
      tickets_resolved: activityLog.tickets_resolved || 0,
      infractions: parseInt(infractionCount.count as any) || 0,
      week_start: weekStart,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Get user's infractions
 */
router.get('/infractions', requirePermission('VIEW_INFRACTIONS'), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const infractions = await db
      .prepare(
        `SELECT i.*, 
         u.discord_username as issued_by_username
         FROM infractions i
         LEFT JOIN users u ON i.issued_by = u.id
         WHERE i.user_id = ?
         ORDER BY i.created_at DESC`
      )
      .all(req.user.id) as any[];

    res.json(infractions);
  } catch (error) {
    console.error('Error fetching infractions:', error);
    res.status(500).json({ error: 'Failed to fetch infractions' });
  }
});

/**
 * Get platform analytics (admin only)
 */
router.get('/analytics', requireAdmin, requirePermission('VIEW_ANALYTICS'), async (req: Request, res: Response) => {
  try {
    // Total active users (platform-wide, not just staff)
    // This would typically come from your main user database
    // For now, we'll return staff counts
    // Use single quotes for PostgreSQL string literals
    const totalStaff = await db
      .prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'")
      .get() as { count: number };

    const totalActiveUsers = 5442; // Placeholder - would come from main database
    const activeWorkspaces = 845; // Placeholder - would come from main database

    res.json({
      total_active_users: totalActiveUsers,
      active_workspaces: activeWorkspaces,
      total_staff: parseInt(totalStaff.count as any) || 0,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * Get staff analytics with minutes and activity (admin only)
 */
router.get('/analytics/staff', requireAdmin, requirePermission('VIEW_ANALYTICS'), async (req: Request, res: Response) => {
  try {
    const weekStart = getCurrentWeekStart();

    // Get all staff (not just active) with their current week activity
    const staff = await db
      .prepare(
        `SELECT 
          u.id,
          u.discord_id,
          u.discord_username,
          u.discord_avatar,
          u.roblox_id,
          u.roblox_username,
          u.\`rank\`,
          u.rank_name,
          u.status,
          COALESCE(SUM(al.minutes), 0) as total_minutes,
          COALESCE(MAX(CASE WHEN al.week_start = ? THEN al.messages_sent END), 0) as messages_sent,
          150 as messages_quota
        FROM users u
        LEFT JOIN activity_logs al ON u.id = al.user_id
        GROUP BY u.id, u.discord_id, u.discord_username, u.discord_avatar, u.roblox_id, u.roblox_username, u.\`rank\`, u.rank_name, u.status
        ORDER BY u.\`rank\` IS NULL, u.\`rank\` DESC, u.created_at ASC`
      )
      .all(weekStart) as any[];

    // Format the response
    const staffAnalytics = staff.map((member) => {
      const messagesSent = parseInt(member.messages_sent as any) || 0;
      const messagesQuota = 150;
      const quotaMet = messagesSent >= messagesQuota;
      const quotaPercentage = Math.min((messagesSent / messagesQuota) * 100, 100);

      return {
        id: member.id,
        discord_id: member.discord_id,
        discord_username: member.discord_username,
        discord_avatar: member.discord_avatar,
        roblox_id: member.roblox_id,
        roblox_username: member.roblox_username,
        rank: member.rank,
        rank_name: member.rank_name,
        status: member.status,
        minutes: parseInt(member.total_minutes as any) || 0,
        messages_sent: messagesSent,
        messages_quota: messagesQuota,
        quota_met: quotaMet,
        quota_percentage: quotaPercentage,
      };
    });

    res.json(staffAnalytics);
  } catch (error) {
    console.error('Error fetching staff analytics:', error);
    res.status(500).json({ error: 'Failed to fetch staff analytics' });
  }
});

/**
 * Get Discord server members who aren't in the staff portal (admin only)
 */
router.get('/analytics/non-staff', requireAdmin, requirePermission('VIEW_ANALYTICS'), async (req: Request, res: Response) => {
  try {
    // Get all Discord server members from bot
    const botApiUrl = process.env.BOT_API_URL || 'http://localhost:3001';
    const botApiToken = process.env.BOT_API_TOKEN;

    let discordMembers: Array<{
      discord_id: string;
      discord_username: string;
      discord_display_name: string;
      discord_avatar: string | null;
      bot: boolean;
    }> = [];

    // Try to fetch from bot API
    if (botApiToken && botApiUrl) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const botResponse = await fetch(`${botApiUrl}/server-members`, {
          headers: {
            'X-Bot-Token': botApiToken,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (botResponse.ok) {
          const botData = await botResponse.json() as { members?: typeof discordMembers };
          discordMembers = botData.members || [];
        } else {
          console.error(`Bot API returned ${botResponse.status} for server-members`);
          // Continue with empty array - will return empty result
        }
      } catch (fetchError: any) {
        // Handle timeout or network errors gracefully
        if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError' || fetchError.message?.includes('aborted')) {
          console.error('Bot API request timed out or was aborted');
        } else {
          console.error('Error calling bot API:', fetchError.message || fetchError);
        }
        // Continue with empty array - will return empty result
      }
    } else {
      console.warn('BOT_API_URL or BOT_API_TOKEN not configured - cannot fetch Discord members');
    }

    // Get all staff members from database
    const staffMembers = await db
      .prepare('SELECT discord_id FROM users')
      .all() as { discord_id: string }[];

    const staffDiscordIds = new Set(staffMembers.map(m => m.discord_id));

    // Find members who are in Discord but not in staff portal
    // Note: Bot endpoint already filters out bots, but we check again for safety
    const nonStaffMembers = discordMembers
      .filter(member => !member.bot && !staffDiscordIds.has(member.discord_id))
      .map(member => ({
        discord_id: member.discord_id,
        discord_username: member.discord_username,
        discord_display_name: member.discord_display_name,
        discord_avatar: member.discord_avatar,
      }))
      .sort((a, b) => a.discord_username.localeCompare(b.discord_username)); // Sort alphabetically

    // Always return array, even if empty (frontend handles empty state)
    res.json(nonStaffMembers);
  } catch (error) {
    console.error('Error fetching non-staff members:', error);
    // Return empty array instead of error to allow frontend to show empty state
    res.json([]);
  }
});

/**
 * Get current LOA status for user
 */
router.get('/loa/status', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Get active or pending LOA
    const activeLoa = await db
      .prepare(
        `SELECT * FROM loa_requests 
         WHERE user_id = ? 
         AND (status = 'pending' OR (status = 'approved' AND end_date >= CURDATE()))
         ORDER BY created_at DESC 
         LIMIT 1`
      )
      .get(req.user.id) as any;

    res.json({
      has_active_loa: !!activeLoa,
      loa: activeLoa || null,
    });
  } catch (error) {
    console.error('Error fetching LOA status:', error);
    res.status(500).json({ error: 'Failed to fetch LOA status' });
  }
});

/**
 * Get all LOA requests for user
 */
router.get('/loa', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const loaRequests = await db
      .prepare(
        `SELECT l.*, 
         u.discord_username as reviewed_by_username
         FROM loa_requests l
         LEFT JOIN users u ON l.reviewed_by = u.id
         WHERE l.user_id = ?
         ORDER BY l.created_at DESC`
      )
      .all(req.user.id) as any[];

    res.json(loaRequests);
  } catch (error) {
    console.error('Error fetching LOA requests:', error);
    res.status(500).json({ error: 'Failed to fetch LOA requests' });
  }
});

/**
 * Create a new LOA request
 */
router.post('/loa', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { start_date, end_date, reason } = req.body;

    if (!start_date || !end_date || !reason) {
      return res.status(400).json({ error: 'start_date, end_date, and reason are required' });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }

    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Check for existing pending or active LOA
    const existingLoa = await db
      .prepare(
        `SELECT id FROM loa_requests 
         WHERE user_id = ? 
         AND (status = 'pending' OR (status = 'approved' AND end_date >= CURDATE()))`
      )
      .get(req.user.id) as any;

    if (existingLoa) {
      return res.status(400).json({ error: 'You already have a pending or active LOA request' });
    }

    // Create LOA request
    const result = await db
      .prepare(
        `INSERT INTO loa_requests (user_id, start_date, end_date, reason, status) 
         VALUES (?, ?, ?, ?, 'pending')`
      )
      .run(req.user.id, start_date, end_date, reason);

    res.json({ 
      message: 'LOA request submitted successfully',
      loa_id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Error creating LOA request:', error);
    res.status(500).json({ error: 'Failed to create LOA request' });
  }
});

/**
 * Cancel a pending LOA request
 */
router.delete('/loa/:id', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const loaId = parseInt(req.params.id);

    // Check if LOA exists and belongs to user
    const loa = await db
      .prepare('SELECT * FROM loa_requests WHERE id = ? AND user_id = ?')
      .get(loaId, req.user.id) as any;

    if (!loa) {
      return res.status(404).json({ error: 'LOA request not found' });
    }

    if (loa.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending LOA requests can be cancelled' });
    }

    await db.prepare('DELETE FROM loa_requests WHERE id = ?').run(loaId);

    res.json({ message: 'LOA request cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling LOA request:', error);
    res.status(500).json({ error: 'Failed to cancel LOA request' });
  }
});

export default router;

