'use client';

import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { RankBadge } from './RankBadge';

export function ProfileCard() {
  const { user } = useAuth();

  if (!user) return null;

  // Discord avatar URL format: https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png
  // Since we don't have the avatar hash, we'll use the default avatar endpoint
  // Discord default avatars are 0-4, calculate based on last digit of Discord ID
  const avatarIndex = parseInt(user.discord_id.slice(-1)) % 5;
  const avatarUrl = `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;

  return (
    <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
      <div className="flex items-center space-x-4">
        <Image
          src={avatarUrl}
          alt={user.discord_username}
          width={64}
          height={64}
          className="w-16 h-16 rounded-full"
          unoptimized
        />
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">
            Welcome, Staff {user.discord_username}
          </h2>
          <div className="flex items-center space-x-2 mt-2">
            <RankBadge rank={user.rank} rankName={user.rank_name} />
            <span className="text-sm text-gray-400">•</span>
            <span className={`text-sm font-semibold ${user.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
              {user.status === 'active' ? 'Active' : user.status}
            </span>
          </div>
          {user.roblox_username && (
            <p className="text-sm text-gray-400 mt-1">
              Roblox: {user.roblox_username}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

