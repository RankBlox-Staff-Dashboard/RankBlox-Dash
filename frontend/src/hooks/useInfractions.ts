import { useEffect, useState } from 'react';
import type { Infraction } from '@/types';
import { dashboardAPI } from '@/services/api';

export function useInfractions() {
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardAPI.getInfractions();
      setInfractions(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch infractions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { infractions, loading, error, refresh };
}

