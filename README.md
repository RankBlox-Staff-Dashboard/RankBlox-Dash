# AHS Staff Management System

A comprehensive full-stack staff management platform for Roblox/Discord communities, featuring authentication, verification, activity tracking, ticket management, and analytics.

## Architecture

The system consists of three separate services:

1. **React Frontend** - Dashboard UI built with Vite, TypeScript, Tailwind CSS
2. **Backend API** - Node.js/Express server handling auth, verification, permissions
3. **Discord Bot** - Node.js bot for verification, message tracking, ticket management

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Discord Bot Token
- Discord OAuth Application (Client ID and Secret)
- Roblox Group ID: 32350433

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
DISCORD_CLIENT_ID=1413264592368435382
DISCORD_CLIENT_SECRET=Io4D-j14356IFptF-vB4ohghJtwNvbZp
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
JWT_SECRET=scpnox-staff-jwt-secret-2024-secure
ROBLOX_GROUP_ID=32350433
PORT=3000
DATABASE_PATH=./data/staff.db
FRONTEND_URL=http://localhost:5173
```

4. Run the backend server:
```bash
npm run dev
```

The backend will start on `http://localhost:3000` and initialize the SQLite database.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:3000/api
```

4. Run the frontend development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`.

### Discord Bot Setup

1. Navigate to the bot directory:
```bash
cd bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the bot directory:
```env
DISCORD_BOT_TOKEN=your_bot_token_here
BACKEND_API_URL=http://localhost:3000/api
GUILD_ID=your_guild_id_here  # Optional, for faster command registration
```

4. Run the bot:
```bash
npm run dev
```

## Features

### Authentication & Verification

- **Discord OAuth**: Users log in with Discord
- **Roblox Verification**: Users verify their Roblox account by placing an emoji code in their bio/status
- **Rank Detection**: Automatically detects user's rank in Roblox group (1-15 = Staff, 16-255 = Admin)

### Dashboard Features

- **Activity Tracking**: Weekly message quota tracking (150 messages/week)
- **Ticket Management**: Claim and resolve support tickets
- **Infraction System**: Automated infractions for missed quotas
- **Analytics**: Personal and platform-wide statistics
- **Management Panel**: Admin-only panel for user and permission management

### Permission System

- **Rank-Based Permissions**: Default permissions based on rank
- **Permission Overrides**: Admins can override individual user permissions
- **Route Protection**: All routes protected by backend permission checks

### Discord Bot Commands

- `/verify <emoji_code>` - Verify Roblox account (information command)
- `/ticket create [description]` - Create a support ticket
- `/ticket close` - Close current ticket channel
- `/stats` - View personal statistics

### Activity Tracking

- Messages in tracked channels are automatically counted
- Weekly quotas reset every Monday at 12:00 AM UTC
- Automatic infraction issuance for missed quotas

## Project Structure

```
/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API client services
│   │   ├── types/        # TypeScript types
│   │   └── App.tsx       # Main app component
├── backend/               # Express API server
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, permissions, validation
│   │   ├── models/       # Database models
│   │   └── server.ts     # Server entry point
└── bot/                   # Discord bot
    ├── src/
    │   ├── commands/     # Bot commands
    │   ├── events/       # Event handlers
    │   └── index.ts      # Bot entry point
```

## Security Considerations

- All Roblox API calls are server-side only
- JWT tokens with 7-day expiration
- Permission checks on every protected route
- SQL injection prevention (parameterized queries)
- CORS configuration for frontend domain
- Discord bot token never exposed to frontend

## License

ISC
