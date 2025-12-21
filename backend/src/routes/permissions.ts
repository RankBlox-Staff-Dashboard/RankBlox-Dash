import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getUserPermissionsArray } from '../services/permissions';

const router = Router();
router.use(authenticateToken);
// Permissions can be checked by any authenticated user (pending or active)

/**
 * Get current user's permissions
 */
router.get('/', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const permissions = await getUserPermissionsArray(req.user.id);
    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * Check specific permission
 */
router.get('/check', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const permission = req.query.permission as string;

  if (!permission) {
    return res.status(400).json({ error: 'permission query parameter is required' });
  }

  try {
    const permissions = await getUserPermissionsArray(req.user.id);
    const hasPermission = permissions.includes(permission as any);

    res.json({ hasPermission, permission });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

export default router;
