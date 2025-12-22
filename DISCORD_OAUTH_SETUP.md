# Discord OAuth Setup Guide

## The Problem
Discord requiress the redirect URI in the OAuth request to **exactly match** one of the redirect URIs registered in your Discord application settings.

## Step-by-Step Setup

### 1. Get Your Backend URL
Your backend should be deployed (Railway, Render, etc.). Get the full URL:
- Example: `https://your-backend.onrender.com` or `https://your-backend.railway.app`

### 2. Configure Backend Environment Variable

Set this in your backend environment variables:

```
DISCORD_REDIRECT_URI=https://your-backend-url.com/api/auth/discord/callback
```

**Important:** Replace `your-backend-url.com` with your actual backend URL.

### 3. Add Redirect URI to Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (Client ID: 1413264592368435382)
3. Go to **OAuth2** → **General**
4. Under **Redirects**, click **Add Redirect**
5. Add **exactly** this URI (replace with your backend URL):
   ```
   https://your-backend-url.com/api/auth/discord/callback
   ```
6. Click **Save Changes**

### 4. Common Redirect URI Examples

**For local development:**
```
http://localhost:3000/api/auth/discord/callback
```

**For production (Railway/Render/etc.):**
```
https://your-app.onrender.com/api/auth/discord/callback
https://your-app.railway.app/api/auth/discord/callback
https://your-backend.example.com/api/auth/discord/callback
```

### 5. Important Notes

- ✅ The redirect URI must **exactly match** (including `http://` vs `https://`)
- ✅ No trailing slashes
- ✅ The path must be `/api/auth/discord/callback`
- ✅ Both the backend `DISCORD_REDIRECT_URI` and Discord app redirect URI must match exactly
- ❌ Don't include query parameters in the registered URI
- ❌ Don't use `localhost` in production

### 6. Verify Configuration

1. Check backend environment variable is set correctly
2. Check Discord Developer Portal has the exact same URI
3. Restart your backend server after changing environment variables
4. Try the login flow again

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Make sure the URI in `DISCORD_REDIRECT_URI` exactly matches the one in Discord Developer Portal
- Check for typos, trailing slashes, or `http` vs `https` mismatch

**Error: "You must specify at least one URI"**
- Make sure you've added at least one redirect URI in Discord Developer Portal
- The URI must match what you're sending in the OAuth request

**Still not working?**
- Double-check both places have the exact same URL (copy-paste to avoid typos)
- Make sure your backend is accessible at that URL
- Check backend logs for errors

