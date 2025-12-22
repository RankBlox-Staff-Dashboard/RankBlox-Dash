'use client';

import { InfractionCard } from '@/components/InfractionCard';
import { useInfractions } from '@/hooks/useInfractions';

export default function InfractionsPage() {
  const { infractions, loading, error, refresh } = useInfractions();

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Infractions</h2>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded text-white hover:bg-dark-border transition"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-gray-400">Loading infractions...</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && infractions.length === 0 && (
        <div className="text-gray-400">No infractions found.</div>
      )}

      <div className="space-y-4">
        {infractions.map((infraction) => (
          <InfractionCard key={infraction.id} infraction={infraction} />
        ))}
      </div>
    </div>
  );
}

