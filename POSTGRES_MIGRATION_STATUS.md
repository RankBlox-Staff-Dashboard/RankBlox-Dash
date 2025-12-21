# PostgreSQL Migration Status

## ✅ Completed:
- Updated package.json (replaced better-sqlite3 with pg)
- Created new database.ts with PostgreSQL connection pool
- Created db-helpers.ts utility functions
- Converted auth.ts routes to async PostgreSQL queries
- Converted auth.ts middleware to async

## 🔄 Still Need to Convert:

The following files still use SQLite syntax and need to be converted:

1. **backend/src/routes/verification.ts** - Verification routes
2. **backend/src/routes/dashboard.ts** - Dashboard stats and infractions
3. **backend/src/routes/tickets.ts** - Ticket management
4. **backend/src/routes/management.ts** - Admin management routes
5. **backend/src/routes/bot.ts** - Bot integration routes
6. **backend/src/routes/permissions.ts** - Permission routes
7. **backend/src/services/permissions.ts** - Permission service
8. **backend/src/server.ts** - Server initialization (cron jobs)

## SQLite to PostgreSQL Conversion Pattern:

**SQLite:**
```typescript
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
db.prepare('INSERT INTO users (...) VALUES (?, ?)').run(val1, val2);
const users = db.prepare('SELECT * FROM users').all();
```

**PostgreSQL (async):**
```typescript
const user = await dbGet('SELECT * FROM users WHERE id = $1', [id]);
await dbRun('INSERT INTO users (...) VALUES ($1, $2)', [val1, val2]);
const users = await dbAll('SELECT * FROM users');
```

**Key Differences:**
- Use `$1, $2, $3` instead of `?` for parameters
- Use `await` for all database operations
- Use `RETURNING *` to get inserted row data
- Use `ON CONFLICT ... DO UPDATE` instead of `INSERT OR REPLACE`
- Use `NOW()` instead of `datetime("now")`
- Use `CURRENT_TIMESTAMP` instead of `CURRENT_TIMESTAMP` (same but different context)

