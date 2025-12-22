import { useEffect, useState } from 'react';
import type { Ticket } from '@/types';
import { ticketsAPI } from '@/services/api';

export function useTickets(status?: Ticket['status']) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ticketsAPI.list(status);
      setTickets(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return { tickets, loading, error, refresh };
}

