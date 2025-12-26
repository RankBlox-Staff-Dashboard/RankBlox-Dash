# Backend API

Express.js backend server for the AHS Staff Management System.

## Environment Variables

Create a `.env` file in this directory:

```env
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
JWT_SECRET=your_jwt_secret
ROBLOX_GROUP_ID=32350433
BOT_API_TOKEN=your_long_random_token  # Must match the bot's BOT_API_TOKEN (required for /api/bot/*)
PORT=3000
DATABASE_PATH=./data/staff.db
FRONTEND_URL=http://localhost:5173
```

Note: The EasyPOS activity API token is hardcoded in the backend code.

## API Endpoints

### Auth
- `GET /api/auth/discord` - Initiate Discord OAuth
- `GET /api/auth/discord/callback` - OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Verification
- `POST /api/verification/roblox/request` - Generate emoji verification code
- `POST /api/verification/roblox/verify` - Verify Roblox account
- `GET /api/verification/roblox/status` - Check verification status

### Dashboard
- `GET /api/dashboard/stats` - Get user stats
- `GET /api/dashboard/infractions` - Get user infractions
- `GET /api/dashboard/analytics` - Get platform analytics (admin only)

### Tickets
- `GET /api/tickets` - List tickets
- `POST /api/tickets/:id/claim` - Claim ticket
- `POST /api/tickets/:id/resolve` - Resolve ticket

### Management (Admin Only)
- `GET /api/management/users` - List all staff
- `PUT /api/management/users/:id/permissions` - Update user permissions
- `PUT /api/management/users/:id/status` - Update user status
- `GET /api/management/tracked-channels` - Get tracked channels
- `POST /api/management/tracked-channels` - Add tracked channel
- `DELETE /api/management/tracked-channels/:id` - Remove tracked channel

### Permissions
- `GET /api/permissions` - Get current user's permissions
- `GET /api/permissions/check` - Check specific permission

### Bot Integration
- `POST /api/bot/activity` - Update user activity (from bot)
- `POST /api/bot/tickets` - Create ticket (from bot)
- `GET /api/bot/user/:discord_id` - Get user by Discord ID
- `GET /api/bot/tracked-channels` - Get tracked channels (for bot)
- `POST /api/bot/roblox-minutes` - Fetch and update user minutes from EasyPOS API (requires `ACTIVITY_API_TOKEN`)

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm start
```

