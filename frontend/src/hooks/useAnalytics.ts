import { useEffect, useState } from 'react';
import type { Analytics } from '@/types';
import { dashboardAPI } from '@/services/api';

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardAPI.getAnalytics();
      setAnalytics(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { analytics, loading, error, refresh };
}

