# Complete Environment Variable Setup Guide

## Render (Backend) Environment Variables

Copy these to: **Render Dashboard → Your Service → Environment**

```env
DATABASE_URL=postgresql://session_88kg_user:RDZ2tfqz8PViityji56kJZTJL6IHzvmq@dpg-d5484hv5r7bs73e8v6f0-a.virginia-postgres.render.com/session_88kg
DISCORD_CLIENT_ID=1413264592368435382
DISCORD_CLIENT_SECRET=Io4D-j14356IFptF-vB4ohghJtwNvbZp
DISCORD_REDIRECT_URI=https://staffapp-9q1t.onrender.com/api/auth/discord/callback
JWT_SECRET=scpnox-staff-jwt-secret-2024-secure
ROBLOX_GROUP_ID=32350433
PORT=10000
NODE_ENV=production
FRONTEND_URL=https://staffapp-opal.vercel.app
```

---

## Vercel (Frontend) Environment Variables

Copy these to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

```env
VITE_API_URL=https://staffapp-9q1t.onrender.com/api
```

---

## Discord Developer Portal Configuration

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (Client ID: 1413264592368435382)
3. Go to **OAuth2** → **General**
4. Under **Redirects**, add:
   ```
   https://staffapp-9q1t.onrender.com/api/auth/discord/callback
   ```
5. Click **Save Changes**

**⚠️ Important:** The redirect URI in Discord MUST exactly match the `DISCORD_REDIRECT_URI` in your Render environment variables.

**✅ Your actual redirect URI:** `https://staffapp-9q1t.onrender.com/api/auth/discord/callback`

---

## Quick Setup Checklist

- [ ] Deploy backend to Render
- [ ] Get your Render service URL (e.g., `https://ahs-staff-backend.onrender.com`)
- [ ] Set all Render environment variables (replace `your-backend-name`)
- [ ] Set `VITE_API_URL` in Vercel (replace `your-backend-name`)
- [ ] Add redirect URI to Discord Developer Portal (must match Render `DISCORD_REDIRECT_URI`)
- [ ] Redeploy both frontend and backend
- [ ] Test Discord OAuth login

---

## Your Actual Configuration Values

**Render:**
```
DISCORD_REDIRECT_URI=https://staffapp-9q1t.onrender.com/api/auth/discord/callback
FRONTEND_URL=https://staffapp-opal.vercel.app
```

**Vercel:**
```
VITE_API_URL=https://staffapp-9q1t.onrender.com/api
```

**Discord Developer Portal:**
```
https://staffapp-9q1t.onrender.com/api/auth/discord/callback
```

