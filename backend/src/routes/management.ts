import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/permissions';
import { dbGet, dbAll, dbRun } from '../utils/db-helpers';
import { PermissionFlag } from '../utils/types';
import { updateUserPermission } from '../services/permissions';

const router = Router();
router.use(authenticateToken);
router.use(requireAdmin); // All management routes require admin

/**
 * List all staff
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await dbAll<any>(
      `SELECT id, discord_id, discord_username, roblox_username, rank, rank_name, status, created_at
       FROM users
       ORDER BY rank DESC NULLS LAST, created_at ASC`
    );

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
    const user = await dbGet<{ id: number }>('SELECT id FROM users WHERE id = $1', [userId]);
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

    // Check if user exists
    const user = await dbGet<{ id: number }>('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await dbRun('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [
      status,
      userId
    ]);

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
    const channels = await dbAll<any>(
      'SELECT * FROM tracked_channels ORDER BY channel_name'
    );

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
      await dbRun(
        'INSERT INTO tracked_channels (discord_channel_id, channel_name) VALUES ($1, $2)',
        [discord_channel_id, channel_name]
      );

      res.json({ message: 'Tracked channel added successfully' });
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
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

    const result = await dbRun('DELETE FROM tracked_channels WHERE id = $1', [channelId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tracked channel not found' });
    }

    res.json({ message: 'Tracked channel removed successfully' });
  } catch (error) {
    console.error('Error removing tracked channel:', error);
    res.status(500).json({ error: 'Failed to remove tracked channel' });
  }
});

export default router;
