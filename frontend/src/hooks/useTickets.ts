import { useEffect, useState, useCallback } from 'react';
import type { Ticket } from '@/types';
import { ticketsAPI } from '@/services/api';

export function useTickets(status?: Ticket['status']) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await ticketsAPI.list(status);
      if (!signal?.aborted) {
        setTickets(res.data);
      }
    } catch (err: any) {
      if (!signal?.aborted) {
        setError(err.response?.data?.error || 'Failed to fetch tickets');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [status]);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return { tickets, loading, error, refresh };
}

