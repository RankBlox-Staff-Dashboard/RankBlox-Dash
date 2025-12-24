import { useState, useEffect } from 'react';

const AVATAR_CACHE = new Map<string, string>();

/**
 * Fetches the Roblox avatar URL for a given user ID.
 * Uses the official Roblox Thumbnails API and caches results.
 */
export function useRobloxAvatar(robloxId: string | null, size: '150x150' | '420x420' = '150x150') {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!robloxId) {
      setAvatarUrl(null);
      return;
    }

    const cacheKey = `${robloxId}:${size}`;
    
    // Check cache first
    if (AVATAR_CACHE.has(cacheKey)) {
      setAvatarUrl(AVATAR_CACHE.get(cacheKey)!);
      return;
    }

    let cancelled = false;

    async function fetchAvatar() {
      setLoading(true);
      setError(null);

      try {
        // Use backend proxy to avoid CORS issues
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
        const proxyUrl = `${API_URL}/public/roblox-avatar/${robloxId}?size=${size}`;
        
        const response = await fetch(proxyUrl, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch avatar: ${response.status}`);
        }

        const data = await response.json();
        
        if (!cancelled && data.data && data.data.length > 0 && data.data[0].imageUrl) {
          const url = data.data[0].imageUrl;
          AVATAR_CACHE.set(cacheKey, url);
          setAvatarUrl(url);
        } else if (!cancelled) {
          // Fallback to default Roblox avatar
          setAvatarUrl(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching Roblox avatar:', err);
          setError(err instanceof Error ? err : new Error('Failed to fetch avatar'));
          setAvatarUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAvatar();

    return () => {
      cancelled = true;
    };
  }, [robloxId, size]);

  return { avatarUrl, loading, error };
}

/**
 * Get a fallback Discord avatar URL
 */
export function getDiscordAvatarUrl(
  discordId: string,
  discordAvatar: string | null
): string {
  if (discordAvatar) {
    return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png?size=128`;
  }
  // Default Discord avatar based on user ID
  const defaultIndex = parseInt(discordId.slice(-1)) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}
