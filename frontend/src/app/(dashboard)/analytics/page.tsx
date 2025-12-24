'use client';

import { useEffect, useState } from 'react';
import { 
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Users
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';
import { RobloxAvatar } from '@/components/RobloxAvatar';
import { RankBadge } from '@/components/RankBadge';
import { dashboardAPI, type StaffAnalytics } from '@/services/api';
import { cn } from '@/lib/cn';

export default function AnalyticsPage() {
  const [staffMembers, setStaffMembers] = useState<StaffAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaffAnalytics = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getStaffAnalytics();
        setStaffMembers(response.data);
      } catch (error) {
        console.error('Failed to fetch staff analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffAnalytics();
  }, []);

  // Calculate statistics
  const totalMembers = staffMembers.length;
  const quotaMetCount = staffMembers.filter(m => m.quota_met).length;
  const quotaNotMetCount = totalMembers - quotaMetCount;

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <ProfileCard />

      {/* Tabs Navigation */}
      <NavigationTabs />

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 gap-3 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <Card className="p-4 animate-scaleIn" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs text-white/50">Quota Met</div>
              <div className="text-lg font-bold text-white">{quotaMetCount}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 animate-scaleIn" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-xs text-white/50">Quota Not Met</div>
              <div className="text-lg font-bold text-white">{quotaNotMetCount}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Staff Analytics */}
      <Card className="p-5 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400 animate-pulse" />
          <div>
            <h3 className="text-base font-semibold text-white">Staff Analytics</h3>
            <p className="text-xs text-white/50">All staff members with activity status</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-white/50 animate-pulse">Loading staff analytics...</div>
        ) : staffMembers.length > 0 ? (
          <div className="space-y-3">
            {staffMembers.map((member, index) => (
              <div 
                key={member.id} 
                className={cn(
                  "flex flex-col gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300",
                  "animate-slideUp hover:scale-[1.02] hover:shadow-lg"
                )}
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative animate-scaleIn" style={{ animationDelay: `${0.05 * index + 0.1}s` }}>
                    <RobloxAvatar
                      robloxId={member.roblox_id}
                      discordId={member.discord_id}
                      discordAvatar={member.discord_avatar}
                      alt={member.roblox_username || member.discord_username}
                      size={48}
                      className="w-12 h-12 ring-2 ring-white/10 hover:ring-white/20 transition-all"
                    />
                    {member.quota_met && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {member.roblox_username || 'No Roblox Username'}
                      </div>
                      {member.quota_met ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-white/50 truncate">
                      {member.discord_username}
                    </div>
                    {member.rank && (
                      <div className="mt-1">
                        <RankBadge rank={member.rank} rankName={member.rank_name} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Quota Progress */}
                <div className="space-y-2 animate-fadeIn" style={{ animationDelay: `${0.05 * index + 0.2}s` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-white/50" />
                      <span className="text-xs text-white/70">Message Quota</span>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold",
                      member.quota_met ? "text-emerald-400" : "text-white/70"
                    )}>
                      {member.messages_sent}/{member.messages_quota}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 ease-out",
                        member.quota_met 
                          ? "bg-emerald-500 animate-pulse" 
                          : "bg-blue-500"
                      )}
                      style={{ 
                        width: `${member.quota_percentage}%`,
                        animationDelay: `${0.05 * index + 0.3}s`
                      }}
                    />
                  </div>
                </div>

                {/* Minutes */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10 animate-fadeIn" style={{ animationDelay: `${0.05 * index + 0.25}s` }}>
                  <Clock className="w-4 h-4 text-white/50" />
                  <span className="text-xs text-white/50">Total Minutes:</span>
                  <span className="text-sm font-semibold text-white">{member.minutes}</span>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    member.status === 'active' 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : member.status === 'inactive'
                      ? "bg-red-500/20 text-red-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  )}>
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/50 animate-pulse">No staff members found</div>
        )}
      </Card>
    </div>
  );
}
