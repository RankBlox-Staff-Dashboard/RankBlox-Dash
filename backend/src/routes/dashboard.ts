import { Router, Request, Response } from 'express';
import { authenticateToken, requireActiveStatus } from '../middleware/auth';
import { requirePermission, requireAdmin } from '../middleware/permissions';
import { dbGet, dbAll, dbRun } from '../utils/db-helpers';

const router = Router();
router.use(authenticateToken);
router.use(requireActiveStatus); // Dashboard requires active status

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
router.get('/stats', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const weekStart = getCurrentWeekStart();

    // Get or create activity log for current week
    let activityLog = await dbGet<any>(
      'SELECT * FROM activity_logs WHERE user_id = $1 AND week_start = $2',
      [req.user.id, weekStart]
    );

    if (!activityLog) {
      await dbRun(
        'INSERT INTO activity_logs (user_id, week_start, messages_sent, tickets_claimed, tickets_resolved) VALUES ($1, $2, 0, 0, 0)',
        [req.user.id, weekStart]
      );
      activityLog = {
        messages_sent: 0,
        tickets_claimed: 0,
        tickets_resolved: 0,
      };
    }

    // Get infraction count (non-voided)
    const infractionCount = await dbGet<{ count: string }>(
      'SELECT COUNT(*) as count FROM infractions WHERE user_id = $1 AND voided = false',
      [req.user.id]
    );

    res.json({
      messages_sent: activityLog.messages_sent || 0,
      messages_quota: 150,
      tickets_claimed: activityLog.tickets_claimed || 0,
      tickets_resolved: activityLog.tickets_resolved || 0,
      infractions: parseInt(infractionCount?.count || '0'),
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
router.get('/infractions', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const infractions = await dbAll<any>(
      `SELECT i.*, 
       u.discord_username as issued_by_username
       FROM infractions i
       LEFT JOIN users u ON i.issued_by = u.id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
      [req.user.id]
    );

    res.json(infractions);
  } catch (error) {
    console.error('Error fetching infractions:', error);
    res.status(500).json({ error: 'Failed to fetch infractions' });
  }
});

/**
 * Get platform analytics (admin only)
 */
router.get('/analytics', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Total active users (platform-wide, not just staff)
    // This would typically come from your main user database
    // For now, we'll return staff counts
    const totalStaff = await dbGet<{ count: string }>(
      "SELECT COUNT(*) as count FROM users WHERE status = 'active'"
    );

    const totalActiveUsers = 5442; // Placeholder - would come from main database
    const activeWorkspaces = 845; // Placeholder - would come from main database

    res.json({
      total_active_users: totalActiveUsers,
      active_workspaces: activeWorkspaces,
      total_staff: parseInt(totalStaff?.count || '0'),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
