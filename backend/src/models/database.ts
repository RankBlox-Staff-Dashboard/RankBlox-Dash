import { Pool, QueryResult } from 'pg';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper function to execute queries
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  return pool.query(text, params);
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // Enable foreign keys (PostgreSQL supports this with constraints)
    await client.query('SET timezone = UTC');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        discord_id VARCHAR(255) UNIQUE NOT NULL,
        discord_username VARCHAR(255) NOT NULL,
        roblox_id VARCHAR(255),
        roblox_username VARCHAR(255),
        rank INTEGER,
        rank_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'pending_verification' CHECK(status IN ('active', 'inactive', 'pending_verification')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Verification codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        emoji_code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        permission_flag VARCHAR(255) NOT NULL,
        granted BOOLEAN NOT NULL DEFAULT TRUE,
        overridden BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, permission_flag)
      )
    `);

    // Activity logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        week_start DATE NOT NULL,
        messages_sent INTEGER DEFAULT 0,
        tickets_claimed INTEGER DEFAULT 0,
        tickets_resolved INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, week_start)
      )
    `);

    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_week ON activity_logs(user_id, week_start)
    `);

    // Infractions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS infractions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK(type IN ('warning', 'strike')),
        issued_by INTEGER,
        voided BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Tickets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        discord_channel_id VARCHAR(255) NOT NULL,
        discord_message_id VARCHAR(255),
        claimed_by INTEGER,
        status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'claimed', 'resolved', 'closed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Tracked channels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tracked_channels (
        id SERIAL PRIMARY KEY,
        discord_channel_id VARCHAR(255) UNIQUE NOT NULL,
        channel_name VARCHAR(255) NOT NULL
      )
    `);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

// Export pool for direct access if needed
export { pool };
