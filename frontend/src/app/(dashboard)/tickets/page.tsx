'use client';

import { useState, useMemo } from 'react';
import { 
  Search, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';
import { useTickets } from '@/hooks/useTickets';
import type { Ticket } from '@/types';

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'claimed', label: 'Claimed' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
] as const;

export default function TicketsPage() {
  const [status, setStatus] = useState<Ticket['status'] | 'all'>('all');
  const { tickets, loading, error, refresh } = useTickets(status === 'all' ? undefined : status);

  const counts = useMemo(() => {
    const c = { all: tickets.length, open: 0, claimed: 0, resolved: 0, closed: 0 } as Record<string, number>;
    for (const t of tickets) c[t.status] = (c[t.status] || 0) + 1;
    return c;
  }, [tickets]);

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'open': return <Clock className="w-4 h-4 text-blue-300" />;
      case 'claimed': return <User className="w-4 h-4 text-yellow-300" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-300" />;
      case 'closed': return <XCircle className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-white/50" />;
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'open': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'claimed': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'closed': return 'bg-white/10 text-white/50 border-white/20';
      default: return 'bg-white/10 text-white/50 border-white/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <ProfileCard />

      {/* Tabs Navigation */}
      <NavigationTabs />

      {/* Ticket Lookup */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-white/70" />
            <div>
              <h3 className="text-base font-semibold text-white">Ticket Lookup</h3>
              <p className="text-xs text-white/50">Search and manage support tickets</p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            <RefreshCw className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                status === f.key
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              {f.label} ({counts[f.key] ?? 0})
            </button>
          ))}
        </div>

        {/* Tickets List */}
        {loading && (
          <div className="text-center py-8 text-white/50">Loading tickets...</div>
        )}
        
        {error && (
          <div className="text-center py-8 text-red-400">{error}</div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="text-center py-8 text-white/50">No tickets found.</div>
        )}

        <div className="space-y-2">
          {tickets.map((ticket) => {
            const date = new Date(ticket.created_at).toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            });
            
            return (
              <div 
                key={ticket.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getStatusColor(ticket.status).split(' ')[0]}`}>
                    {getStatusIcon(ticket.status)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      Ticket #{ticket.id}
                    </div>
                    <div className="text-xs text-white/50">
                      {ticket.claimed_by_username ? `Claimed by ${ticket.claimed_by_username}` : 'Unclaimed'} • {date}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(ticket.status)}`}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
