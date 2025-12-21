import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requirePermission, requireAdmin } from '../middleware/permissions';
import { db } from '../models/database';

const router = Router();
router.use(authenticateToken);

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
    let activityLog = db
      .prepare('SELECT * FROM activity_logs WHERE user_id = ? AND week_start = ?')
      .get(req.user.id, weekStart) as any;

    if (!activityLog) {
      db.prepare(
        'INSERT INTO activity_logs (user_id, week_start, messages_sent, tickets_claimed, tickets_resolved) VALUES (?, ?, 0, 0, 0)'
      ).run(req.user.id, weekStart);
      activityLog = {
        messages_sent: 0,
        tickets_claimed: 0,
        tickets_resolved: 0,
      };
    }

    // Get infraction count (non-voided)
    const infractionCount = db
      .prepare('SELECT COUNT(*) as count FROM infractions WHERE user_id = ? AND voided = 0')
      .get(req.user.id) as { count: number };

    res.json({
      messages_sent: activityLog.messages_sent || 0,
      messages_quota: 150,
      tickets_claimed: activityLog.tickets_claimed || 0,
      tickets_resolved: activityLog.tickets_resolved || 0,
      infractions: infractionCount.count || 0,
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
    const infractions = db
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
router.get('/analytics', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Total active users (platform-wide, not just staff)
    // This would typically come from your main user database
    // For now, we'll return staff counts
    const totalStaff = db
      .prepare('SELECT COUNT(*) as count FROM users WHERE status = "active"')
      .get() as { count: number };

    const totalActiveUsers = 5442; // Placeholder - would come from main database
    const activeWorkspaces = 845; // Placeholder - would come from main database

    res.json({
      total_active_users: totalActiveUsers,
      active_workspaces: activeWorkspaces,
      total_staff: totalStaff.count || 0,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;

