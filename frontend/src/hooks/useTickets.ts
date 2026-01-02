import { useEffect, useState, useCallback } from 'react';
import type { Ticket } from '@/types';
import { ticketsAPI } from '@/services/api';

export function useTickets(status?: Ticket['status']) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshInternal = useCallback(async (signal?: AbortSignal) => {
    try {
      console.log('[useTickets] Fetching tickets, status filter:', status || 'all');
      setLoading(true);
      setError(null);
      const res = await ticketsAPI.list(status);
      console.log('[useTickets] Tickets received:', {
        count: res.data.length,
        statuses: res.data.map(t => t.status),
      });
      if (!signal?.aborted) {
        setTickets(res.data);
      }
    } catch (err: any) {
      console.error('[useTickets] Error fetching tickets:', err);
      console.error('[useTickets] Error details:', {
        status: err.response?.status,
        message: err.message,
        responseData: err.response?.data,
      });
      if (!signal?.aborted) {
        setError(err.response?.data?.error || 'Failed to fetch tickets');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [status]);

  // Public refresh function that can be used as onClick handler
  const refresh = useCallback(() => {
    refreshInternal();
  }, [refreshInternal]);

  useEffect(() => {
    const controller = new AbortController();
    refreshInternal(controller.signal);
    return () => controller.abort();
  }, [refreshInternal]);

  return { tickets, loading, error, refresh };
}

