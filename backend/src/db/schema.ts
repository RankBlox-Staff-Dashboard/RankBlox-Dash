/**
 * Database schema definitions
 */

export const SCHEMA = `
-- Staff members table
CREATE TABLE IF NOT EXISTS staff_members (
  id TEXT PRIMARY KEY,
  roblox_username TEXT UNIQUE NOT NULL,
  roblox_user_id INTEGER UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'management', 'admin')),
  pin_hash TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '{}',
  avatar_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_verified INTEGER NOT NULL DEFAULT 0,
  last_active TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Verification sessions for Roblox account ownership
CREATE TABLE IF NOT EXISTS verification_sessions (
  id TEXT PRIMARY KEY,
  roblox_username TEXT NOT NULL,
  roblox_user_id INTEGER,
  verification_code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Login attempts for rate limiting and security
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  roblox_username TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_roblox_username ON staff_members(roblox_username);
CREATE INDEX IF NOT EXISTS idx_staff_roblox_user_id ON staff_members(roblox_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff_members(is_active);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_code ON verification_sessions(verification_code);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_expires ON verification_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(roblox_username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);
`;

export const SEED_DATA = `
-- This will be populated by the seed script
`;
