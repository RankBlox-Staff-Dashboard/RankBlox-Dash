import { Router, Request, Response } from 'express';
import { authenticateToken, requireVerified } from '../middleware/auth';
import { getUserPermissionsArray } from '../services/permissions';
import { PermissionFlag } from '../utils/types';

const router = Router();

// All permission routes require full verification
router.use(authenticateToken);
router.use(requireVerified);

const VALID_PERMISSIONS: PermissionFlag[] = [
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
  if (!VALID_PERMISSIONS.includes(permission as PermissionFlag)) {
    return res.status(400).json({ error: 'Invalid permission' });
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

