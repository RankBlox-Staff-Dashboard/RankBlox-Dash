import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? {
    rejectUnauthorized: false, // Required for Render's managed Postgres
  } : undefined,
});

// Helper functions that match the old SQLite API style but are async
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  return pool.query(text, params);
}

export async function dbGet(sql: string, params?: any[]): Promise<any> {
  const result = await pool.query(sql, params);
  return result.rows[0];
}

export async function dbRun(sql: string, params?: any[]): Promise<QueryResult> {
  return pool.query(sql, params);
}

export async function dbAll(sql: string, params?: any[]): Promise<any[]> {
  const result = await pool.query(sql, params);
  return result.rows;
}

// Create a wrapper that mimics better-sqlite3's API (for legacy code)
class DatabaseWrapper {
  prepare(sql: string) {
    // Convert SQLite ? to PostgreSQL $1, $2, etc.
    const convertSql = (sql: string, params: any[]): { sql: string; pgParams: any[] } => {
      let pgSql = sql;
      let paramIndex = 1;
      const pgParams: any[] = [];
      
      pgSql = pgSql.replace(/\?/g, () => {
        pgParams.push(params[paramIndex - 1]);
        return `$${paramIndex++}`;
      });
      
      return { sql: pgSql, pgParams };
    };
    
    return {
      get: async (...params: any[]) => {
        const { sql: pgSql, pgParams } = convertSql(sql, params);
        const result = await pool.query(pgSql, pgParams);
        return result.rows[0];
      },
      run: async (...params: any[]) => {
        const { sql: pgSql, pgParams } = convertSql(sql, params);
        const result = await pool.query(pgSql, pgParams);
        return {
          lastInsertRowid: result.rows[0]?.id || null,
          changes: result.rowCount || 0,
        };
      },
      all: async (...params: any[]) => {
        const { sql: pgSql, pgParams } = convertSql(sql, params);
        const result = await pool.query(pgSql, pgParams);
        return result.rows;
      },
    };
  }
  
  async exec(sql: string) {
    // Convert SQLite-specific syntax to PostgreSQL
    let pgSql = sql;
    
    // Convert CREATE TABLE IF NOT EXISTS syntax
    pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
    pgSql = pgSql.replace(/TEXT(?![\(])/g, 'VARCHAR(255)'); // TEXT without parens
    pgSql = pgSql.replace(/TEXT\(/g, 'VARCHAR('); // TEXT( with parens
    pgSql = pgSql.replace(/DATETIME/g, 'TIMESTAMP');
    pgSql = pgSql.replace(/datetime\("now"\)/gi, 'NOW()');
    pgSql = pgSql.replace(/CURRENT_TIMESTAMP/g, 'CURRENT_TIMESTAMP');
    
    return pool.query(pgSql);
  }
  
  pragma(key: string) {
    // SQLite pragmas don't apply to PostgreSQL - foreign keys enabled by default
    return;
  }
}

const db = new DatabaseWrapper();

// Initialize database schema
export async function initializeDatabase() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        discord_id VARCHAR(255) UNIQUE NOT NULL,
        discord_username VARCHAR(255) NOT NULL,
        roblox_id VARCHAR(255),
        roblox_username VARCHAR(255),
        rank INTEGER,
        rank_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'pending_verification',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT status_check CHECK (status IN ('active', 'inactive', 'pending_verification'))
      )
    `);

    // Sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Verification codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        emoji_code VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Permissions table
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_week ON activity_logs(user_id, week_start)
    `);

    // Infractions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS infractions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        issued_by INTEGER,
        voided BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT type_check CHECK (type IN ('warning', 'strike'))
      )
    `);

    // Tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        discord_channel_id VARCHAR(255) NOT NULL,
        discord_message_id VARCHAR(255),
        claimed_by INTEGER,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT status_check CHECK (status IN ('open', 'claimed', 'resolved', 'closed'))
      )
    `);

    // Tracked channels table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracked_channels (
        id SERIAL PRIMARY KEY,
        discord_channel_id VARCHAR(255) UNIQUE NOT NULL,
        channel_name VARCHAR(255) NOT NULL
      )
    `);

    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export database instance (wrapper that mimics SQLite API but is async)
export { db };
