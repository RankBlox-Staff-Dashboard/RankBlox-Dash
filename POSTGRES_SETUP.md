# PostgreSQL Setup for Render

## Environment Variable

Add this to your Render backend service environment variables:

**Key:** `DATABASE_URL`  
**Value:** `postgresql://session_88kg_user:RDZ2tfqz8PViityji56kJZTJL6IHzvmq@dpg-d5484hv5r7bs73e8v6f0-a.virginia-postgres.render.com/session_88kg`

(Use the **External** connection string, not the Internal one)

## Complete Environment Variables for Render

```
DATABASE_URL=postgresql://session_88kg_user:RDZ2tfqz8PViityji56kJZTJL6IHzvmq@dpg-d5484hv5r7bs73e8v6f0-a.virginia-postgres.render.com/session_88kg
DISCORD_CLIENT_ID=1413264592368435382
DISCORD_CLIENT_SECRET=Io4D-j14356IFptF-vB4ohghJtwNvbZp
DISCORD_REDIRECT_URI=https://your-backend-name.onrender.com/api/auth/discord/callback
JWT_SECRET=scpnox-staff-jwt-secret-2024-secure
ROBLOX_GROUP_ID=32350433
PORT=10000
FRONTEND_URL=https://staff.ahscampus.com
NODE_ENV=production
```

**Important:** Replace `your-backend-name` with your actual Render service name.

## Migration Status

I've started converting from SQLite to PostgreSQL. The core authentication system has been converted, but several route files still need conversion. The app will work for authentication/OAuth, but other features may need the remaining files converted.

## Next Steps

1. Set the `DATABASE_URL` environment variable in Render
2. Deploy the backend - the database schema will be created automatically on first run
3. Test the OAuth flow - this should work now
4. Additional features (verification, dashboard, tickets, etc.) will need the remaining files converted to PostgreSQL

