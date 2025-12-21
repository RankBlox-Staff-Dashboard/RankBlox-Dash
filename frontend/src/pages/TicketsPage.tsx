import { useState, useEffect } from 'react';
import { TicketCard } from '../components/TicketCard';
import { ticketsAPI } from '../services/api';
import type { Ticket } from '../types';

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketsAPI.list(filter || undefined);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Tickets</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-dark-card border border-dark-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="claimed">Claimed</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-gray-400 text-center py-12">
          No tickets found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onUpdate={fetchTickets} />
          ))}
        </div>
      )}
    </div>
  );
}

