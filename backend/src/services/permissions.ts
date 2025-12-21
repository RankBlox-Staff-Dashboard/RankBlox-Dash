import { db } from '../models/database';
import { PermissionFlag } from '../utils/types';
import { getUserPermissions } from '../middleware/permissions';

/**
 * Initialize default permissions for a user based on their rank
 */
export function initializeUserPermissions(userId: number, rank: number | null): void {
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

  defaultPermissions.forEach((perm) => {
    // Check if permission already exists
    const existing = db
      .prepare('SELECT id FROM permissions WHERE user_id = ? AND permission_flag = ?')
      .get(userId, perm);

    if (!existing) {
      db.prepare(
        'INSERT INTO permissions (user_id, permission_flag, granted, overridden) VALUES (?, ?, ?, ?)'
      ).run(userId, perm, 1, 0);
    }
  });
}

/**
 * Update a user's permission (override)
 */
export function updateUserPermission(
  userId: number,
  permission: PermissionFlag,
  granted: boolean
): void {
  const existing = db
    .prepare('SELECT id FROM permissions WHERE user_id = ? AND permission_flag = ?')
    .get(userId, permission);

  if (existing) {
    db.prepare(
      'UPDATE permissions SET granted = ?, overridden = ? WHERE user_id = ? AND permission_flag = ?'
    ).run(granted ? 1 : 0, 1, userId, permission);
  } else {
    db.prepare(
      'INSERT INTO permissions (user_id, permission_flag, granted, overridden) VALUES (?, ?, ?, ?)'
    ).run(userId, permission, granted ? 1 : 0, 1);
  }
}

/**
 * Get all permissions for a user as an array
 */
export function getUserPermissionsArray(userId: number): PermissionFlag[] {
  const permissions = getUserPermissions(userId);
  return Array.from(permissions);
}

