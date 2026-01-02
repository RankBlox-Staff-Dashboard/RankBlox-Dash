import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { initializeDatabase, connectDatabase } from './models/database';
import authRoutes from './routes/auth';
import verificationRoutes from './routes/verification';
import dashboardRoutes from './routes/dashboard';
import ticketsRoutes from './routes/tickets';
import managementRoutes from './routes/management';
import permissionsRoutes from './routes/permissions';
import botRoutes from './routes/bot';
import adminRoutes from './routes/admin';
import publicRoutes from './routes/public';
import cron from 'node-cron';
import { db } from './models/database';
import { startAutoSync, stopAutoSync } from './services/groupSync';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);
// Hardcoded frontend URL - must match actual frontend deployment
const HARDCODED_FRONTEND_URL = 'https://staff.rankblox.xyz';
const normalizeOrigin = (value?: string) => {
  if (!value) return '';
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
};
// Allow hardcoded URL and any additional URLs from environment
// Safely parse FRONTEND_URLS to prevent errors if it's not a string
const FRONTEND_URLS = Array.from(new Set([
  normalizeOrigin(HARDCODED_FRONTEND_URL),
  ...(process.env.FRONTEND_URLS && typeof process.env.FRONTEND_URLS === 'string' 
    ? process.env.FRONTEND_URLS.split(',').map((s) => normalizeOrigin(s.trim())).filter(Boolean)
    : []),
  ...(process.env.FRONTEND_URL && typeof process.env.FRONTEND_URL === 'string' 
    ? [normalizeOrigin(process.env.FRONTEND_URL)] 
    : [])
].filter(Boolean)));

// Debug logging for CORS configuration
console.log('=== CORS Configuration ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FRONTEND_URL env:', process.env.FRONTEND_URL);
console.log('FRONTEND_URLS env:', process.env.FRONTEND_URLS);
console.log('Resolved allowed origins:', FRONTEND_URLS);
console.log('========================');

// Middleware
app.disable('x-powered-by');
// Relaxed helmet settings - less strict security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow more flexibility
  crossOriginEmbedderPolicy: false, // Less strict
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // More permissive
}));
app.use(cookieParser());
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    const normalizedOrigin = normalizeOrigin(origin);
    if (FRONTEND_URLS.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // Reject disallowed origins properly (don't throw error)
    console.warn(`CORS rejected origin: ${origin}`);
    console.warn(`Allowed origins: ${FRONTEND_URLS.join(', ')}`);
    return callback(null, false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Bot-Token', 'X-Requested-With'], // Added more headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Added PATCH
}));
app.use(express.json({ limit: '1mb' })); // Increased from 200kb to 1mb

// Basic global rate limit - increased limits
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 500, // Increased from 300 to 500
  standardHeaders: true,
  legacyHeaders: false,
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/public', publicRoutes); // Public routes (no auth required)
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/admin', adminRoutes);

// Health check - must always return 200 OK for Cloud Run startup
// Cloud Run uses this to determine if the container is ready
let dbReady = false;
app.get('/health', (req, res) => {
  // Always return 200 OK - server is ready to accept requests
  // Database status is informational only
  res.json({ 
    status: 'ok', 
    database: dbReady ? 'connected' : 'connecting',
    timestamp: new Date().toISOString()
  });
});

// Separate endpoint for database readiness check
app.get('/health/db', (req, res) => {
  if (dbReady) {
    res.json({ status: 'ok', database: 'connected' });
  } else {
    res.status(503).json({ status: 'starting', database: 'connecting' });
  }
});

// CORS test endpoint (temporary - for debugging)
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    origin: req.headers.origin,
    allowed: FRONTEND_URLS,
    message: 'CORS is working!' 
  });
});

// Not found
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (avoid leaking internals)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Weekly quota check and infraction issuance (runs every Monday at 12:00 AM UTC)
 */
async function checkWeeklyQuotas() {
  try {
    // Calculate last Monday (start of last week) more reliably
    const today = new Date();
    const currentDay = today.getUTCDay();
    const daysToLastMonday = currentDay === 0 ? 7 : currentDay;
    const lastMonday = new Date(today);
    lastMonday.setUTCDate(today.getUTCDate() - daysToLastMonday - 7);
    lastMonday.setUTCHours(0, 0, 0, 0);
    const lastWeekStart = lastMonday.toISOString().split('T')[0];

    console.log(`[QuotaCheck] Checking quotas for week starting: ${lastWeekStart}`);

    // Get all users who didn't meet quota
    const activityLogs = await db
      .prepare(
        `SELECT user_id, messages_sent 
         FROM activity_logs 
         WHERE week_start = ? AND messages_sent < 150`
      )
      .all(lastWeekStart) as { user_id: number; messages_sent: number }[];

    if (activityLogs.length === 0) {
      console.log('[QuotaCheck] No users below quota threshold');
      return;
    }

    console.log(`[QuotaCheck] Found ${activityLogs.length} users below quota`);

    // Issue infractions in a transaction for atomicity
    const count = await db.transaction(async (tx) => {
      let infractionsIssued = 0;

      for (const log of activityLogs) {
        // Check if infraction already issued for this week (DATE_SUB converted to date subtraction by MongoDB wrapper)
        const existing = await tx
          .prepare(
            `SELECT id FROM infractions 
             WHERE user_id = ? 
             AND reason LIKE ? 
             AND voided = 0 
             AND created_at > DATE_SUB(?, INTERVAL 7 DAY)`
          )
          .get(
            log.user_id,
            'Failed to meet 150 messages this week%',
            lastWeekStart
          );

        if (!existing) {
          await tx.prepare(
            `INSERT INTO infractions (user_id, reason, type, issued_by)
             VALUES (?, ?, ?, NULL)`
          ).run(
            log.user_id,
            `Failed to meet 150 messages this week. Only sent ${log.messages_sent} messages.`,
            'warning'
          );
          infractionsIssued++;
        }
      }

      return infractionsIssued;
    });
    console.log(`[QuotaCheck] Issued ${count} infractions for ${activityLogs.length} users below threshold`);
  } catch (error) {
    console.error('[QuotaCheck] Error checking weekly quotas:', error);
  }
}

// Schedule weekly quota check (every Monday at 12:00 AM UTC)
cron.schedule('0 0 * * 1', checkWeeklyQuotas, {
  timezone: 'UTC',
});

// Start server immediately (Cloud Run requires this)
// Database connection will happen in background
console.log('========================================');
console.log('🚀 Starting server...');
console.log(`📡 Port: ${PORT}`);
console.log(`🌐 Frontend URL(s): ${FRONTEND_URLS.join(', ')}`);
console.log('========================================');

let server: any;
try {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('✅ HTTP server started and listening!');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 Frontend URL(s): ${FRONTEND_URLS.join(', ')}`);
    console.log('========================================');
    console.log('[Startup] Connecting to database in background...');
  });
  
  // Handle server errors
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', error);
      process.exit(1);
    }
  });
  
  // Log that we're attempting to start
  console.log(`[Startup] Server listening on 0.0.0.0:${PORT}`);
} catch (error: any) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Initialize database in background (non-blocking)
async function initializeDatabaseConnection() {
  try {
    console.log('[Startup] Connecting to database...');
    await connectDatabase();
    
    console.log('[Startup] Initializing database schema...');
    await initializeDatabase();
    
    console.log('[Startup] Starting automatic group rank synchronization...');
    startAutoSync();
    
    dbReady = true;
    console.log('[Startup] ✅ Database initialization complete!');
  } catch (error: any) {
    console.error('[Startup] ❌ Failed to initialize database:', error.message || error);
    // Don't exit - server can still serve requests, just without database
    // Health check will show database is not ready
  }
}

// Start database initialization in background
initializeDatabaseConnection();

// Graceful shutdown handlers
const shutdown = (signal: string) => {
  console.log(`${signal} received, closing server gracefully...`);
  // Stop group sync interval
  stopAutoSync();
  server.close(() => {
    console.log('Server closed');
    db.close().then(() => {
      console.log('Database connection closed');
      process.exit(0);
    }).catch((err) => {
      console.error('Error closing database:', err);
      process.exit(1);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
