import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './models/database';
import authRoutes from './routes/auth';
import verificationRoutes from './routes/verification';
import dashboardRoutes from './routes/dashboard';
import ticketsRoutes from './routes/tickets';
import managementRoutes from './routes/management';
import permissionsRoutes from './routes/permissions';
import botRoutes from './routes/bot';
import cron from 'node-cron';
import { db } from './models/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://staffap.netlify.app';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
  console.log(`Frontend URL: ${FRONTEND_URL}`);
});

