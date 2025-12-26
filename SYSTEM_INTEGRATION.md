# Staff Minutes Tracking System - Complete Integration

## System Overview

This document describes the complete integration between the Roblox game, backend API, and frontend dashboard for tracking staff minutes in-game.

## Data Flow

```
Roblox Game → Backend API → Database → Frontend Dashboard
```

### 1. Roblox Script (`roblox-staff-minutes-tracker.server.lua`)

**Location:** Place in `ServerScriptService` in Roblox Studio

**Configuration:**
- `API_URL`: `https://staff.ahscampus.com/api/bot/roblox-minutes`
- `BOT_API_TOKEN`: `9f3c2e8b7a4d6f1a0c5e92d8b4a7e3f1`
- `UPDATE_INTERVAL`: 60 seconds

**What it does:**
- Tracks when players join the game
- Calculates minutes played per session
- Sends updates to API every 60 seconds
- Sends final update when player leaves

**Data sent:**
```json
{
  "roblox_username": "BlakeGamez0",
  "minutes": 5
}
```

### 2. Backend API (`/api/bot/roblox-minutes`)

**Endpoint:** `POST /api/bot/roblox-minutes`

**Authentication:** Requires `X-Bot-Token` header

**Request:**
```json
{
  "roblox_username": "BlakeGamez0",
  "minutes": 5
}
```

**What it does:**
1. Validates request (username and minutes)
2. Looks up user by `roblox_username` (case-insensitive)
3. Gets current week start date
4. Updates or creates `activity_logs` entry
5. Uses `MAX()` to prevent decreasing values
6. Returns success response

**Response:**
```json
{
  "message": "Minutes updated successfully",
  "minutes": 5,
  "user_id": 1,
  "roblox_username": "BlakeGamez0",
  "week_start": "2025-12-22"
}
```

### 3. Database (`activity_logs` table)

**Table Structure:**
- `id` (INT, PRIMARY KEY)
- `user_id` (INT, FOREIGN KEY to users.id)
- `week_start` (DATE)
- `messages_sent` (INT, DEFAULT 0)
- `tickets_claimed` (INT, DEFAULT 0)
- `tickets_resolved` (INT, DEFAULT 0)
- `minutes` (INT, DEFAULT 0) ← **NEW COLUMN**

**Storage:**
- Minutes are stored per user per week
- Uses `MAX()` to track highest session time
- Prevents decreasing if script resets

### 4. Frontend Display

#### ProfileCard Component
**Location:** `frontend/src/components/ProfileCard.tsx`

**Displays:**
- Minutes stat card with clock icon
- Shows: `{stats?.minutes ?? 0}m`
- Updates every 30 seconds via `useStats()` hook

#### Analytics Page
**Location:** `frontend/src/app/(dashboard)/analytics/page.tsx`

**Displays:**
- Minutes for each staff member
- Shows: `{member.minutes || 0}m`
- Displays total minutes across all weeks

#### Dashboard Stats Endpoint
**Location:** `backend/src/routes/dashboard.ts`

**Endpoint:** `GET /api/dashboard/stats`

**Returns:**
```json
{
  "messages_sent": 50,
  "messages_quota": 150,
  "tickets_claimed": 2,
  "tickets_resolved": 1,
  "minutes": 25,
  "infractions": 0,
  "week_start": "2025-12-22"
}
```

## Complete Integration Checklist

### ✅ Roblox Script
- [x] Sends `roblox_username` (not `roblox_id`)
- [x] Uses correct API URL
- [x] Uses correct BOT_API_TOKEN
- [x] Sends minutes as integer
- [x] Includes debug logging

### ✅ Backend API
- [x] Accepts `roblox_username` parameter
- [x] Case-insensitive username lookup
- [x] Validates input types
- [x] Updates `activity_logs.minutes` column
- [x] Returns proper response
- [x] Includes error handling

### ✅ Database
- [x] `minutes` column exists in `activity_logs` table
- [x] Column type: INT DEFAULT 0
- [x] Properly indexed for lookups

### ✅ Frontend
- [x] ProfileCard displays minutes
- [x] Analytics page displays minutes
- [x] Stats interface includes minutes field
- [x] Dashboard endpoint returns minutes

## Testing

### Test the Complete Flow

1. **Roblox Script Test:**
   - Player joins game
   - Wait 60+ seconds
   - Check Roblox Studio output for success messages

2. **API Test:**
   ```bash
   curl -X POST https://staff.ahscampus.com/api/bot/roblox-minutes \
     -H "Content-Type: application/json" \
     -H "X-Bot-Token: 9f3c2e8b7a4d6f1a0c5e92d8b4a7e3f1" \
     -d '{"roblox_username":"BlakeGamez0","minutes":10}'
   ```

3. **Database Verification:**
   ```sql
   SELECT u.roblox_username, al.minutes, al.week_start 
   FROM activity_logs al 
   JOIN users u ON al.user_id = u.id 
   WHERE u.roblox_username = 'BlakeGamez0';
   ```

4. **Frontend Verification:**
   - Login to staff portal
   - Check ProfileCard for minutes display
   - Check Analytics page for staff minutes

## Troubleshooting

### Minutes not appearing
1. Check Roblox script is running and sending data
2. Verify API endpoint is accessible
3. Check backend logs for errors
4. Verify user exists in database with correct `roblox_username`
5. Check database `activity_logs` table has `minutes` column

### API returns 404
- Backend code may not be deployed
- Verify endpoint exists: `/api/bot/roblox-minutes`
- Check authentication token is correct

### Minutes not updating
- Check if minutes are increasing (backend uses MAX)
- Verify week_start is correct
- Check database for existing entries

## Deployment Notes

1. **Backend:** Deploy updated code with `roblox_username` support
2. **Database:** Ensure `minutes` column exists (already added)
3. **Frontend:** Already updated, no deployment needed
4. **Roblox:** Update script in Roblox Studio with correct token

## Status

✅ **All components connected and ready**
- Roblox script configured
- Backend code updated
- Database schema updated
- Frontend displays minutes

**Next Step:** Deploy backend code to production

