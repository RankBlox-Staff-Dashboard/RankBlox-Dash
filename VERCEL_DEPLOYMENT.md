# Vercel Deployment Configuration

## Frontend Deployment on Vercel

### Configuration Settings:

**Project Name:** `staffapp`

**Framework Preset:** `Vite` (or `Other` if Vite isn't available)

**Root Directory:** `./frontend`

**Build Command:** `npm run build`
- Or use: `npm run vercel-build`

**Output Directory:** `dist`
- This is where Vite outputs the built files

**Install Command:** `npm install`

**Node.js Version:** 18.x or 20.x (set in Vercel project settings)

### Environment Variables:

Add these in Vercel's Environment Variables section:

```
VITE_API_URL=https://your-backend-url.com/api
```

**Important:** Replace `https://your-backend-url.com/api` with your actual backend API URL (where you deploy your Express backend).

### Alternative: Monorepo Setup

If you want to deploy from the root:

**Root Directory:** `./`

**Build Command:** `cd frontend && npm install && npm run build`

**Output Directory:** `frontend/dist`

## Backend Deployment

**Note:** Vercel is not ideal for the backend because:
- SQLite database needs persistent storage (not available on Vercel serverless)
- Discord bot needs to run continuously (serverless functions timeout)
- Node-cron jobs won't work in serverless environment

### Recommended Backend Deployment Options:

1. **Railway** (Recommended)
   - Deploy backend there
   - Supports persistent volumes for SQLite
   - Can run Discord bot continuously

2. **Render**
   - Free tier available
   - Web services for backend
   - Worker services for Discord bot

3. **DigitalOcean/Railway/VPS**
   - Full control
   - Run both backend and bot together

### Backend Environment Variables:

```
DISCORD_CLIENT_ID=1413264592368435382
DISCORD_CLIENT_SECRET=Io4D-j14356IFptF-vB4ohghJtwNvbZp
DISCORD_REDIRECT_URI=https://your-backend-url.com/api/auth/discord/callback
JWT_SECRET=scpnox-staff-jwt-secret-2024-secure
ROBLOX_GROUP_ID=32350433
PORT=3000
DATABASE_PATH=./data/staff.db
FRONTEND_URL=https://your-vercel-app.vercel.app
```

## Discord Bot Deployment

Deploy separately on Railway, Render, or a VPS:

### Bot Environment Variables:

```
DISCORD_BOT_TOKEN=your_bot_token_here
BACKEND_API_URL=https://your-backend-url.com/api
GUILD_ID=your_guild_id_here
```

## Deployment Steps:

1. **Deploy Frontend to Vercel:**
   - Connect GitHub repository
   - Set root directory to `./frontend`
   - Set build/output directories as above
   - Add `VITE_API_URL` environment variable

2. **Deploy Backend:**
   - Deploy to Railway/Render/VPS
   - Set all backend environment variables
   - Update `DISCORD_REDIRECT_URI` and `FRONTEND_URL` with your actual URLs

3. **Update Frontend Environment Variable:**
   - In Vercel, update `VITE_API_URL` to point to your deployed backend
   - Redeploy frontend

4. **Deploy Discord Bot:**
   - Deploy to Railway/Render/VPS
   - Set bot environment variables
   - Ensure bot can reach backend API

## Quick Vercel CLI Deployment:

```bash
cd frontend
npm install -g vercel
vercel
```

Follow the prompts and set:
- Root directory: `./frontend` or just deploy from frontend folder
- Build command: `npm run build`
- Output directory: `dist`

