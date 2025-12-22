'use client';

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
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStats } from '@/hooks/useStats';

export default function AnalyticsPage() {
  const { analytics, loading: analyticsLoading } = useAnalytics();
  const { stats, loading: statsLoading } = useStats();

  const loading = analyticsLoading || statsLoading;

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
