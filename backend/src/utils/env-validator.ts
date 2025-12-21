/**
 * Validate required environment variables
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const required = [
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_REDIRECT_URI',
    'JWT_SECRET',
    'DATABASE_URL',
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

