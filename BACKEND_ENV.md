# Backend Environment Variables

## Required Variables

### Database (MongoDB)
```bash
# MongoDB connection string
# Can use either MONGODB_URI or DATABASE_URL
MONGODB_URI=mongodb+srv://blakeflyz1_db_user:hswGdJ3sqfdjOLAw@rankbloxstaff.xdjanot.mongodb.net/?appName=RankBloxStaff
# OR
DATABASE_URL=mongodb+srv://blakeflyz1_db_user:hswGdJ3sqfdjOLAw@rankbloxstaff.xdjanot.mongodb.net/?appName=RankBloxStaff

# Database name (optional, defaults to 'rankblox_staff')
DB_NAME=rankblox_staff
```

### Discord OAuth
```bash
# Discord Application Client ID
DISCORD_CLIENT_ID=your_discord_client_id

# Discord Application Client Secret
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Discord OAuth Redirect URI (must match Discord Developer Portal)
# Example: https://your-backend-domain.com/api/auth/discord/callback
DISCORD_REDIRECT_URI=https://your-backend-domain.com/api/auth/discord/callback
```

### JWT Security
```bash
# JWT secret for token signing (use a strong random string)
# Generate with: openssl rand -hex 32
JWT_SECRET=your-strong-random-secret-key-here
```

### Roblox Configuration
```bash
# Roblox Group ID (RankBlox HQ)
ROBLOX_GROUP_ID=5097017
```

### Frontend URL (for CORS and OAuth redirects)
```bash
# Single frontend URL
FRONTEND_URL=https://your-frontend-domain.com

# OR multiple URLs (comma-separated)
FRONTEND_URLS=https://your-frontend-domain.com,https://another-domain.com
```

### Bot Integration
```bash
# Shared secret token for bot <-> backend communication
# Must match the BOT_API_TOKEN in bot environment
BOT_API_TOKEN=your-long-random-secret-token

# Bot API URL (optional, defaults to http://localhost:3001)
# Production: https://rankblox-dash-706270663868.europe-west1.run.app
BOT_API_URL=https://rankblox-dash-706270663868.europe-west1.run.app
```

## Optional Variables

### Server Configuration
```bash
# Port to run the server on (defaults to 8080)
PORT=8080

# Node environment (production/development)
NODE_ENV=production
```

### Admin Reset Token (for password reset endpoint)
```bash
# Optional: Token for admin password reset endpoint
ADMIN_RESET_TOKEN=your-admin-reset-token
```

### Guild ID (for bot operations)
```bash
# Optional: Discord Guild/Server ID (used by bot for some operations)
GUILD_ID=your_discord_guild_id
```

## Complete Example

```bash
# Database
MONGODB_URI=mongodb+srv://blakeflyz1_db_user:hswGdJ3sqfdjOLAw@rankbloxstaff.xdjanot.mongodb.net/?appName=RankBloxStaff
DB_NAME=rankblox_staff

# Discord OAuth
DISCORD_CLIENT_ID=1413264592368435382
DISCORD_CLIENT_SECRET=your_discord_client_secret
# NOTE: DISCORD_REDIRECT_URI is now hardcoded in the code
# The redirect URI is: https://rankblox-dash-backend-706270663868.europe-west1.run.app/api/auth/discord/callback
# Make sure this EXACT URL is configured in your Discord app settings
# DISCORD_REDIRECT_URI=https://rankblox-dash-backend-706270663868.europe-west1.run.app/api/auth/discord/callback

# Security
JWT_SECRET=your-strong-random-secret-key-generated-with-openssl-rand-hex-32

# Roblox
ROBLOX_GROUP_ID=5097017

# Frontend
FRONTEND_URL=https://staff.rankblox.xyz

# Bot Integration
BOT_API_TOKEN=your-long-random-secret-token-must-match-bot
BOT_API_URL=https://rankblox-dash-706270663868.europe-west1.run.app

# Server
PORT=8080
NODE_ENV=production
```

