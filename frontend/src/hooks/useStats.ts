import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '@/context/AuthContext';
import type { Stats } from '../types';

export function useStats() {
  const { user } = useAuth();
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch stats from backend - minutes are already in the database (activity_logs table)
      // No need to call EasyPOS API - database is the source of truth
      const response = await dashboardAPI.getStats();
      const statsData = response.data;
      
      // Minutes are already included in the stats response from the database
      // The backend queries activity_logs table which has the minutes column
      // No external API call needed - all data comes from the database
      
      setStats(statsData);
    } catch (err: any) {
      console.error('[useStats] Error fetching stats:', err);
      setError(err.response?.data?.error || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStats();
      // Poll every 30 seconds
      const interval = setInterval(() => {
        fetchStats();
      }, 30000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [user, fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

