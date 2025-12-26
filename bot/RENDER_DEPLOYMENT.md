# Bot Deployment on Render

This guide explains how to deploy the Discord bot to Render.

## Render Service Configuration

### Service Type: **Web Service**

Render needs to see this as a web service because it needs to:
- Listen on the PORT environment variable
- Provide health check endpoints
- Handle HTTP requests from the backend

### Render Dashboard Settings:

1. **Name:** `ahs-staff-bot` (or your preferred name)

2. **Region:** Choose closest to you

3. **Branch:** `main` (or your default branch)

4. **Root Directory:** `bot`

5. **Environment:** `Node`

6. **Build Command:**
   ```bash
   npm install && npm run build
   ```

7. **Start Command:**
   ```bash
   npm start
   ```

8. **Plan:** Free (or Paid)

### Health Check:

Render will automatically check `/health` endpoint. The bot will:
- Return `200 OK` when bot is ready and connected
- Return `503 Service Unavailable` when bot is still starting up

### Environment Variables:

Add these in Render Dashboard → Environment Variables:

```env
# Required: Discord Bot Token
DISCORD_BOT_TOKEN=your_discord_bot_token_here

# Required: Backend API URL (where your backend is deployed)
BACKEND_API_URL=https://your-backend-url.onrender.com/api
# OR if backend is on a different domain:
BACKEND_API_URL=https://ahsback.zenohost.co.uk/api

# Required: Shared secret token for bot-to-backend authentication
# Must match BOT_API_TOKEN in your backend environment variables
BOT_API_TOKEN=your_long_random_secure_token_here

# Optional: Guild ID for faster command registration
# If set, commands register to this guild (instant)
# If not set, commands register globally (can take up to 1 hour)
GUILD_ID=your_discord_guild_id_here

# Port is automatically set by Render - don't set this manually
# PORT=10000  # Render sets this automatically
```

### Important Notes:

1. **BOT_API_TOKEN Security:**
   - Generate a strong random token: `openssl rand -hex 32`
   - This token must match exactly between bot and backend
   - Used to authenticate bot → backend API calls

2. **Health Check:**
   - Render pings `/health` to verify the service is alive
   - Bot returns `503` while starting (this is normal)
   - Bot returns `200` once connected to Discord

3. **Graceful Shutdown:**
   - Bot handles SIGTERM (Render sends this when restarting)
   - Properly closes HTTP server and Discord client
   - Prevents connection issues during redeployments

4. **Build Process:**
   - TypeScript compiles to JavaScript in `dist/` folder
   - Ensure `dist/index.js` exists after build
   - Check build logs if startup fails

### Verification:

After deployment, check:

1. **Service Logs:**
   - Should see: "Bot HTTP server listening on port 10000"
   - Should see: "Ready! Logged in as BotName#1234"
   - Should see: "Registered X commands to guild..."

2. **Health Check:**
   ```bash
   curl https://your-bot-service.onrender.com/health
   ```
   Should return:
   ```json
   {
     "status": "ok",
     "service": "staffapp-bot",
     "bot_ready": true,
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

3. **Test Bot Commands:**
   - Try `/stats` in your Discord server
   - Try `/not-in-portal` to test the new command
   - Commands should respond in Discord

### Troubleshooting:

**Bot not connecting:**
- Check `DISCORD_BOT_TOKEN` is correct
- Check bot has proper permissions in Discord server
- Check bot is invited to the server

**Commands not appearing:**
- Wait up to 1 hour if using global commands (no GUILD_ID)
- Check logs for command registration errors
- Verify bot has "applications.commands" scope

**Health check failing:**
- Check build completed successfully
- Check `dist/index.js` exists
- Check PORT environment variable is set by Render

**Backend API calls failing:**
- Verify `BACKEND_API_URL` is correct
- Verify `BOT_API_TOKEN` matches backend
- Check backend is accessible from Render

### Render Free Tier Limitations:

- Service sleeps after 15 minutes of inactivity
- Takes ~30 seconds to wake up
- Health checks will fail during sleep
- Consider paid plan for 24/7 availability

