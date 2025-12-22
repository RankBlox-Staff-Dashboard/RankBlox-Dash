'use client';

import { useMemo, useState } from 'react';
import { TicketCard } from '@/components/TicketCard';
import { useTickets } from '@/hooks/useTickets';
import type { Ticket } from '@/types';

export default function TicketsPage() {
  const [status, setStatus] = useState<Ticket['status'] | 'all'>('all');
  const { tickets, loading, error, refresh } = useTickets(status === 'all' ? undefined : status);

  const counts = useMemo(() => {
    const c = { all: tickets.length, open: 0, claimed: 0, resolved: 0, closed: 0 } as any;
    for (const t of tickets) c[t.status] = (c[t.status] || 0) + 1;
    return c as Record<'all' | Ticket['status'], number>;
  }, [tickets]);

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Tickets</h2>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded text-white hover:bg-dark-border transition"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'open', 'claimed', 'resolved', 'closed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-2 rounded border text-sm ${
              status === s ? 'bg-blue-600 border-blue-500 text-white' : 'bg-dark-card border-dark-border text-gray-300'
            }`}
          >
            {s.toUpperCase()} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-400">Loading tickets...</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && tickets.length === 0 && (
        <div className="text-gray-400">No tickets found.</div>
      )}

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} onUpdate={refresh} />
        ))}
      </div>
    </div>
  );
}

