'use client';

import { useEffect, useState } from 'react';
import { 
  BarChart3,
  Clock
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';
import { RobloxAvatar } from '@/components/RobloxAvatar';
import { RankBadge } from '@/components/RankBadge';
import { dashboardAPI } from '@/services/api';
import type { User } from '@/types';

interface StaffMember extends User {
  minutes: number;
}

export default function AnalyticsPage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
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

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <ProfileCard />

      {/* Tabs Navigation */}
      <NavigationTabs />

      {/* Staff Analytics */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Staff Analytics</h3>
            <p className="text-xs text-white/50">All staff members with their minutes</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-white/50">Loading staff analytics...</div>
        ) : staffMembers.length > 0 ? (
          <div className="space-y-3">
            {staffMembers.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <RobloxAvatar username={member.roblox_username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {member.roblox_username || 'No Roblox Username'}
                    </div>
                    <div className="text-xs text-white/50 truncate">
                      {member.discord_username}
                    </div>
                  </div>
                  {member.rank && (
                    <RankBadge rank={member.rank} rankName={member.rank_name} />
                  )}
                </div>
                <div className="flex items-center gap-2 text-right ml-3">
                  <Clock className="w-4 h-4 text-white/50" />
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {member.minutes}
                    </div>
                    <div className="text-xs text-white/50">minutes</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/50">No active staff members found</div>
        )}
      </Card>
    </div>
  );
}
