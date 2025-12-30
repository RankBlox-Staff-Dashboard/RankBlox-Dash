import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration - MySQL database for activity/analytics
// All activity and analytics queries use this MySQL database connection
// Requires authentication: user, password, and database name
const dbConfig = {
  host: process.env.DB_HOST || 'ahsDB.zenohost.co.uk',
  user: process.env.DB_USER || 'AHSStaff',
  password: process.env.DB_PASSWORD || 'AHSStaff2025!Security!Zenohost',
  database: process.env.DB_NAME || 'ahstaffsecureencrypteddatabase',
  // MySQL connection options
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  // MySQL-specific options
  ssl: false, // Set to true if your MySQL server requires SSL
  multipleStatements: false, // Security: prevent SQL injection via multiple statements
} as const;

// Create MySQL connection pool with authentication
const pool = mysql.createPool(dbConfig);

// Log database configuration (without password) - shows MySQL connection details
console.log('[Database] MySQL Connection Configuration:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  connectionLimit: dbConfig.connectionLimit,
  type: 'MySQL'
});

// Test connection on startup to verify authentication
pool.getConnection()
  .then((connection) => {
    console.log('[Database] MySQL authentication successful');
    console.log(`[Database] Connected to MySQL server: ${dbConfig.host}`);
    console.log(`[Database] Using database: ${dbConfig.database}`);
    connection.release();
  })
  .catch((error) => {
    console.error('[Database] MySQL connection/authentication error:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('[Database] Authentication failed - check DB_USER and DB_PASSWORD');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('[Database] Database does not exist - check DB_NAME');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('[Database] Connection refused - check DB_HOST and ensure MySQL server is running');
    }
  });

// Helper functions for MySQL
export async function query(sql: string, params?: any[]): Promise<any> {
  const [results] = await pool.query(sql, params);
  return results;
}

export async function dbGet(sql: string, params?: any[]): Promise<any> {
  const [rows] = await pool.query(sql, params) as any[];
  return rows[0];
}

export async function dbRun(sql: string, params?: any[]): Promise<any> {
  const [result] = await pool.query(sql, params);
  return result;
}

export async function dbAll(sql: string, params?: any[]): Promise<any[]> {
  const [rows] = await pool.query(sql, params);
  return rows as any[];
}

// Create a wrapper that mimics the existing API (for compatibility)
class DatabaseWrapper {
  constructor(private runner: Pool | PoolConnection = pool) {}

  prepare(sql: string) {
    return {
      get: async (...params: any[]) => {
        const [rows] = await this.runner.query(sql, params) as any[];
        return rows[0];
      },
      run: async (...params: any[]) => {
        const [result] = await this.runner.query(sql, params) as any;
        return {
          lastInsertRowid: result.insertId || null,
          changes: result.affectedRows || 0,
        };
      },
      all: async (...params: any[]) => {
        const [rows] = await this.runner.query(sql, params);
        return rows as any[];
      },
    };
  }

  async exec(sql: string) {
    return this.runner.query(sql);
  }

  async transaction<T>(fn: (tx: DatabaseWrapper) => Promise<T> | T): Promise<T> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await Promise.resolve(fn(new DatabaseWrapper(connection)));
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async close() {
    await pool.end();
  }
}

const db = new DatabaseWrapper();

// Initialize database schema
export async function initializeDatabase() {
  try {
    // Test MySQL connection and authentication
    const connection = await pool.getConnection();
    console.log(`[Database] MySQL connection authenticated successfully`);
    console.log(`[Database] Connected to MySQL server: ${dbConfig.host}`);
    console.log(`[Database] Authenticated as user: ${dbConfig.user}`);
    console.log(`[Database] Using MySQL database: ${dbConfig.database}`);
    
    // Verify we can query the database
    const [result] = await connection.query('SELECT 1 as test') as any[];
    if (result && result[0]?.test === 1) {
      console.log('[Database] MySQL query test successful - database is accessible');
    }
    
    connection.release();

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(255) UNIQUE NOT NULL,
        discord_username VARCHAR(255) NOT NULL,
        discord_avatar VARCHAR(255),
        roblox_id VARCHAR(255),
        roblox_username VARCHAR(255),
        \`rank\` INT,
        rank_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'pending_verification',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CHECK (status IN ('active', 'inactive', 'pending_verification'))
      )
    `);
    
    // Add discord_avatar column if it doesn't exist (for existing tables)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar VARCHAR(255)
    `).catch(() => {
      // Column might already exist or MySQL doesn't support IF NOT EXISTS for columns
      // Try alternative approach
      pool.query(`
        ALTER TABLE users ADD COLUMN discord_avatar VARCHAR(255)
      `).catch(() => {
        // Column already exists, ignore
      });
    });

    // Sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Verification codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        emoji_code VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Permissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        permission_flag VARCHAR(255) NOT NULL,
        granted BOOLEAN NOT NULL DEFAULT TRUE,
        overridden BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_permission (user_id, permission_flag)
      )
    `);

    // Activity logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        week_start DATE NOT NULL,
        messages_sent INT DEFAULT 0,
        tickets_claimed INT DEFAULT 0,
        tickets_resolved INT DEFAULT 0,
        minutes INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_week (user_id, week_start)
      )
    `);
    
    // Add minutes column if it doesn't exist (for existing tables)
    await pool.query(`
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS minutes INT DEFAULT 0
    `).catch(() => {
      // Column might already exist or MySQL doesn't support IF NOT EXISTS for columns
      // Try alternative approach
      pool.query(`
        ALTER TABLE activity_logs ADD COLUMN minutes INT DEFAULT 0
      `).catch(() => {
        // Column already exists, ignore
      });
    });
    
    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_week ON activity_logs(user_id, week_start)
    `).catch(() => {
      // Index might already exist, ignore error
    });

    // Infractions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS infractions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        reason TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        issued_by INT,
        voided BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
        CHECK (type IN ('warning', 'strike'))
      )
    `);

    // Tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_channel_id VARCHAR(255) NOT NULL,
        discord_message_id VARCHAR(255),
        claimed_by INT,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL,
        CHECK (status IN ('open', 'claimed', 'resolved', 'closed'))
      )
    `);

    // Tracked channels table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracked_channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_channel_id VARCHAR(255) UNIQUE NOT NULL,
        channel_name VARCHAR(255) NOT NULL
      )
    `);

    // LOA (Leave of Absence) requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loa_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        reviewed_by INT,
        review_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        CHECK (status IN ('pending', 'approved', 'denied'))
      )
    `);

    // Discord messages table for tracking quota
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discord_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_message_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INT NOT NULL,
        discord_channel_id VARCHAR(255) NOT NULL,
        guild_id VARCHAR(255) NOT NULL,
        content_length INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_created (user_id, created_at),
        INDEX idx_channel_created (discord_channel_id, created_at)
      )
    `);

    console.log('MySQL database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export database instance
export { db, pool };
