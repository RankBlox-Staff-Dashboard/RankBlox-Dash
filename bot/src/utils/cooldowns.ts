/**
 * Command cooldown system to prevent spam and abuse.
 * Tracks cooldowns per user per command.
 */

interface CooldownEntry {
  expiresAt: number;
}

// Map of command name -> user ID -> cooldown entry
const cooldowns = new Map<string, Map<string, CooldownEntry>>();

// Default cooldown times in milliseconds
export const COOLDOWN_TIMES: Record<string, number> = {
  stats: 10 * 1000, // 10 seconds
  verify: 30 * 1000, // 30 seconds
  ticket: 15 * 1000, // 15 seconds
  default: 5 * 1000, // 5 seconds for unknown commands
};

/**
 * Check if a user is on cooldown for a command.
 * Returns remaining time in seconds if on cooldown, 0 if not.
 */
export function checkCooldown(commandName: string, userId: string): number {
  const commandCooldowns = cooldowns.get(commandName);
  if (!commandCooldowns) return 0;

  const entry = commandCooldowns.get(userId);
  if (!entry) return 0;

  const now = Date.now();
  if (now >= entry.expiresAt) {
    // Cooldown expired, clean up
    commandCooldowns.delete(userId);
    return 0;
  }

  // Return remaining time in seconds (rounded up)
  return Math.ceil((entry.expiresAt - now) / 1000);
}

/**
 * Set a cooldown for a user on a command.
 */
export function setCooldown(commandName: string, userId: string): void {
  const cooldownTime = COOLDOWN_TIMES[commandName] || COOLDOWN_TIMES.default;
  
  let commandCooldowns = cooldowns.get(commandName);
  if (!commandCooldowns) {
    commandCooldowns = new Map();
    cooldowns.set(commandName, commandCooldowns);
  }

  commandCooldowns.set(userId, {
    expiresAt: Date.now() + cooldownTime,
  });
}

/**
 * Clear all cooldowns for a user (e.g., for admins/moderators).
 */
export function clearCooldowns(userId: string): void {
  for (const commandCooldowns of cooldowns.values()) {
    commandCooldowns.delete(userId);
  }
}

/**
 * Clean up expired cooldown entries to prevent memory leaks.
 * Should be called periodically.
 */
export function cleanupExpiredCooldowns(): void {
  const now = Date.now();
  
  for (const [commandName, commandCooldowns] of cooldowns.entries()) {
    for (const [userId, entry] of commandCooldowns.entries()) {
      if (now >= entry.expiresAt) {
        commandCooldowns.delete(userId);
      }
    }
    
    // Remove empty command maps
    if (commandCooldowns.size === 0) {
      cooldowns.delete(commandName);
    }
  }
}

// Run cleanup every 5 minutes - store reference for cleanup
let cooldownCleanupInterval: NodeJS.Timeout | null = null;
cooldownCleanupInterval = setInterval(cleanupExpiredCooldowns, 5 * 60 * 1000);

// Cleanup on shutdown
process.on('SIGTERM', () => {
  if (cooldownCleanupInterval) {
    clearInterval(cooldownCleanupInterval);
    cooldownCleanupInterval = null;
  }
});

process.on('SIGINT', () => {
  if (cooldownCleanupInterval) {
    clearInterval(cooldownCleanupInterval);
    cooldownCleanupInterval = null;
  }
});

/**
 * Format a cooldown message for the user.
 */
export function formatCooldownMessage(remainingSeconds: number): string {
  if (remainingSeconds <= 1) {
    return 'Please wait a moment before using this command again.';
  }
  return `Please wait ${remainingSeconds} seconds before using this command again.`;
}
