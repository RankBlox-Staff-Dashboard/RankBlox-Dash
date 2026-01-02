import { Router, Request, Response } from 'express';
import { authenticateToken, requireVerified } from '../middleware/auth';
import { requirePermission, requireAdmin } from '../middleware/permissions';
import { db } from '../models/database';
import { getCurrentWeekStart, getCurrentWeekStartDateTime, countDiscordMessages } from '../utils/messages';

const router = Router();

/**
 * Parse and validate an ID parameter from the request
 * Returns null if invalid, otherwise returns the parsed number
 */
function parseIdParam(id: string): number | null {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

// All dashboard routes require:
// 1. Valid authentication (JWT + session)
// 2. Full verification (Discord + Roblox + active status + rank)
router.use(authenticateToken);
router.use(requireVerified);

/**
 * Get user's activity stats
 */
router.get('/stats', requirePermission('VIEW_DASHBOARD'), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const weekStart = getCurrentWeekStart();
    const weekStartDateTime = getCurrentWeekStartDateTime();

    // Count messages directly from discord_messages table (source of truth)
    const messagesSent = await countDiscordMessages(req.user.id, weekStartDateTime);

    // Get or create activity log for current week (for tickets and minutes data)
    let activityLog = await db
      .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
      .get(req.user.id, weekStart) as any;

    if (!activityLog) {
      await db.prepare(
        'INSERT INTO activity_logs (user_id, week_start, messages_sent, tickets_claimed, tickets_resolved) VALUES (?, ?, 0, 0, 0)'
      ).run(req.user.id, weekStart);
      activityLog = {
        tickets_claimed: 0,
        tickets_resolved: 0,
        minutes: 0,
      };
    }

    // Get infraction count (non-voided) - use false for PostgreSQL boolean
    const infractionCount = await db
      .prepare('SELECT COUNT(*) as count FROM infractions WHERE user_id = ? AND voided = false')
      .get(req.user.id) as { count: number };

    res.json({
      messages_sent: messagesSent, // Use count from discord_messages (source of truth)
      messages_quota: 150,
      tickets_claimed: activityLog.tickets_claimed || 0,
      tickets_resolved: activityLog.tickets_resolved || 0,
      minutes: activityLog.minutes != null ? parseInt(String(activityLog.minutes)) || 0 : 0,
      infractions: infractionCount?.count != null ? parseInt(String(infractionCount.count)) || 0 : 0,
      week_start: weekStart,
    });
  } catch (error: any) {
    console.error('[Dashboard/Stats] Error fetching stats:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Get user's Discord messages count for current week
 */
router.get('/messages/count', requirePermission('VIEW_DASHBOARD'), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const weekStart = getCurrentWeekStart();
    const weekStartDateTime = getCurrentWeekStartDateTime();

    // Count messages directly from discord_messages table (source of truth)
    const count = await countDiscordMessages(req.user.id, weekStartDateTime);

    res.json({
      user_id: req.user.id,
      messages_count: count,
      week_start: weekStart,
      week_start_datetime: weekStartDateTime,
    });
  } catch (error: any) {
    console.error('[Dashboard/Messages/Count] Error fetching messages count:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: 'Failed to fetch messages count' });
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

    // Ensure we always return an array (never undefined or null)
    res.json(infractions || []);
  } catch (error: any) {
    console.error('[Dashboard/Infractions] Error fetching infractions:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
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
      total_staff: totalStaff?.count != null ? parseInt(String(totalStaff.count)) || 0 : 0,
    });
  } catch (error: any) {
    console.error('[Dashboard/Analytics] Error fetching analytics:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * Get staff analytics with minutes and activity (admin only)
 */
router.get('/analytics/staff', requireAdmin, requirePermission('VIEW_ANALYTICS'), async (req: Request, res: Response) => {
  try {
    const weekStart = getCurrentWeekStart();

    // First, get all staff members (users with a rank)
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
          u.created_at
        FROM users u
        WHERE u.\`rank\` IS NOT NULL
        ORDER BY u.\`rank\` DESC, u.created_at ASC`
      )
      .all() as any[];

    // Get total minutes for all staff (sum across all weeks)
    const totalMinutes = await db
      .prepare(
        `SELECT 
          user_id,
          COALESCE(SUM(minutes), 0) as total_minutes
        FROM activity_logs
        GROUP BY user_id`
      )
      .all() as any[];

    // Get current week's messages_sent, tickets_claimed, and tickets_resolved for all staff
    const currentWeekActivity = await db
      .prepare(
        `SELECT 
          user_id,
          messages_sent,
          tickets_claimed,
          tickets_resolved
        FROM activity_logs
        WHERE week_start = ?`
      )
      .all(weekStart) as any[];

    // Create maps for efficient lookup
    const minutesMap = new Map();
    totalMinutes.forEach((log) => {
      minutesMap.set(log.user_id, log.total_minutes != null ? parseInt(String(log.total_minutes)) || 0 : 0);
    });

    const messagesMap = new Map();
    const ticketsClaimedMap = new Map();
    const ticketsResolvedMap = new Map();
    
    currentWeekActivity.forEach((log) => {
      messagesMap.set(log.user_id, log.messages_sent != null ? parseInt(String(log.messages_sent)) || 0 : 0);
      ticketsClaimedMap.set(log.user_id, log.tickets_claimed != null ? parseInt(String(log.tickets_claimed)) || 0 : 0);
      ticketsResolvedMap.set(log.user_id, log.tickets_resolved != null ? parseInt(String(log.tickets_resolved)) || 0 : 0);
    });

    // Format the response by combining user data with activity data
    const staffAnalytics = staff.map((member) => {
      const totalMinutes = minutesMap.get(member.id) || 0;
      const messagesSent = messagesMap.get(member.id) || 0;
      const ticketsClaimed = ticketsClaimedMap.get(member.id) || 0;
      const ticketsResolved = ticketsResolvedMap.get(member.id) || 0;
      const messagesQuota = 150;
      const quotaMet = messagesSent >= messagesQuota;
      const quotaPercentage = messagesQuota > 0 
        ? Math.min(Math.round((messagesSent / messagesQuota) * 100), 100)
        : 0;

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
        created_at: member.created_at,
        minutes: totalMinutes,
        messages_sent: messagesSent,
        messages_quota: messagesQuota,
        quota_met: quotaMet,
        quota_percentage: quotaPercentage,
        tickets_claimed: ticketsClaimed,
        tickets_resolved: ticketsResolved,
      };
    });

    // Ensure we always return an array (never undefined or null)
    res.json(staffAnalytics || []);
  } catch (error: any) {
    console.error('[Dashboard/Analytics/Staff] Error fetching staff analytics:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
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
      let timeoutId: NodeJS.Timeout | null = null;
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const botResponse = await fetch(`${botApiUrl}/server-members`, {
          headers: {
            'X-Bot-Token': botApiToken,
          },
          signal: controller.signal,
        });

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (botResponse.ok) {
          const botData = await botResponse.json() as { members?: typeof discordMembers };
          discordMembers = botData.members || [];
        } else {
          console.error(`Bot API returned ${botResponse.status} for server-members`);
          // Continue with empty array - will return empty result
        }
      } catch (fetchError: any) {
        // Always clear timeout in case of error
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
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
    res.json(nonStaffMembers || []);
  } catch (error: any) {
    console.error('[Dashboard/Analytics/NonStaff] Error fetching non-staff members:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    // Return empty array with proper status code instead of error to allow frontend to show empty state
    return res.status(200).json([]);
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
  } catch (error: any) {
    console.error('[Dashboard/LOA/Status] Error fetching LOA status:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
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

    // Ensure we always return an array (never undefined or null)
    res.json(loaRequests || []);
  } catch (error: any) {
    console.error('[Dashboard/LOA] Error fetching LOA requests:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
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

    // Validate date format
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (startDate < today) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }

    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Validate maximum range (365 days)
    const maxRangeDays = 365;
    const maxRangeMs = maxRangeDays * 24 * 60 * 60 * 1000;
    if ((endDate.getTime() - startDate.getTime()) > maxRangeMs) {
      return res.status(400).json({ error: `LOA range cannot exceed ${maxRangeDays} days` });
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
  } catch (error: any) {
    console.error('[Dashboard/LOA/Create] Error creating LOA request:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
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
    const loaId = parseIdParam(req.params.id);
    if (!loaId) {
      return res.status(400).json({ error: 'Invalid LOA ID' });
    }

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
  } catch (error: any) {
    console.error('[Dashboard/LOA/Delete] Error cancelling LOA request:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      loaId: req.params.id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: 'Failed to cancel LOA request' });
  }
});

export default router;
