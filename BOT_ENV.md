# Bot Environment Variables

## Required Variables

### Discord Bot Token
```bash
# Discord Bot Token from Discord Developer Portal
# Get from: https://discord.com/developers/applications → Your Bot → Bot → Token
DISCORD_BOT_TOKEN=your_discord_bot_token
```

### Backend API Integration
```bash
# Backend API URL
# Example: https://rankblox-dash-backend-706270663868.europe-west1.run.app/api
BACKEND_API_URL=https://rankblox-dash-backend-706270663868.europe-west1.run.app/api

# Shared secret token for bot <-> backend communication
# Must match the BOT_API_TOKEN in backend environment
BOT_API_TOKEN=your-long-random-secret-token
```

## Optional Variables

### Server Configuration
```bash
# Port for bot HTTP server (defaults to 3001)
PORT=3001

# Node environment (production/development)
NODE_ENV=production
```

### Guild ID (for command registration)
```bash
# Optional: Discord Guild/Server ID
# If set, commands will be registered to this specific guild (faster)
# If not set, commands will be registered globally (can take up to 1 hour)
GUILD_ID=your_discord_guild_id
```

## Complete Example

```bash
# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token_here

# Backend Integration
BACKEND_API_URL=https://rankblox-dash-backend-706270663868.europe-west1.run.app/api
BOT_API_TOKEN=your-long-random-secret-token-must-match-backend

# Server
PORT=3001
NODE_ENV=production

# Optional
GUILD_ID=your_discord_guild_id
```

## Important Notes

1. **BOT_API_TOKEN**: Must be the same value in both backend and bot environments
2. **DISCORD_BOT_TOKEN**: Get this from Discord Developer Portal → Your Application → Bot → Token
3. **BACKEND_API_URL**: Should point to your backend API (include `/api` at the end)
4. **GUILD_ID**: Optional but recommended for faster command registration during development

## Ticket Categories

The bot automatically monitors these Discord category IDs for tickets:
- `980275354704953415`
- `993210302185345124`

Make sure your bot has access to channels in these categories in the main Discord server.

