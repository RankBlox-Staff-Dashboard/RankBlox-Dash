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
 * Get user activity status based on quota completion
 * A user is Active if they've met their quota, Inactive otherwise
 * This reflects their activity/performance status, not their database employment status
 */
export function getActivityStatus(userStatus: string, quotaMet?: boolean): 'Active' | 'Inactive' {
  // If quota_met is provided, use it to determine Active/Inactive
  // This reflects whether they've completed their quota requirements
  if (quotaMet !== undefined) {
    return quotaMet ? 'Active' : 'Inactive';
  }
  // Fallback to status field if quota_met is not provided
  return userStatus === 'active' ? 'Active' : 'Inactive';
}

/**
 * Get the standard message quota
 */
export function getMessagesQuota(): number {
  return MESSAGES_QUOTA;
}

