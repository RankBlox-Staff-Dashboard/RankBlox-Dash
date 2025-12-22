import { db } from '../models/database';
import { getUserGroupRank } from './roblox';

// Sync configuration
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_DELAY_MS = 100; // 100ms between Roblox API calls to avoid rate limiting
const MAX_CONCURRENT_REQUESTS = 5; // Process users in batches

// Sync state
let isSyncing = false;
let lastSyncTime: Date | null = null;
let lastSyncResult: SyncResult | null = null;
let syncIntervalId: NodeJS.Timeout | null = null;

export interface SyncResult {
  success: boolean;
  totalUsers: number;
  updatedUsers: number;
  failedUsers: number;
  errors: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastSyncResult: SyncResult | null;
  nextScheduledSync: string | null;
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  const nextScheduledSync = lastSyncTime 
    ? new Date(lastSyncTime.getTime() + SYNC_INTERVAL_MS).toISOString()
    : null;

  return {
    isSyncing,
    lastSyncTime: lastSyncTime?.toISOString() || null,
    lastSyncResult,
    nextScheduledSync,
  };
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sync a single user's rank from Roblox
 */
async function syncUserRank(user: { id: number; roblox_id: string; rank: number | null; rank_name: string | null }): Promise<{
  updated: boolean;
  error?: string;
  oldRank?: number | null;
  newRank?: number | null;
}> {
  try {
    const robloxId = parseInt(user.roblox_id, 10);
    if (isNaN(robloxId)) {
      return { updated: false, error: 'Invalid Roblox ID' };
    }

    const rankInfo = await getUserGroupRank(robloxId);

    if (!rankInfo) {
      // User is no longer in the group - set rank to null
      if (user.rank !== null) {
        await db.prepare(
          'UPDATE users SET `rank` = NULL, rank_name = NULL, updated_at = NOW() WHERE id = ?'
        ).run(user.id);
        return { updated: true, oldRank: user.rank, newRank: null };
      }
      return { updated: false };
    }

    // Check if rank changed
    if (user.rank !== rankInfo.rank || user.rank_name !== rankInfo.rankName) {
      await db.prepare(
        'UPDATE users SET `rank` = ?, rank_name = ?, updated_at = NOW() WHERE id = ?'
      ).run(rankInfo.rank, rankInfo.rankName, user.id);
      return { updated: true, oldRank: user.rank, newRank: rankInfo.rank };
    }

    return { updated: false };
  } catch (error: any) {
    return { updated: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Process users in batches with rate limiting
 */
async function processBatch(users: Array<{ id: number; roblox_id: string; rank: number | null; rank_name: string | null }>): Promise<{
  updated: number;
  failed: number;
  errors: string[];
}> {
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < users.length; i += MAX_CONCURRENT_REQUESTS) {
    const batch = users.slice(i, i + MAX_CONCURRENT_REQUESTS);
    
    const results = await Promise.all(
      batch.map(async (user) => {
        const result = await syncUserRank(user);
        // Add delay between requests to avoid rate limiting
        await sleep(RATE_LIMIT_DELAY_MS);
        return { user, result };
      })
    );

    for (const { user, result } of results) {
      if (result.error) {
        failed++;
        errors.push(`User ${user.id}: ${result.error}`);
      } else if (result.updated) {
        updated++;
        console.log(`[GroupSync] Updated user ${user.id}: rank ${result.oldRank} -> ${result.newRank}`);
      }
    }
  }

  return { updated, failed, errors };
}

/**
 * Perform a full group rank synchronization for all users
 */
export async function performGroupSync(): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (isSyncing) {
    throw new Error('Sync already in progress');
  }

  isSyncing = true;
  const startedAt = new Date();

  try {
    // Get all users with Roblox IDs
    const users = await db.prepare(
      'SELECT id, roblox_id, `rank`, rank_name FROM users WHERE roblox_id IS NOT NULL'
    ).all() as Array<{ id: number; roblox_id: string; rank: number | null; rank_name: string | null }>;

    console.log(`[GroupSync] Starting sync for ${users.length} users`);

    const { updated, failed, errors } = await processBatch(users);

    const completedAt = new Date();
    const result: SyncResult = {
      success: failed === 0,
      totalUsers: users.length,
      updatedUsers: updated,
      failedUsers: failed,
      errors: errors.slice(0, 10), // Limit errors to first 10
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };

    lastSyncTime = completedAt;
    lastSyncResult = result;

    console.log(`[GroupSync] Sync completed: ${updated} updated, ${failed} failed out of ${users.length} users`);

    return result;
  } catch (error: any) {
    const completedAt = new Date();
    const result: SyncResult = {
      success: false,
      totalUsers: 0,
      updatedUsers: 0,
      failedUsers: 0,
      errors: [error.message || 'Unknown error'],
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };

    lastSyncResult = result;
    console.error('[GroupSync] Sync failed:', error);

    return result;
  } finally {
    isSyncing = false;
  }
}

/**
 * Start the automatic background sync scheduler
 */
export function startAutoSync(): void {
  if (syncIntervalId) {
    console.log('[GroupSync] Auto-sync already running');
    return;
  }

  console.log(`[GroupSync] Starting auto-sync with ${SYNC_INTERVAL_MS / 1000 / 60} minute interval`);

  // Run initial sync after a short delay (let the server start up)
  setTimeout(async () => {
    try {
      await performGroupSync();
    } catch (error) {
      console.error('[GroupSync] Initial auto-sync failed:', error);
    }
  }, 10000); // 10 second delay

  // Schedule recurring syncs
  syncIntervalId = setInterval(async () => {
    try {
      await performGroupSync();
    } catch (error) {
      console.error('[GroupSync] Scheduled auto-sync failed:', error);
    }
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop the automatic background sync scheduler
 */
export function stopAutoSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[GroupSync] Auto-sync stopped');
  }
}
