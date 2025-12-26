/**
 * Centralized utility functions for staff statistics
 */

const MESSAGES_QUOTA = 150;

/**
 * Calculate whether a user has met their message quota
 */
export function calculateQuotaMet(messagesSent: number, quota: number = MESSAGES_QUOTA): boolean {
  return messagesSent >= quota;
}

/**
 * Calculate quota percentage (0-100)
 */
export function calculateQuotaPercentage(
  messagesSent: number,
  quota: number = MESSAGES_QUOTA
): number {
  return Math.min(Math.round((messagesSent / quota) * 100), 100);
}

/**
 * Get user activity status based on database status
 * The status badge reflects the actual database employment status (active, inactive, etc.)
 * Quota met/unmet is handled separately and should not affect the status badge
 */
export function getActivityStatus(userStatus: string, quotaMet?: boolean): 'Active' | 'Inactive' {
  // Always use the database status to determine Active/Inactive
  // quotaMet parameter is kept for backwards compatibility but is ignored
  // Quota status is displayed separately via progress bars and icons
  return userStatus === 'active' ? 'Active' : 'Inactive';
}

/**
 * Get the standard message quota
 */
export function getMessagesQuota(): number {
  return MESSAGES_QUOTA;
}

