'use client';

import Image from 'next/image';
import { User as UserIcon } from 'lucide-react';
import { useRobloxAvatar, getDiscordAvatarUrl } from '@/hooks/useRobloxAvatar';

interface RobloxAvatarProps {
  robloxId: string | null;
  discordId: string;
  discordAvatar: string | null;
  alt: string;
  size?: number;
  className?: string;
}

/**
 * Renders a user avatar, preferring Roblox if available, falling back to Discord.
 * Handles loading states and errors gracefully.
 */
export function RobloxAvatar({
  robloxId,
  discordId,
  discordAvatar,
  alt,
  size = 40,
  className = '',
}: RobloxAvatarProps) {
  const { avatarUrl: robloxAvatarUrl, loading, error } = useRobloxAvatar(robloxId);
  
  // Fallback to Discord avatar
  const discordAvatarUrl = getDiscordAvatarUrl(discordId, discordAvatar);
  
  // Use Roblox avatar if available and successfully loaded, otherwise Discord
  // Ensure we always have a valid URL (discordAvatarUrl is always valid)
  const avatarUrl = (robloxId && robloxAvatarUrl && !error) ? robloxAvatarUrl : discordAvatarUrl;
  
  // Show placeholder during initial Roblox avatar load if we have a roblox_id
  if (loading && robloxId) {
    return (
      <div 
        className={`rounded-full bg-white/10 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <UserIcon className="w-1/2 h-1/2 text-white/40" />
      </div>
    );
  }

  // Ensure we have a valid avatar URL (discordAvatarUrl is always valid, so this should never fail)
  if (!avatarUrl) {
    // Fallback to default Discord avatar if somehow both are missing
    const fallbackUrl = `https://cdn.discordapp.com/embed/avatars/0.png`;
    return (
      <Image
        src={fallbackUrl}
        alt={alt}
        width={size}
        height={size}
        className={`rounded-full ${className}`}
        unoptimized
      />
    );
  }

  return (
    <Image
      src={avatarUrl}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      unoptimized
    />
  );
}
