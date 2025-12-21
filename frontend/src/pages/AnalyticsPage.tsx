import { useState, useEffect } from 'react';
import { StatsCard } from '../components/StatsCard';
import { dashboardAPI } from '../services/api';
import { useStats } from '../hooks/useStats';
import type { Analytics } from '../types';

export function AnalyticsPage() {
  const { stats } = useStats();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getAnalytics();
        setAnalytics(response.data);
      } catch (error: any) {
        if (error.response?.status === 403) {
          // User doesn't have permission, that's ok
        } else {
          console.error('Error fetching analytics:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Analytics</h2>
        <p className="text-gray-400">View performance metrics and platform statistics</p>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Performance Metrics</h3>
        <p className="text-sm text-gray-400 mb-4">Your ticket performance</p>
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Cases Claimed"
              value={stats.tickets_claimed}
              icon="📋"
              color="blue"
            />
            <StatsCard
              title="Cases Resolved"
              value={stats.tickets_resolved}
              icon="✅"
              color="green"
            />
            <StatsCard
              title="Message Quota"
              value={`${stats.messages_sent}/${stats.messages_quota}`}
              icon="💬"
              color="yellow"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400">Loading platform analytics...</div>
      ) : analytics ? (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">System Overview</h3>
          <p className="text-sm text-gray-400 mb-4">Platform-wide statistics</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Total Active Users"
              value={analytics.total_active_users.toLocaleString()}
              icon="👥"
              color="blue"
            />
            <StatsCard
              title="Active Workspaces"
              value={analytics.active_workspaces.toLocaleString()}
              icon="📦"
              color="purple"
            />
            <StatsCard
              title="Total Staff"
              value={analytics.total_staff}
              icon="🛡️"
              color="green"
            />
          </div>
        </div>
      ) : (
        <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
          <p className="text-gray-400">You don't have permission to view platform analytics</p>
        </div>
      )}

      <div className="mt-8 bg-blue-500/10 border border-blue-500/50 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Performance Evaluation</h3>
            <p className="text-gray-300 text-sm">
              Your performance is evaluated based on your message quota completion, ticket handling, and overall activity. Meeting your weekly message quota of 150 messages is required to maintain your staff position. Tickets claimed and closed are tracked to measure your contribution to user support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

