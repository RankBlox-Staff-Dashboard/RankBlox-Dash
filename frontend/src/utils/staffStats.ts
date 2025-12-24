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
 * Determine Active/Inactive status based on message count
 * This is a deterministic calculation, not based on the user's status field
 */
export function getActivityStatus(
  messagesSent: number,
  quota: number = MESSAGES_QUOTA
): 'Active' | 'Inactive' {
  return calculateQuotaMet(messagesSent, quota) ? 'Active' : 'Inactive';
}

/**
 * Get the standard message quota
 */
export function getMessagesQuota(): number {
  return MESSAGES_QUOTA;
}

