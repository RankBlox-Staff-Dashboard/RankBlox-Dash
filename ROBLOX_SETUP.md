# Roblox Staff Minutes Tracker Setup

This guide explains how to set up the Roblox server script to track staff minutes in-game.

## Files

- `roblox-staff-minutes-tracker.server.lua` - The Roblox server script that tracks player minutes

## Setup Instructions

### 1. Configure the Script

Open `roblox-staff-minutes-tracker.server.lua` and update these configuration values:

```lua
local API_URL = "https://your-api-url.com/api/bot/roblox-minutes" -- Replace with your actual API URL
local BOT_API_TOKEN = "your_bot_api_token_here" -- Replace with your BOT_API_TOKEN from .env
```

**Important:**
- `API_URL` should be your backend API URL (e.g., `https://api.yourdomain.com/api/bot/roblox-minutes`)
- `BOT_API_TOKEN` must match the `BOT_API_TOKEN` value in your backend `.env` file

### 2. Add Script to Roblox Game

1. Open your Roblox game in Roblox Studio
2. In the Explorer window, find **ServerScriptService**
3. Right-click on **ServerScriptService** → **Insert Object** → **Script**
4. Rename the script to `StaffMinutesTracker`
5. Delete the default code in the script
6. Copy and paste the entire contents of `roblox-staff-minutes-tracker.server.lua` into the script
7. Update the configuration values (API_URL and BOT_API_TOKEN) as described above
8. Save and publish your game

### 3. How It Works

- The script tracks when players join the game
- Every 60 seconds (configurable via `UPDATE_INTERVAL`), it calculates how many minutes each player has been in-game
- It sends this data to your backend API
- When a player leaves, it sends a final update
- The backend stores the minutes in the `activity_logs` table for the current week
- The staff analytics page displays these minutes

### 4. Testing

1. Join your Roblox game with a verified staff account
2. Wait at least 1 minute
3. Check the Roblox Studio output window for log messages like:
   - `[Staff Tracker] Started tracking player: ...`
   - `[Staff Tracker] Successfully sent X minutes for user ...`
4. Check your staff analytics page to see if minutes are being tracked

### 5. Troubleshooting

**Minutes not appearing:**
- Verify the API_URL is correct and accessible
- Verify the BOT_API_TOKEN matches your backend `.env` file
- Check the Roblox Studio output for error messages
- Ensure the player's Roblox ID is linked to their account in the staff portal

**API errors:**
- Check that your backend server is running
- Verify the endpoint `/api/bot/roblox-minutes` is accessible
- Check backend logs for errors

**Note:** The script tracks minutes per session. If a player leaves and rejoins, the new session starts from 0 minutes. The backend uses the maximum value to prevent decreasing totals due to script resets.

