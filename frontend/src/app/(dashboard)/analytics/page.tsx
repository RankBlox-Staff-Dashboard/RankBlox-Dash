'use client';

import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  BarChart3,
  Users,
  Building2,
  Shield,
  Info
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';
import { RobloxAvatar } from '@/components/RobloxAvatar';
import { RankBadge } from '@/components/RankBadge';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStats } from '@/hooks/useStats';
import { managementAPI } from '@/services/api';
import type { User } from '@/types';

export default function AnalyticsPage() {
  const { analytics, loading: analyticsLoading } = useAnalytics();
  const { stats, loading: statsLoading } = useStats();
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffStats, setStaffStats] = useState<Record<number, { messages: number; rank: number | null }>>({});

  const loading = analyticsLoading || statsLoading || staffLoading;

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setStaffLoading(true);
        const usersResponse = await managementAPI.getUsers();
        const users = usersResponse.data.filter((user) => user.status === 'active');
        setStaffMembers(users);

        // Fetch stats for each staff member
        const statsMap: Record<number, { messages: number; rank: number | null }> = {};
        for (const user of users) {
          try {
            // In a real app, you'd have an endpoint to get stats for a specific user
            // For now, we'll construct the stats object with available data
            statsMap[user.id] = {
              messages: 0, // This would come from the backend
              rank: user.rank || 0,
            };
          } catch (error) {
            console.error(`Failed to fetch stats for user ${user.id}:`, error);
          }
        }
        setStaffStats(statsMap);
      } catch (error) {
        console.error('Failed to fetch staff data:', error);
      } finally {
        setStaffLoading(false);
      }
    };

    fetchStaffData();
  }, []);

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <ProfileCard />

      {/* Tabs Navigation */}
      <NavigationTabs />

      {/* Performance Metrics */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Performance Metrics</h3>
            <p className="text-xs text-white/50">Your ticket performance</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4 text-white/50">Loading metrics...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Cases Claimed</span>
                <span className="text-sm font-semibold text-white">{stats?.tickets_claimed ?? 0}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min((stats?.tickets_claimed ?? 0) * 10, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Cases Resolved</span>
                <span className="text-sm font-semibold text-white">{stats?.tickets_resolved ?? 0}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min((stats?.tickets_resolved ?? 0) * 10, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Message Quota</span>
                <span className="text-sm font-semibold text-white">
                  {stats?.messages_sent ?? 0}/{stats?.messages_quota ?? 150}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.min(((stats?.messages_sent ?? 0) / (stats?.messages_quota ?? 150)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* System Overview */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-semibold text-white">System Overview</h3>
            <p className="text-xs text-white/50">Platform-wide statistics</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4 text-white/50">Loading analytics...</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-300" />
                </div>
                <span className="text-sm text-white/70">Total Active Users</span>
              </div>
              <span className="text-base font-bold text-white">{analytics?.total_active_users ?? 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-300" />
                </div>
                <span className="text-sm text-white/70">Active Workspaces</span>
              </div>
              <span className="text-base font-bold text-white">{analytics?.active_workspaces ?? 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-300" />
                </div>
                <span className="text-sm text-white/70">Total Staff</span>
              </div>
              <span className="text-base font-bold text-white">{analytics?.total_staff ?? 0}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Staff Members Overview */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Staff Members</h3>
            <p className="text-xs text-white/50">Team performance overview</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-white/50">Loading staff data...</div>
        ) : staffMembers.length > 0 ? (
          <div className="space-y-3">
            {staffMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition">
                <div className="flex items-center gap-3 flex-1">
                  <RobloxAvatar username={member.roblox_username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {member.roblox_username || member.discord_username}
                    </div>
                    <div className="text-xs text-white/50">
                      {member.discord_username}
                    </div>
                  </div>
                  {member.rank && (
                    <RankBadge rank={member.rank} rankName={member.rank_name} />
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    {staffStats[member.id]?.messages ?? 0}
                  </div>
                  <div className="text-xs text-white/50">messages</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/50">No active staff members found</div>
        )}
      </Card>

      {/* Analytics Information */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Analytics Information</h3>
            <p className="text-xs text-white/50">Understanding your performance metrics</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-2">Performance Evaluation</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Your performance is evaluated based on your message quota completion, ticket handling, 
                and overall activity. Meeting your weekly message quota of 150 messages is required to 
                maintain your staff position. Tickets claimed and closed are tracked to measure your 
                contribution to user support.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
