import { dbGet, dbRun } from '../utils/db-helpers';
import { PermissionFlag } from '../utils/types';
import { getUserPermissions } from '../middleware/permissions';

/**
 * Initialize default permissions for a user based on their rank
 */
export async function initializeUserPermissions(userId: number, rank: number | null): Promise<void> {
  if (rank === null) {
    return;
  }

  const isAdmin = rank >= 16 && rank <= 255;

  const defaultPermissions: PermissionFlag[] = isAdmin
    ? [
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
      ]
    : ['VIEW_DASHBOARD', 'VIEW_TICKETS', 'CLAIM_TICKETS', 'VIEW_INFRACTIONS'];

  for (const perm of defaultPermissions) {
    // Check if permission already exists
    const existing = await dbGet<{ id: number }>(
      'SELECT id FROM permissions WHERE user_id = $1 AND permission_flag = $2',
      [userId, perm]
    );

    if (!existing) {
      await dbRun(
        'INSERT INTO permissions (user_id, permission_flag, granted, overridden) VALUES ($1, $2, $3, $4)',
        [userId, perm, true, false]
      );
    }
  }
}

/**
 * Update a user's permission (override)
 */
export async function updateUserPermission(
  userId: number,
  permission: PermissionFlag,
  granted: boolean
): Promise<void> {
  const existing = await dbGet<{ id: number }>(
    'SELECT id FROM permissions WHERE user_id = $1 AND permission_flag = $2',
    [userId, permission]
  );

  if (existing) {
    await dbRun(
      'UPDATE permissions SET granted = $1, overridden = $2 WHERE user_id = $3 AND permission_flag = $4',
      [granted, true, userId, permission]
    );
  } else {
    await dbRun(
      'INSERT INTO permissions (user_id, permission_flag, granted, overridden) VALUES ($1, $2, $3, $4)',
      [userId, permission, granted, true]
    );
  }
}

/**
 * Get all permissions for a user as an array
 */
export async function getUserPermissionsArray(userId: number): Promise<PermissionFlag[]> {
  const permissions = await getUserPermissions(userId);
  return Array.from(permissions);
}

