import axios from 'axios';

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

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
    const response = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI!,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data = response.data as DiscordTokenResponse;
    return data.access_token;
  } catch (error: any) {
    console.error('Error exchanging Discord code:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Discord API Error:', JSON.stringify(error.response.data, null, 2));
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
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    redirect_uri: REDIRECT_URI!,
    response_type: 'code',
    scope: 'identify email',
  });

  if (state) {
    params.append('state', state);
  }

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

