import { Router, Request, Response } from 'express';
import { authenticateToken, requireVerified } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/permissions';
import { db } from '../models/database';
import { PermissionFlag } from '../utils/types';
import { updateUserPermission } from '../services/permissions';
import { isImmuneRank } from '../utils/immunity';
import { performGroupSync, getSyncStatus } from '../services/groupSync';

const router = Router();

// All management routes require full verification AND admin status
router.use(authenticateToken);
router.use(requireVerified);
router.use(requireAdmin);

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
 * List all staff with current week message counts from MySQL
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    // Get current week start for quota calculation
    const weekStart = getCurrentWeekStart();
    console.log(`[Management API] Fetching users with week_start: ${weekStart}`);

    // First, let's verify the activity_logs table has data for debugging
    const testQuery = await db
      .prepare('SELECT user_id, week_start, messages_sent FROM activity_logs WHERE week_start = ? LIMIT 10')
      .all(weekStart) as any[];
    console.log(`[Management API] Activity logs for week ${weekStart}:`, JSON.stringify(testQuery, null, 2));
    
    // Also check total staff count
    const staffCount = await db
      .prepare('SELECT COUNT(*) as count FROM users WHERE `rank` IS NOT NULL')
      .get() as { count: number };
    console.log(`[Management API] Total staff members in database: ${staffCount.count}`);

    // Get first 10 staff members (same as query script approach - query each user individually)
    const staffUsers = await db
      .prepare(
        `SELECT * FROM users 
         WHERE \`rank\` IS NOT NULL
         ORDER BY \`rank\` DESC, created_at ASC
         LIMIT 10`
      )
      .all() as any[];
    
    console.log(`[Management API] Found ${staffUsers.length} staff members (limited to 10)`);

    // Use the same date format as the query script: YYYY-MM-DD 00:00:00
    const weekStartDateTime = `${weekStart} 00:00:00`;

    // For each user, get their complete information (same as query script)
    const usersWithQuota = await Promise.all(staffUsers.map(async (user) => {
      // Get current week's activity log (same as query script)
      const currentWeekActivity = await db
        .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
        .all(user.id, weekStart) as any[];
      
      // Get message count from discord_messages for current week (same as query script)
      const messageCount = await db
        .prepare('SELECT COUNT(*) as count FROM discord_messages WHERE user_id = ? AND created_at >= ?')
        .all(user.id, weekStartDateTime) as any[];
      
      // Get tickets claimed by this user (same as query script)
      const tickets = await db
        .prepare('SELECT * FROM tickets WHERE claimed_by = ?')
        .all(user.id) as any[];
      
      // Calculate values (same as query script logic)
      // Use ONLY the count from discord_messages table (source of truth)
      const messagesSentNum = messageCount?.[0]?.count ? parseInt(messageCount[0].count as any) : 0;
      const minutes = currentWeekActivity?.[0]?.minutes ? parseInt(currentWeekActivity[0].minutes as any) : 0;
      const ticketsClaimed = tickets?.length || 0;
      const ticketsResolved = tickets?.filter((t: any) => t.status === 'resolved')?.length || 0;
      
      // Use ONLY discord_messages count (source of truth, same as query script)
      const finalMessagesSent = messagesSentNum;
      
      const messagesQuota = 150;
      const quotaMet = finalMessagesSent >= messagesQuota;
      const quotaPercentage = Math.min(Math.round((finalMessagesSent / messagesQuota) * 100), 100);

      console.log(`[Management API] User: ${user.roblox_username || user.discord_username} (ID: ${user.id}):`, {
        discord_messages_count: messagesSentNum,
        final_count_used: finalMessagesSent,
        minutes: minutes,
        tickets_claimed: ticketsClaimed,
        tickets_resolved: ticketsResolved,
        quota_met: quotaMet,
        quota_percentage: quotaPercentage
      });

      // Return data in the same format as query script output
      return {
        // User table data (same as query script)
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
        
        // Current week activity (same as query script)
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

    console.log(`[Management API] Returning ${usersWithQuota.length} users with quota data`);
    
    // Verify we're only returning 10 users
    if (usersWithQuota.length > 10) {
      console.warn(`[Management API] WARNING: Returning ${usersWithQuota.length} users, but should be limited to 10!`);
    }
    
    // Log sample of what we're returning
    if (usersWithQuota.length > 0) {
      const sample = usersWithQuota[0];
      console.log(`[Management API] Sample response (first user):`, {
        id: sample.id,
        username: sample.roblox_username || sample.discord_username,
        messages_sent: sample.messages_sent,
        minutes: sample.minutes,
        tickets_claimed: sample.tickets_claimed,
        tickets_resolved: sample.tickets_resolved,
        quota_met: sample.quota_met,
        quota_percentage: sample.quota_percentage
      });
    }
    
    res.json(usersWithQuota);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Update user permissions
 */
router.put('/users/:id/permissions', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { permission, granted } = req.body;

    if (!permission || typeof granted !== 'boolean') {
      return res.status(400).json({ error: 'permission and granted are required' });
    }

    // Validate permission flag
    const validPermissions: PermissionFlag[] = [
      'VIEW_DASHBOARD',
      'VIEW_TICKETS',
      'CLAIM_TICKETS',
      'VIEW_INFRACTIONS',
      'VIEW_ALL_INFRACTIONS',
      'ISSUE_INFRACTIONS',
      'VOID_INFRACTIONS',
      'VIEW_ANALYTICS',
      'MANAGE_PERMISSIONS',
      'MANAGE_USERS',
      'MANAGE_CHANNELS',
    ];

    if (!validPermissions.includes(permission as PermissionFlag)) {
      return res.status(400).json({ error: 'Invalid permission flag' });
    }

    // Check if user exists
    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await updateUserPermission(userId, permission as PermissionFlag, granted);

    res.json({ message: 'Permission updated successfully' });
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

/**
 * Update user status
 */
router.put('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status || !['active', 'inactive', 'pending_verification'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if user exists and get their rank
    const user = await db.prepare('SELECT id, `rank` FROM users WHERE id = ?').get(userId) as { id: number; rank: number | null } | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Immune ranks (254-255) cannot have their status changed
    if (isImmuneRank(user.rank)) {
      return res.status(403).json({ error: 'Cannot modify status of immune rank users' });
    }

    await db.prepare('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?').run(
      status,
      userId
    );

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * Get tracked channels
 */
router.get('/tracked-channels', async (req: Request, res: Response) => {
  try {
    const channels = await db
      .prepare('SELECT * FROM tracked_channels ORDER BY channel_name')
      .all() as any[];

    res.json(channels);
  } catch (error) {
    console.error('Error fetching tracked channels:', error);
    res.status(500).json({ error: 'Failed to fetch tracked channels' });
  }
});

/**
 * Add tracked channel
 */
router.post('/tracked-channels', async (req: Request, res: Response) => {
  try {
    const { discord_channel_id, channel_name } = req.body;

    if (!discord_channel_id || !channel_name) {
      return res.status(400).json({ error: 'discord_channel_id and channel_name are required' });
    }

    try {
      await db.prepare(
        'INSERT INTO tracked_channels (discord_channel_id, channel_name) VALUES (?, ?)'
      ).run(discord_channel_id, channel_name);

      res.json({ message: 'Tracked channel added successfully' });
    } catch (error: any) {
      // MySQL duplicate key error
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        return res.status(400).json({ error: 'Channel already tracked' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error adding tracked channel:', error);
    res.status(500).json({ error: 'Failed to add tracked channel' });
  }
});

/**
 * Remove tracked channel
 */
router.delete('/tracked-channels/:id', async (req: Request, res: Response) => {
  try {
    const channelId = parseInt(req.params.id);

    const result = await db.prepare('DELETE FROM tracked_channels WHERE id = ?').run(channelId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tracked channel not found' });
    }

    res.json({ message: 'Tracked channel removed successfully' });
  } catch (error) {
    console.error('Error removing tracked channel:', error);
    res.status(500).json({ error: 'Failed to remove tracked channel' });
  }
});

/**
 * Get all LOA requests (admin)
 */
router.get('/loa', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    
    let query = `
      SELECT l.*, 
       u.discord_username as user_discord_username,
       u.roblox_username as user_roblox_username,
       r.discord_username as reviewed_by_username
      FROM loa_requests l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN users r ON l.reviewed_by = r.id
    `;
    
    const params: any[] = [];
    
    if (status && ['pending', 'approved', 'denied'].includes(status)) {
      query += ' WHERE l.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY l.created_at DESC';

    const loaRequests = await db.prepare(query).all(...params) as any[];

    res.json(loaRequests);
  } catch (error) {
    console.error('Error fetching LOA requests:', error);
    res.status(500).json({ error: 'Failed to fetch LOA requests' });
  }
});

/**
 * Review LOA request (approve/deny)
 */
router.put('/loa/:id/review', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const loaId = parseInt(req.params.id);
    const { status, review_notes } = req.body;

    if (!status || !['approved', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or denied.' });
    }

    // Check if LOA exists
    const loa = await db.prepare('SELECT * FROM loa_requests WHERE id = ?').get(loaId) as any;

    if (!loa) {
      return res.status(404).json({ error: 'LOA request not found' });
    }

    if (loa.status !== 'pending') {
      return res.status(400).json({ error: 'This LOA request has already been reviewed' });
    }

    await db.prepare(
      `UPDATE loa_requests 
       SET status = ?, reviewed_by = ?, review_notes = ?, updated_at = NOW() 
       WHERE id = ?`
    ).run(status, req.user.id, review_notes || null, loaId);

    res.json({ message: `LOA request ${status} successfully` });
  } catch (error) {
    console.error('Error reviewing LOA request:', error);
    res.status(500).json({ error: 'Failed to review LOA request' });
  }
});

/**
 * Get all infractions (admin)
 */
router.get('/infractions', async (req: Request, res: Response) => {
  try {
    const infractions = await db
      .prepare(
        `SELECT i.*, 
         u.discord_username as user_discord_username,
         u.roblox_username as user_roblox_username,
         ib.discord_username as issued_by_username
         FROM infractions i
         JOIN users u ON i.user_id = u.id
         LEFT JOIN users ib ON i.issued_by = ib.id
         ORDER BY i.created_at DESC`
      )
      .all() as any[];

    res.json(infractions);
  } catch (error) {
    console.error('Error fetching infractions:', error);
    res.status(500).json({ error: 'Failed to fetch infractions' });
  }
});

/**
 * Issue an infraction to a user
 */
router.post('/infractions', requirePermission('ISSUE_INFRACTIONS'), async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { user_id, reason, type } = req.body;

    if (!user_id || !reason || !type) {
      return res.status(400).json({ error: 'user_id, reason, and type are required' });
    }

    if (!['warning', 'strike'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be warning or strike.' });
    }

    // Check if target user exists and get their Discord ID and rank
    const targetUser = await db.prepare(
      'SELECT id, discord_id, discord_username, roblox_username, `rank` FROM users WHERE id = ?'
    ).get(user_id) as { id: number; discord_id: string; discord_username: string; roblox_username: string | null; rank: number | null } | undefined;

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Immune ranks (254-255) cannot receive infractions
    if (isImmuneRank(targetUser.rank)) {
      return res.status(403).json({ error: 'Cannot issue infractions to immune rank users' });
    }

    // Get issuer's name for the DM
    const issuerName = req.user.roblox_username || req.user.discord_username || 'Management';

    // Create infraction
    const result = await db.prepare(
      `INSERT INTO infractions (user_id, reason, type, issued_by) VALUES (?, ?, ?, ?)`
    ).run(user_id, reason, type, req.user.id);

    const infractionId = result.lastInsertRowid;
    const issuedAt = new Date().toISOString();

    // Send DM notification via bot
    let dmSent = false;
    let dmError: string | null = null;

    try {
      const botApiUrl = process.env.BOT_API_URL || 'http://localhost:3001';
      const botApiToken = process.env.BOT_API_TOKEN;

      const notifyResponse = await fetch(`${botApiUrl}/notify-infraction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Token': botApiToken || '',
        },
        body: JSON.stringify({
          discord_id: targetUser.discord_id,
          type: type,
          reason: reason,
          issued_by: issuerName,
          issued_at: issuedAt,
        }),
      });

      if (notifyResponse.ok) {
        const notifyResult = await notifyResponse.json() as { dm_sent?: boolean; error?: string };
        dmSent = notifyResult.dm_sent === true;
        dmError = notifyResult.error || null;
      } else {
        dmError = 'Failed to reach notification service';
      }
    } catch (notifyError: any) {
      console.error('Error sending infraction notification:', notifyError);
      dmError = notifyError.message || 'Notification service unavailable';
    }

    // Log the notification result
    console.log(`[Infraction #${infractionId}] DM ${dmSent ? 'sent' : 'not sent'} to ${targetUser.discord_username}${dmError ? ` (${dmError})` : ''}`);

    res.json({ 
      message: 'Infraction issued successfully',
      infraction_id: infractionId,
      dm_sent: dmSent,
      dm_error: dmError,
    });
  } catch (error) {
    console.error('Error issuing infraction:', error);
    res.status(500).json({ error: 'Failed to issue infraction' });
  }
});

/**
 * Void an infraction
 */
router.put('/infractions/:id/void', requirePermission('VOID_INFRACTIONS'), async (req: Request, res: Response) => {
  try {
    const infractionId = parseInt(req.params.id);

    // Check if infraction exists
    const infraction = await db.prepare('SELECT * FROM infractions WHERE id = ?').get(infractionId) as any;

    if (!infraction) {
      return res.status(404).json({ error: 'Infraction not found' });
    }

    if (infraction.voided) {
      return res.status(400).json({ error: 'Infraction is already voided' });
    }

    await db.prepare('UPDATE infractions SET voided = true WHERE id = ?').run(infractionId);

    res.json({ message: 'Infraction voided successfully' });
  } catch (error) {
    console.error('Error voiding infraction:', error);
    res.status(500).json({ error: 'Failed to void infraction' });
  }
});

/**
 * Get infractions for a specific user (admin)
 */
router.get('/users/:id/infractions', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    const infractions = await db
      .prepare(
        `SELECT i.*, 
         ib.discord_username as issued_by_username
         FROM infractions i
         LEFT JOIN users ib ON i.issued_by = ib.id
         WHERE i.user_id = ?
         ORDER BY i.created_at DESC`
      )
      .all(userId) as any[];

    res.json(infractions);
  } catch (error) {
    console.error('Error fetching user infractions:', error);
    res.status(500).json({ error: 'Failed to fetch user infractions' });
  }
});

/**
 * Get group rank sync status
 */
router.get('/group-sync/status', async (req: Request, res: Response) => {
  try {
    const status = getSyncStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

/**
 * Trigger manual group rank sync
 */
router.post('/group-sync', async (req: Request, res: Response) => {
  try {
    // Check if already syncing
    const status = getSyncStatus();
    if (status.isSyncing) {
      return res.status(409).json({ 
        error: 'Sync already in progress',
        status 
      });
    }

    // Perform sync
    const result = await performGroupSync();

    res.json({
      message: result.success ? 'Group rank sync completed successfully' : 'Group rank sync completed with errors',
      result
    });
  } catch (error: any) {
    console.error('Error performing group sync:', error);
    res.status(500).json({ error: error.message || 'Failed to perform group sync' });
  }
});

export default router;

