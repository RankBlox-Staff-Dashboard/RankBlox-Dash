'use client';

import { useAnalytics } from '@/hooks/useAnalytics';

export default function AnalyticsPage() {
  const { analytics, loading, error, refresh } = useAnalytics();

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded text-white hover:bg-dark-border transition"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-gray-400">Loading analytics...</div>}
      {error && <div className="text-red-400">{error}</div>}

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <div className="text-sm text-gray-400">Total active users</div>
            <div className="text-3xl font-bold text-white mt-2">{analytics.total_active_users}</div>
          </div>
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <div className="text-sm text-gray-400">Active workspaces</div>
            <div className="text-3xl font-bold text-white mt-2">{analytics.active_workspaces}</div>
          </div>
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <div className="text-sm text-gray-400">Total staff</div>
            <div className="text-3xl font-bold text-white mt-2">{analytics.total_staff}</div>
          </div>
        </div>
      )}
    </div>
  );
}

