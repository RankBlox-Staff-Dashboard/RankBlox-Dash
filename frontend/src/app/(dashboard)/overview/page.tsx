 'use client';

import { useAuth } from '@/context/AuthContext';
import { useStats } from '@/hooks/useStats';

export default function OverviewPage() {
  const { user } = useAuth();
  const { stats, loading, error, refresh } = useStats();

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Overview</h2>
          <div className="text-sm text-gray-400 mt-1">
            {user ? `Signed in as ${user.discord_username}` : ''}
          </div>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded text-white hover:bg-dark-border transition"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-gray-400">Loading stats...</div>}
      {error && <div className="text-red-400">{error}</div>}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <div className="text-sm text-gray-400">Messages</div>
            <div className="text-3xl font-bold text-white mt-2">
              {stats.messages_sent}/{stats.messages_quota}
            </div>
          </div>
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <div className="text-sm text-gray-400">Tickets claimed</div>
            <div className="text-3xl font-bold text-white mt-2">{stats.tickets_claimed}</div>
          </div>
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <div className="text-sm text-gray-400">Tickets resolved</div>
            <div className="text-3xl font-bold text-white mt-2">{stats.tickets_resolved}</div>
          </div>
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <div className="text-sm text-gray-400">Infractions</div>
            <div className="text-3xl font-bold text-white mt-2">{stats.infractions}</div>
          </div>
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <div className="text-sm text-gray-400">Week start</div>
            <div className="text-xl font-semibold text-white mt-2">{stats.week_start}</div>
          </div>
        </div>
      )}
    </div>
  );
}

