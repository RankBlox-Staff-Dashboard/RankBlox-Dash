import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './models/database';
import authRoutes from './routes/auth';
import verificationRoutes from './routes/verification';
import dashboardRoutes from './routes/dashboard';
import ticketsRoutes from './routes/tickets';
import managementRoutes from './routes/management';
import permissionsRoutes from './routes/permissions';
import botRoutes from './routes/bot';
import adminRoutes from './routes/admin';
import cron from 'node-cron';
import { db } from './models/database';
import { startAutoSync } from './services/groupSync';
import { getClientIp, getUserAgent, hasSqlInjectionRisk, logSecurityEvent } from './utils/security';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const DEFAULT_FRONTEND_URL = 'https://staff.ahscampus.com';
const FRONTEND_URL = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
const normalizeOrigin = (value?: string) => {
  if (!value) return '';
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
};
const FRONTEND_URLS = Array.from(new Set(
  (process.env.FRONTEND_URLS || FRONTEND_URL)
    .split(',')
    .map((s) => normalizeOrigin(s.trim()))
    .filter(Boolean)
));

// Debug logging for CORS configuration
console.log('=== CORS Configuration ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FRONTEND_URL env:', process.env.FRONTEND_URL);
console.log('FRONTEND_URLS env:', process.env.FRONTEND_URLS);
console.log('Resolved allowed origins:', FRONTEND_URLS);
console.log('========================');

// Middleware
app.disable('x-powered-by');
app.use(helmet());
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Bot-Token'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '200kb' }));

// Basic global rate limit (stricter limits can be added per-route later)
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

function scanForSqlInjection(value: any, path: string, flagged: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, idx) => scanForSqlInjection(v, `${path}[${idx}]`, flagged));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, v]) => scanForSqlInjection(v, path ? `${path}.${key}` : key, flagged));
    return;
  }
  if (typeof value === 'string' && hasSqlInjectionRisk(value)) {
    flagged.push(path || '(root)');
  }
}

// Basic SQL injection pattern guardrail
app.use((req, res, next) => {
  const flagged: string[] = [];
  scanForSqlInjection(req.query, 'query', flagged);
  scanForSqlInjection(req.body, 'body', flagged);

  if (flagged.length > 0) {
    logSecurityEvent({
      type: 'SUSPICIOUS_INPUT',
      ip: getClientIp(req),
      path: req.path,
      method: req.method,
      userAgent: getUserAgent(req),
      details: `Potential SQL injection indicators in: ${flagged.join(', ')}`,
    });
    return res.status(400).json({ error: 'Invalid input detected' });
  }

  next();
});

// Initialize database and start auto-sync
initializeDatabase()
  .then(() => {
    // Start automatic group rank synchronization
    startAutoSync();
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
        // Check if infraction already issued for this week (SQLite syntax)
        const existing = await tx
          .prepare(
            `SELECT id FROM infractions 
             WHERE user_id = ? 
             AND reason LIKE ? 
             AND voided = 0 
             AND created_at > datetime(?, '-7 days')`
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

// Start server and store instance for graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL(s): ${FRONTEND_URLS.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    db.close();
    process.exit(0);
  });
});
