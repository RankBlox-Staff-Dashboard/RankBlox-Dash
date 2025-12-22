'use client';

import { ProfileCard } from '@/components/ProfileCard';
import { StatsCard } from '@/components/StatsCard';
import { QuotaProgressBar } from '@/components/QuotaProgressBar';
import { useStats } from '@/hooks/useStats';

export default function DashboardPage() {
  const { stats, loading } = useStats();

  return (
    <div className="flex-1 p-8">
      <ProfileCard />

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">Overview</h2>

        {loading ? (
          <div className="text-gray-400">Loading stats...</div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Messages"
              value={`${stats.messages_sent}/${stats.messages_quota}`}
              icon="💬"
              color="blue"
            />
            <StatsCard
              title="Infractions"
              value={stats.infractions}
              icon="⚠️"
              color="yellow"
            />
            <StatsCard
              title="Claimed"
              value={stats.tickets_claimed}
              icon="📄"
              color="green"
            />
            <StatsCard
              title="Closed"
              value={stats.tickets_resolved}
              icon="✅"
              color="purple"
            />
          </div>
        ) : null}

        {stats && (
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <QuotaProgressBar current={stats.messages_sent} quota={stats.messages_quota} />
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">Staff Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">📚</span>
              <span className="text-blue-400">→</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Panora Documentation</h3>
            <p className="text-sm text-gray-400">Panora&apos;s Public Documentations.</p>
          </div>

          <div className="bg-dark-card rounded-lg p-6 border border-dark-border opacity-60">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">👥</span>
              <span className="text-gray-500">→</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Staff Documentation</h3>
            <p className="text-sm text-gray-400">Coming Soon!</p>
          </div>

          <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">📖</span>
              <span className="text-green-400">→</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Support Guide</h3>
            <p className="text-sm text-gray-400">Panora&apos;s Support Guide.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

