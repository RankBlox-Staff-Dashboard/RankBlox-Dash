'use client';

import { useEffect, useState } from 'react';
import { 
  BarChart3,
  CheckCircle2,
  XCircle,
  UserX
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';
import { RobloxAvatar } from '@/components/RobloxAvatar';
import { RankBadge } from '@/components/RankBadge';
import { TabsGrid, type TabsGridItem } from '@/components/ui/TabsGrid';
import { managementAPI, dashboardAPI, type NonStaffMember } from '@/services/api';
import type { User } from '@/types';
import { cn } from '@/lib/cn';

type AnalyticsTab = 'staff' | 'non-staff';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('staff');
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [nonStaffMembers, setNonStaffMembers] = useState<NonStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonStaffLoading, setNonStaffLoading] = useState(false);

  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        setLoading(true);
        const response = await managementAPI.getUsers();
        // Filter to only show staff members (those with a rank)
        const staff = response.data.filter(u => u.rank !== null);
        setStaffMembers(staff);
      } catch (error: any) {
        // Only log non-404 errors to avoid console spam
        if (error?.response?.status !== 404) {
          console.error('Failed to fetch staff members:', error);
        }
        // Set empty array on error to show empty state
        setStaffMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffMembers();
  }, []);

  useEffect(() => {
    if (activeTab === 'non-staff') {
      const fetchNonStaffMembers = async () => {
        try {
          setNonStaffLoading(true);
          const response = await dashboardAPI.getNonStaffMembers();
          setNonStaffMembers(response.data);
        } catch (error: any) {
          // Only log non-404 errors to avoid console spam
          if (error?.response?.status !== 404) {
            console.error('Failed to fetch non-staff members:', error);
          }
          // Set empty array on error to show empty state
          setNonStaffMembers([]);
        } finally {
          setNonStaffLoading(false);
        }
      };

      fetchNonStaffMembers();
    }
  }, [activeTab]);

  const analyticsTabs: TabsGridItem[] = [
    { key: 'staff', label: 'Staff Analytics', icon: BarChart3 },
    { key: 'non-staff', label: 'Non-Staff Members', icon: UserX },
  ];

  // Calculate statistics
  const totalMembers = staffMembers.length;
  const activeMembers = staffMembers.filter(m => m.status === 'active').length;
  const inactiveMembers = totalMembers - activeMembers;

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <ProfileCard />

      {/* Tabs Navigation */}
      <NavigationTabs />

      {/* Analytics Tabs */}
      <Card className="p-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <TabsGrid
          items={analyticsTabs}
          activeKey={activeTab}
          onTabChange={(key) => setActiveTab(key as AnalyticsTab)}
        />
      </Card>

      {/* Statistics Summary - Only show for staff tab */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-2 gap-3 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <Card className="p-4 animate-scaleIn" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-white/50">Active Members</div>
                <div className="text-lg font-bold text-white">{activeMembers}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 animate-scaleIn" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-xs text-white/50">Inactive Members</div>
                <div className="text-lg font-bold text-white">{inactiveMembers}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Staff Analytics Tab */}
      {activeTab === 'staff' && (
        <Card className="p-5 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-400 animate-pulse" />
            <div>
              <h3 className="text-base font-semibold text-white">Staff Analytics</h3>
              <p className="text-xs text-white/50">All staff members</p>
            </div>
          </div>

        {loading ? (
          <div className="text-center py-8 text-white/50 animate-pulse">Loading staff members...</div>
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
                    {member.status === 'active' && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-semibold text-white truncate">
                        {member.roblox_username || member.discord_username}
                      </div>
                      {member.status === 'active' ? (
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

                {/* Status Badge */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10 animate-fadeIn" style={{ animationDelay: `${0.05 * index + 0.2}s` }}>
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
      )}

      {/* Non-Staff Members Tab */}
      {activeTab === 'non-staff' && (
        <Card className="p-5 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-4">
            <UserX className="w-5 h-5 text-orange-400 animate-pulse" />
            <div>
              <h3 className="text-base font-semibold text-white">Non-Staff Members</h3>
              <p className="text-xs text-white/50">Discord server members not registered in staff portal</p>
            </div>
          </div>

          {nonStaffLoading ? (
            <div className="text-center py-8 text-white/50 animate-pulse">Loading non-staff members...</div>
          ) : nonStaffMembers.length > 0 ? (
            <div className="space-y-3">
              {nonStaffMembers.map((member, index) => (
                <div 
                  key={member.discord_id} 
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300",
                    "animate-slideUp hover:scale-[1.02] hover:shadow-lg"
                  )}
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  <RobloxAvatar
                    robloxId={null}
                    discordId={member.discord_id}
                    discordAvatar={member.discord_avatar}
                    alt={member.discord_display_name || member.discord_username}
                    size={48}
                    className="w-12 h-12 ring-2 ring-orange-500/20 hover:ring-orange-500/40 transition-all"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {member.discord_display_name || member.discord_username}
                    </div>
                    <div className="text-xs text-white/50 truncate">
                      @{member.discord_username}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-500/20 text-orange-400">
                    Not Registered
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/50 animate-pulse">
              <UserX className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p>All Discord members are registered in the staff portal</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
