import axios from 'axios';

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
// Hardcoded redirect URI - must point to backend endpoint, not frontend
// This MUST match exactly what's configured in Discord Developer Portal
const HARDCODED_REDIRECT_URI = 'https://rankblox-dash-backend-706270663868.europe-west1.run.app/api/auth/discord/callback';
// Always use hardcoded URL - ignore any environment variable
const REDIRECT_URI = HARDCODED_REDIRECT_URI;

// Validate required environment variables on module load
if (!CLIENT_ID) {
  console.error('[Discord OAuth] ❌ DISCORD_CLIENT_ID is not set');
}
if (!CLIENT_SECRET) {
  console.error('[Discord OAuth] ❌ DISCORD_CLIENT_SECRET is not set');
}

// Log the redirect URI being used (for debugging)
console.log('[Discord OAuth Config] Redirect URI:', REDIRECT_URI);
console.log('[Discord OAuth Config] Client ID:', CLIENT_ID ? 'SET' : 'NOT SET');

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

/**
 * Exchange Discord OAuth code for access token
 */
export async function exchangeDiscordCode(code: string): Promise<string | null> {
  try {
    console.log('[Discord OAuth] Exchanging code for token...');
    console.log('[Discord OAuth] Redirect URI:', REDIRECT_URI);
    console.log('[Discord OAuth] Client ID:', CLIENT_ID ? `SET (${CLIENT_ID.substring(0, 10)}...)` : 'NOT SET');
    console.log('[Discord OAuth] Client Secret:', CLIENT_SECRET ? 'SET (hidden)' : 'NOT SET');
    
    // Validate required configuration
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('[Discord OAuth] Missing required configuration: CLIENT_ID or CLIENT_SECRET');
      console.error('[Discord OAuth] Please check your environment variables:');
      console.error('[Discord OAuth]   - DISCORD_CLIENT_ID must be set');
      console.error('[Discord OAuth]   - DISCORD_CLIENT_SECRET must be set');
      return null;
    }
    
    // Validate that client secret is not empty or placeholder
    if (CLIENT_SECRET.trim().length === 0 || CLIENT_SECRET.includes('your_') || CLIENT_SECRET.includes('example')) {
      console.error('[Discord OAuth] Client secret appears to be invalid or placeholder');
      return null;
    }
    
    const response = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data = response.data as DiscordTokenResponse;
    console.log('[Discord OAuth] ✅ Token exchange successful');
    return data.access_token;
  } catch (error: any) {
    console.error('[Discord OAuth] ❌ Error exchanging code:', error.response?.data || error.message);
    if (error.response) {
      console.error('[Discord OAuth] Status:', error.response.status);
      console.error('[Discord OAuth] Response:', JSON.stringify(error.response.data, null, 2));
      
      // Provide helpful error messages for common issues
      if (error.response.status === 401 && error.response.data?.error === 'invalid_client') {
        console.error('[Discord OAuth] ⚠️  TROUBLESHOOTING:');
        console.error('[Discord OAuth]   1. Verify DISCORD_CLIENT_SECRET is correct in your environment variables');
        console.error('[Discord OAuth]   2. Check that the redirect URI in Discord Developer Portal matches EXACTLY:');
        console.error('[Discord OAuth]      ' + REDIRECT_URI);
        console.error('[Discord OAuth]   3. Ensure there are no trailing slashes or extra characters');
        console.error('[Discord OAuth]   4. Verify the Client ID matches your Discord application');
        console.error('[Discord OAuth]   5. Make sure you copied the full client secret (it\'s long)');
      }
    }
    return null;
  }
}

/**
 * Get Discord user info from access token
 */
export async function getDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  try {
    const response = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data as DiscordUser;
  } catch (error) {
    console.error('Error fetching Discord user:', error);
    return null;
  }
}

/**
 * Get Discord OAuth authorization URL
 */
export function getDiscordOAuthUrl(state?: string): string {
  if (!CLIENT_ID) {
    throw new Error('DISCORD_CLIENT_ID is not configured');
  }
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email',
  });

  if (state) {
    params.append('state', state);
  }

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

