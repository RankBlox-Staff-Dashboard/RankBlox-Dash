import { Router, Request, Response } from 'express';
import { authenticateToken, requireVerified } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/permissions';
import { db } from '../models/database';
import { PermissionFlag } from '../utils/types';
import { updateUserPermission } from '../services/permissions';
import { isImmuneRank } from '../utils/immunity';

const router = Router();

// All management routes require full verification AND admin status
router.use(authenticateToken);
router.use(requireVerified);
router.use(requireAdmin);

/**
 * List all staff
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await db
      .prepare(
        `SELECT id, discord_id, discord_username, discord_avatar, roblox_id, roblox_username, \`rank\`, rank_name, status, created_at
         FROM users
         ORDER BY \`rank\` IS NULL, \`rank\` DESC, created_at ASC`
      )
      .all() as any[];

    res.json(users);
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

export default router;

