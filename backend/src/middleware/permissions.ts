import { Request, Response, NextFunction } from 'express';
import { PermissionFlag } from '../utils/types';
import { db } from '../models/database';
import { isImmuneRank } from '../utils/immunity';

// Default permissions by rank
const DEFAULT_STAFF_PERMISSIONS: PermissionFlag[] = [
  'VIEW_DASHBOARD',
  'VIEW_TICKETS',
  'CLAIM_TICKETS',
  'VIEW_INFRACTIONS',
];

const DEFAULT_ADMIN_PERMISSIONS: PermissionFlag[] = [
  ...DEFAULT_STAFF_PERMISSIONS,
  'VIEW_ALL_INFRACTIONS',
  'ISSUE_INFRACTIONS',
  'VOID_INFRACTIONS',
  'VIEW_ANALYTICS',
  'MANAGE_PERMISSIONS',
  'MANAGE_USERS',
  'MANAGE_CHANNELS',
];

/**
 * Get all permissions for a user (defaults + overrides)
 */
export async function getUserPermissions(userId: number): Promise<Set<PermissionFlag>> {
  // Note: `rank` must be escaped with backticks because it's a MySQL reserved keyword
  const user = await db
    .prepare('SELECT `rank`, status FROM users WHERE id = ?')
    .get(userId) as { rank: number | null; status: string } | undefined;

  if (!user) {
    return new Set();
  }

  const permissions = new Set<PermissionFlag>();

  // Inactive or unverified accounts should not receive staff permissions
  // Exception: immune ranks (254-255) always receive permissions
  if (user.status !== 'active' && !isImmuneRank(user.rank)) {
    return permissions;
  }

  // Add default permissions based on rank
  if (user.rank === null) {
    return permissions;
  }

  const defaultPermissions =
    user.rank >= 5 && user.rank <= 255
      ? DEFAULT_ADMIN_PERMISSIONS
      : DEFAULT_STAFF_PERMISSIONS;

  defaultPermissions.forEach((perm) => permissions.add(perm));

  // Apply overrides from database
  const overrides = await db
    .prepare('SELECT permission_flag, granted FROM permissions WHERE user_id = ?')
    .all(userId) as { permission_flag: string; granted: boolean }[];

  overrides.forEach((override) => {
    if (override.granted) {
      permissions.add(override.permission_flag as PermissionFlag);
    } else {
      permissions.delete(override.permission_flag as PermissionFlag);
    }
  });

  return permissions;
}

/**
 * Middleware to check if user has a specific permission
 */
export function requirePermission(permission: PermissionFlag) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Immune ranks (254-255) bypass status restrictions
    if (req.user.status !== 'active' && !isImmuneRank(req.user.rank)) {
      res.status(403).json({ error: 'Account is not active' });
      return;
    }

    const permissions = await getUserPermissions(req.user.id);

    if (!permissions.has(permission)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user has admin rank (5-255)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Immune ranks (254-255) bypass status restrictions
  if (req.user.status !== 'active' && !isImmuneRank(req.user.rank)) {
    res.status(403).json({ error: 'Account is not active' });
    return;
  }

  if (!req.user.rank || req.user.rank < 5 || req.user.rank > 255) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Helper to check permission without middleware
 */
export async function hasPermission(userId: number, permission: PermissionFlag): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.has(permission);
}

