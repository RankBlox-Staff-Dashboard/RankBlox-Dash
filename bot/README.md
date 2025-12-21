# Discord Bot

Discord bot for the AHS Staff Management System.

## Environment Variables

Create a `.env` file in this directory:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
BACKEND_API_URL=http://localhost:3000/api
GUILD_ID=your_guild_id_here  # Optional, for faster command registration
```

## Commands

- `/verify <emoji_code>` - Verify Roblox account (information command)
- `/ticket create [description]` - Create a support ticket
- `/ticket close` - Close current ticket channel
- `/stats` - View personal statistics

## Features

- Tracks messages in tracked channels for activity quota
- Creates tickets when `/ticket create` is used
- Updates activity counts to backend API

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

## Bot Permissions Required

- Send Messages
- Read Message History
- Use Slash Commands
- Manage Channels (for ticket management)

