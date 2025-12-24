# Discord OAuth Troubleshooting: token_exchange_failed

## Common Causes

The `token_exchange_failed` error occurs when Discord rejects the token exchange request. Here are the most common causes:

### 1. Redirect URI Mismatch (Most Common)

**Problem:** The `redirect_uri` used in the token exchange doesn't match:
- The `redirect_uri` used in the initial authorization URL
- The `redirect_uri` registered in Discord Developer Portal

**Solution:**
1. Check your Render environment variable `DISCORD_REDIRECT_URI`
2. Check Discord Developer Portal → OAuth2 → Redirects
3. They must match **exactly** (including `https://`, trailing slashes, etc.)

**Your current setup should be:**
```
DISCORD_REDIRECT_URI=https://ahsback.zenohost.co.uk/api/auth/discord/callback
```

**In Discord Developer Portal, you should have:**
```
https://staffapp-9q1t.onrender.com/api/auth/discord/callback
```

### 2. Client Secret Mismatch

**Problem:** The `DISCORD_CLIENT_SECRET` in Render doesn't match your Discord application.

**Solution:**
1. Go to Discord Developer Portal → Your Application → OAuth2
2. Click "Reset Secret" if needed
3. Copy the new secret
4. Update `DISCORD_CLIENT_SECRET` in Render environment variables

### 3. Code Already Used or Expired

**Problem:** OAuth codes can only be used once and expire quickly.

**Solution:** Try the login flow again - this should generate a fresh code.

### 4. Environment Variables Not Set

**Problem:** Missing or incorrect environment variables in Render.

**Solution:** Verify all these are set correctly in Render:
- `DISCORD_CLIENT_ID=1413264592368435382`
- `DISCORD_CLIENT_SECRET=Io4D-j14356IFptF-vB4ohghJtwNvbZp`
- `DISCORD_REDIRECT_URI=https://ahsback.zenohost.co.uk/api/auth/discord/callback`

## Debugging Steps

1. **Check Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for "Error exchanging Discord code" messages
   - Check for the detailed error from Discord API

2. **Verify Redirect URI in Both Places:**
   - Render: `DISCORD_REDIRECT_URI` environment variable
   - Discord: OAuth2 → Redirects section
   - They must match **exactly**

3. **Check Environment Variables:**
   - Make sure `DISCORD_CLIENT_SECRET` is correct
   - Make sure `DISCORD_CLIENT_ID` matches your application

4. **Try Reset:**
   - In Discord Developer Portal, try resetting the client secret
   - Update Render with the new secret
   - Redeploy the backend

## Quick Checklist

- [ ] `DISCORD_REDIRECT_URI` in Render matches exactly what's in Discord Developer Portal
- [ ] `DISCORD_CLIENT_SECRET` in Render matches your Discord application secret
- [ ] `DISCORD_CLIENT_ID` in Render matches your Discord application ID (1413264592368435382)
- [ ] Redirect URI in Discord Developer Portal is exactly: `https://staffapp-9q1t.onrender.com/api/auth/discord/callback`
- [ ] Backend has been redeployed after setting environment variables

## Most Likely Fix

The redirect URI mismatch is the #1 cause. Make absolutely sure:
1. Discord Developer Portal has: `https://staffapp-9q1t.onrender.com/api/auth/discord/callback`
2. Render has: `DISCORD_REDIRECT_URI=https://ahsback.zenohost.co.uk/api/auth/discord/callback`
3. Both match **character-for-character**

