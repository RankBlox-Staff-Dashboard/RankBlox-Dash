# EasyPOS API CORS Configuration

## Required CORS Allowlist Configuration

To allow the frontend to call the EasyPOS API directly, the following domain needs to be added to the EasyPOS API server's CORS allowlist:

### Domain to Add:
```
https://staff.ahscampus.com
```

### For Local Development (Optional):
```
http://localhost:3000
http://localhost:5173
```

## What Needs to Be Done

On the **EasyPOS API server** (`papi.easypos.lol`), configure CORS to allow requests from the frontend domain:

### Required CORS Headers:
```
Access-Control-Allow-Origin: https://staff.ahscampus.com
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Credentials: true (if needed)
```

### For Express.js Server (if you have access):
```javascript
app.use(cors({
  origin: [
    'https://staff.ahscampus.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));
```

## API Endpoint Being Called

**Endpoint:** `GET https://papi.easypos.lol/activity/data`

**Request Format (GET with query parameters):**
```
GET https://papi.easypos.lol/activity/data?token=...&userId=123
```

**Curl Example:**
```bash
curl -G https://papi.easypos.lol/activity/data \
  -H "Content-Type: application/json" \
  -d token="f4ce0b59a2b93faa733f9774e3a57f376d4108edca9252b2050661d8b36b50c5f16bd0ba45a9f22c8493a7a8a9d86f90" \
  -d userId=123
```

**Headers:**
```
Content-Type: application/json
```

## Current Implementation

The frontend (`frontend/src/services/api.ts`) is configured to call the EasyPOS API directly. Once CORS is configured on the EasyPOS API server, it will work without any proxy.

## Testing

After CORS is configured, test by:
1. Opening browser console on https://staff.ahscampus.com
2. Checking for API calls to `papi.easypos.lol`
3. Verifying no CORS errors appear

## Contact

If you need help configuring CORS on the EasyPOS API server, contact the EasyPOS API administrator/server owner.

