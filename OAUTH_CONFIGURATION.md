# OAuth Configuration for Your Deployment

## Current Setup

**Frontend URL:** `https://staff.ahscampus.com`

## Important: Backend Must Be Deployed Separately

Since Vercel is serverless and doesn't support:
- SQLite databases (no persistent storage)
- Long-running processes (Discord bot)
- Cron jobs

Your backend needs to be deployed on:
- Railway (recommended)
- Render
- DigitalOcean
- Or another VPS/hosting service

## Discord OAuth Redirect URI Configuration

### Step 1: Deploy Backend First

Deploy your backend to Railway/Render and get the backend URL:
- Example: `https://your-backend.railway.app` or `https://your-backend.onrender.com`

### Step 2: Set Backend Environment Variable

In your backend deployment (Railway/Render/etc.), set:

```
DISCORD_REDIRECT_URI=https://your-backend-url.com/api/auth/discord/callback
```

Replace `your-backend-url.com` with your actual backend deployment URL.

### Step 3: Add Redirect URI to Discord

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2** → **General**
4. Under **Redirects**, add:
   ```
   https://your-backend-url.com/api/auth/discord/callback
   ```
5. Click **Save Changes**

### Step 4: Set Frontend Environment Variable

In Vercel project settings, add:

**Key:** `VITE_API_URL`  
**Value:** `https://your-backend-url.com/api`

This tells the frontend where to find your backend API.

### Example Configuration

If your backend is at `https://ahs-staff-backend.railway.app`:

**Backend Environment Variables:**
```
DISCORD_REDIRECT_URI=https://ahs-staff-backend.railway.app/api/auth/discord/callback
FRONTEND_URL=https://staff.ahscampus.com
```

**Discord Developer Portal:**
Add redirect URI: `https://ahs-staff-backend.railway.app/api/auth/discord/callback`

**Vercel Environment Variables:**
```
VITE_API_URL=https://ahs-staff-backend.railway.app/api
```

## Summary

1. Deploy backend to Railway/Render
2. Get backend URL (e.g., `https://your-backend.railway.app`)
3. Set backend `DISCORD_REDIRECT_URI` to `https://your-backend.railway.app/api/auth/discord/callback`
4. Add the same URI to Discord Developer Portal
5. Set Vercel `VITE_API_URL` to `https://your-backend.railway.app/api`
6. Redeploy both frontend and backend

