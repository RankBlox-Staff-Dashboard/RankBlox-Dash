import { db } from '../models/database';

/**
 * Get current week start (Monday) in YYYY-MM-DD format
 */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

/**
 * Get current week start datetime string for SQL queries (YYYY-MM-DD 00:00:00)
 */
export function getCurrentWeekStartDateTime(): string {
  const weekStart = getCurrentWeekStart();
  return `${weekStart} 00:00:00`;
}

/**
 * Count Discord messages for a user in the current week
 * This is the source of truth for message counts - counts directly from discord_messages table
 * 
 * @param userId - The user ID to count messages for
 * @param weekStartDateTime - Optional week start datetime (defaults to current week)
 * @returns The count of messages sent by the user in the specified week
 */
export async function countDiscordMessages(
  userId: number, 
  weekStartDateTime?: string
): Promise<number> {
  const startDateTime = weekStartDateTime || getCurrentWeekStartDateTime();
  
  const messageCount = await db
    .prepare('SELECT COUNT(*) as count FROM discord_messages WHERE user_id = ? AND created_at >= ?')
    .get(userId, startDateTime) as { count: number | string | null } | undefined;

  return messageCount?.count != null ? parseInt(String(messageCount.count)) || 0 : 0;
}

