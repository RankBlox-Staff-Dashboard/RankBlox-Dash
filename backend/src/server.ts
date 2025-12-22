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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const DEFAULT_FRONTEND_URL = 'https://staffapp-frontend-y3za.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
const FRONTEND_URLS = (process.env.FRONTEND_URLS || FRONTEND_URL)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Middleware
app.disable('x-powered-by');
app.use(helmet());
app.use(cookieParser());
app.use(cors({
  origin(origin, callback) {
    // Allow same-origin/non-browser requests (no Origin header)
    if (!origin) return callback(null, true);
    if (FRONTEND_URLS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
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

// Initialize database
initializeDatabase().catch(err => {
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
    // Get current week start
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - 7); // Last week
    const lastWeekStart = monday.toISOString().split('T')[0];

    // Get all users who didn't meet quota
    const activityLogs = await db
      .prepare(
        `SELECT user_id, messages_sent 
         FROM activity_logs 
         WHERE week_start = ? AND messages_sent < 150`
      )
      .all(lastWeekStart) as { user_id: number; messages_sent: number }[];

    // Count of infractions issued
    let infractionsIssued = 0;

    // Issue infractions
    for (const log of activityLogs) {
      // Check if infraction already issued for this week (MySQL syntax)
      const existing = await db
        .prepare(
          `SELECT id FROM infractions 
           WHERE user_id = ? 
           AND reason LIKE ? 
           AND voided = false 
           AND created_at > DATE_SUB(?, INTERVAL 7 DAY)`
        )
        .get(
          log.user_id,
          'Failed to meet 150 messages this week%',
          lastWeekStart
        );

      if (!existing) {
        await db.prepare(
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

    console.log(`Checked weekly quotas and issued ${infractionsIssued} infractions`);
  } catch (error) {
    console.error('Error checking weekly quotas:', error);
  }
}

// Schedule weekly quota check (every Monday at 12:00 AM UTC)
cron.schedule('0 0 * * 1', checkWeeklyQuotas, {
  timezone: 'UTC',
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL(s): ${FRONTEND_URLS.join(', ')}`);
});

