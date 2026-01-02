import { db } from '../models/database';
import { PermissionFlag } from '../utils/types';
import { getUserPermissions } from '../middleware/permissions';

/**
 * Initialize default permissions for a user based on their rank
 */
export async function initializeUserPermissions(userId: number, rank: number | null): Promise<void> {
  if (rank === null) {
    return;
  }

  const isAdmin = rank >= 5 && rank <= 255;

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
    const existing = await db
      .prepare('SELECT id FROM permissions WHERE user_id = ? AND permission_flag = ?')
      .get(userId, perm);

    if (!existing) {
      await db.prepare(
        'INSERT INTO permissions (user_id, permission_flag, granted, overridden) VALUES (?, ?, ?, ?)'
      ).run(userId, perm, true, false);
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
  const existing = await db
    .prepare('SELECT id FROM permissions WHERE user_id = ? AND permission_flag = ?')
    .get(userId, permission);

  if (existing) {
    await db.prepare(
      'UPDATE permissions SET granted = ?, overridden = ? WHERE user_id = ? AND permission_flag = ?'
    ).run(granted, true, userId, permission);
  } else {
    await db.prepare(
      'INSERT INTO permissions (user_id, permission_flag, granted, overridden) VALUES (?, ?, ?, ?)'
    ).run(userId, permission, granted, true);
  }
}

/**
 * Get all permissions for a user as an array
 */
export async function getUserPermissionsArray(userId: number): Promise<PermissionFlag[]> {
  const permissions = await getUserPermissions(userId);
  return Array.from(permissions);
}

