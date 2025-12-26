'use client';

import Image from 'next/image';
import { MessageSquare, AlertTriangle, ClipboardList, Users, User as UserIcon, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useStats } from '@/hooks/useStats';
import { useRobloxAvatar, getDiscordAvatarUrl } from '@/hooks/useRobloxAvatar';
import { getActivityStatus, calculateQuotaMet } from '@/utils/staffStats';
import { Card } from './ui/Card';

export function ProfileCard() {
  const { user } = useAuth();
  const { stats } = useStats();
  const { avatarUrl: robloxAvatarUrl, loading: avatarLoading } = useRobloxAvatar(user?.roblox_id ?? null);

  if (!user) return null;

  // Use Roblox avatar if available and loaded, otherwise fall back to Discord avatar
  const discordAvatarUrl = getDiscordAvatarUrl(user.discord_id, user.discord_avatar);
  const avatarUrl = user.roblox_id && robloxAvatarUrl ? robloxAvatarUrl : discordAvatarUrl;

  const getRankColor = () => {
    if (!user?.rank) return 'bg-green-600';
    if (user.rank >= 24 && user.rank <= 255) return 'bg-red-600';
    if (user.rank >= 8) return 'bg-purple-600';
    return 'bg-green-600';
  };

  // Display name - prefer Roblox username
  const displayName = user.roblox_username || user.discord_username;

  // Calculate quota met status for activity status display
  const messagesSent = stats?.messages_sent ?? 0;
  const messagesQuota = stats?.messages_quota ?? 150;
  const quotaMet = calculateQuotaMet(messagesSent, messagesQuota);
  const activityStatus = getActivityStatus(user.status, quotaMet);

  return (
    <Card className="p-5 animate-fadeIn">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative animate-scaleIn">
          <Image
            src={avatarUrl}
            alt={displayName}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full ring-2 ring-white/20 transition-transform hover:scale-105"
            unoptimized
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">
            Welcome, Staff {displayName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRankColor()} text-white transition-all hover:scale-105`}>
              {user.rank_name || 'Staff'}
            </span>
            <span className="text-white/40">•</span>
            <span className={`text-sm font-medium ${
              activityStatus === 'Active' 
                ? 'text-green-400' 
                : 'text-red-400'
            }`}>
              {activityStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 transition-all hover:bg-white/10 hover:scale-[1.02] animate-slideUp" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 ring-1 ring-blue-400/30">
            <MessageSquare className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="text-xs text-white/50 font-medium">Messages</div>
            <div className="text-base font-bold text-white">
              {stats?.messages_sent ?? 0}/{stats?.messages_quota ?? 150}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 transition-all hover:bg-white/10 hover:scale-[1.02] animate-slideUp" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/20 ring-1 ring-cyan-400/30">
            <Clock className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="text-xs text-white/50 font-medium">Minutes</div>
            <div className="text-base font-bold text-white">{stats?.minutes ?? 0}m</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 transition-all hover:bg-white/10 hover:scale-[1.02] animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/20 ring-1 ring-yellow-400/30">
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <div className="text-xs text-white/50 font-medium">Infractions</div>
            <div className="text-base font-bold text-white">{stats?.infractions ?? 0}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 transition-all hover:bg-white/10 hover:scale-[1.02] animate-slideUp" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
            <ClipboardList className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="text-xs text-white/50 font-medium">Claimed</div>
            <div className="text-base font-bold text-white">{stats?.tickets_claimed ?? 0}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
