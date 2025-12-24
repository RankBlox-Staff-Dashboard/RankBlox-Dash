'use client';

import { useEffect, useState } from 'react';
import { 
  BarChart3,
  CheckCircle2,
  XCircle,
  UserX,
  MessageSquare,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';
import { RobloxAvatar } from '@/components/RobloxAvatar';
import { RankBadge } from '@/components/RankBadge';
import { TabsGrid, type TabsGridItem } from '@/components/ui/TabsGrid';
import { dashboardAPI, type NonStaffMember } from '@/services/api';
import { cn } from '@/lib/cn';

type AnalyticsTab = 'staff' | 'non-staff';

// User type with quota data from dashboard API
interface UserWithQuota {
  id: number;
  discord_id: string;
  discord_username: string;
  discord_avatar: string | null;
  roblox_id: string | null;
  roblox_username: string | null;
  rank: number | null;
  rank_name: string | null;
  status: string;
  created_at: string;
  minutes: number;
  messages_sent: number;
  messages_quota: number;
  quota_met: boolean;
  quota_percentage: number;
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('staff');
  const [staffMembers, setStaffMembers] = useState<UserWithQuota[]>([]);
  const [nonStaffMembers, setNonStaffMembers] = useState<NonStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonStaffLoading, setNonStaffLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonStaffError, setNonStaffError] = useState<string | null>(null);

  const fetchStaffAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the dashboard analytics API endpoint
      const response = await dashboardAPI.getStaffAnalytics();
      
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      const staffData = Array.isArray(response.data) ? response.data : [];
      setStaffMembers(staffData);
    } catch (error: any) {
      console.error('Failed to fetch staff analytics:', error);
      
      if (error?.response?.status === 404) {
        setError('No staff members found');
      } else if (error?.response?.status === 401 || error?.response?.status === 403) {
        setError('You do not have permission to view this data');
      } else if (!navigator.onLine) {
        setError('No internet connection');
      } else {
        setError('Failed to load staff data. Please try again.');
      }
      
      setStaffMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNonStaffMembers = async () => {
    try {
      setNonStaffLoading(true);
      setNonStaffError(null);
      const response = await dashboardAPI.getNonStaffMembers();
      
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      const members = Array.isArray(response.data) ? response.data : [];
      setNonStaffMembers(members);
    } catch (error: any) {
      console.error('Failed to fetch non-staff members:', error);
      
      if (error?.response?.status === 404) {
        setNonStaffError(null);
        setNonStaffMembers([]);
      } else if (error?.response?.status === 401 || error?.response?.status === 403) {
        setNonStaffError('You do not have permission to view this data');
      } else if (!navigator.onLine) {
        setNonStaffError('No internet connection');
      } else {
        setNonStaffError('Failed to load non-staff data. Please try again.');
      }
      
      setNonStaffMembers([]);
    } finally {
      setNonStaffLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === 'non-staff') {
      fetchNonStaffMembers();
    }
  }, [activeTab]);

  const analyticsTabs: TabsGridItem[] = [
    { key: 'staff', label: 'Staff Analytics', icon: BarChart3 },
    { key: 'non-staff', label: 'Non-Staff Members', icon: UserX },
  ];

  // Calculate statistics from the data
  const totalMembers = staffMembers.length;
  const activeMembers = staffMembers.filter((m) => m.quota_met === true).length;
  const inactiveMembers = totalMembers - activeMembers;

  return (
    <div className="space-y-4">
      <ProfileCard />
      <NavigationTabs />

      <Card className="p-4 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <TabsGrid
          items={analyticsTabs}
          activeKey={activeTab}
          onTabChange={(key) => setActiveTab(key as AnalyticsTab)}
        />
      </Card>

      {activeTab === 'staff' && !loading && !error && (
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

      {activeTab === 'staff' && (
        <Card className="p-5 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400 animate-pulse" />
              <div>
                <h3 className="text-base font-semibold text-white">Staff Analytics</h3>
                <p className="text-xs text-white/50">All staff members</p>
              </div>
            </div>
            <button
              onClick={fetchStaffAnalytics}
              disabled={loading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="Refresh staff data"
            >
              <RefreshCw className={cn("w-4 h-4 text-white/70", loading && "animate-spin")} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded w-1/3" />
                      <div className="h-3 bg-white/10 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-white/70 mb-4">{error}</p>
              <button
                onClick={fetchStaffAnalytics}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
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
                          {member.roblox_username || member.discord_username}
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
                      <div className="text-xs text-white/60 mt-0.5">
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        {member.messages_sent} / {member.messages_quota} messages
                      </div>
                      {member.rank && (
                        <div className="mt-1">
                          <RankBadge rank={member.rank} rankName={member.rank_name} />
                        </div>
                      )}
                    </div>
                  </div>

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
                        {member.quota_percentage}%
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

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10 animate-fadeIn" style={{ animationDelay: `${0.05 * index + 0.25}s` }}>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      member.quota_met 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-red-500/20 text-red-400"
                    )}>
                      {member.quota_met ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/50">
              <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p>No staff members found</p>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'non-staff' && (
        <Card className="p-5 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-orange-400 animate-pulse" />
              <div>
                <h3 className="text-base font-semibold text-white">Non-Staff Members</h3>
                <p className="text-xs text-white/50">Discord server members not registered in staff portal</p>
              </div>
            </div>
            <button
              onClick={fetchNonStaffMembers}
              disabled={nonStaffLoading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="Refresh non-staff data"
            >
              <RefreshCw className={cn("w-4 h-4 text-white/70", nonStaffLoading && "animate-spin")} />
            </button>
          </div>

          {nonStaffLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded w-1/3" />
                      <div className="h-3 bg-white/10 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : nonStaffError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-white/70 mb-4">{nonStaffError}</p>
              <button
                onClick={fetchNonStaffMembers}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
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
            <div className="text-center py-8 text-white/50">
              <UserX className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p>All Discord members are registered in the staff portal</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
