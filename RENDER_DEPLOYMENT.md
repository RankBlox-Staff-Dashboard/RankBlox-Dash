# Render Deployment Guide

## Important: SQLite Limitation on Render Free Tier

⚠️ **Render's free tier has ephemeral (non-persistent) disk storage**. This means:
- SQLite database files will be **lost on every deployment/restart**
- Data won't persist between deployments
- **This makes SQLite unsuitable for production on Render free tier**

### Solutions:

1. **Use Railway** (Recommended)
   - Railway has persistent volumes on free tier
   - Better suited for SQLite
   - See `RAILWAY_DEPLOYMENT.md` for instructions

2. **Upgrade Render to Paid Plan**
   - Paid plans have persistent disk storage
   - SQLite will work properly

3. **Use PostgreSQL** (Alternative)
   - Render offers free PostgreSQL databases
   - Would require changing the database layer
   - More work but more reliable

## Render Configuration (If You Still Want to Use It)

### Service Settings:

**Service Type:** Web Service

**Configuration:**
- **Name:** `ahs-staff-backend`
- **Region:** Choose closest to you
- **Branch:** `main`
- **Root Directory:** `backend`
- **Environment:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Plan:** Free (or Paid for persistent storage)

### Environment Variables:

```
DISCORD_CLIENT_ID=1413264592368435382
DISCORD_CLIENT_SECRET=Io4D-j14356IFptF-vB4ohghJtwNvbZp
DISCORD_REDIRECT_URI=https://your-service-name.onrender.com/api/auth/discord/callback
JWT_SECRET=scpnox-staff-jwt-secret-2024-secure
ROBLOX_GROUP_ID=32350433
BOT_API_TOKEN=your-long-random-token
PORT=10000
DATABASE_PATH=./data/staff.db
FRONTEND_URL=https://staff.ahscampus.com
NODE_ENV=production
```

**Important Notes:**
- Replace `your-service-name` with your actual Render service name
- Port should be set to `10000` for Render (or use `PORT` env var)
- Database will reset on each deployment (free tier limitation)

### Fixing the better-sqlite3 Build Error

The package.json has been updated with:
- `postinstall` script to rebuild better-sqlite3
- Updated build command to rebuild native modules

This should fix the "invalid ELF header" error by ensuring better-sqlite3 is compiled for Linux during the build.

### After Deployment:

1. Get your Render service URL (e.g., `https://ahs-staff-backend.onrender.com`)
2. Add to Discord OAuth redirect URIs: `https://ahs-staff-backend.onrender.com/api/auth/discord/callback`
3. Set Vercel `VITE_API_URL` to: `https://ahs-staff-backend.onrender.com/api`

## Recommendation

**Use Railway instead** - it's better suited for this project because:
- ✅ Persistent storage on free tier
- ✅ SQLite works properly
- ✅ Easier deployment
- ✅ Better for Node.js apps with databases

