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
 * Get user activity status - simply use the status from the user object
 * If status is 'active', return 'Active', otherwise return 'Inactive'
 */
export function getActivityStatus(userStatus: string): 'Active' | 'Inactive' {
  return userStatus === 'active' ? 'Active' : 'Inactive';
}

/**
 * Get the standard message quota
 */
export function getMessagesQuota(): number {
  return MESSAGES_QUOTA;
}

