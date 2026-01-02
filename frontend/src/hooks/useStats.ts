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
    if (!user) {
      console.log('[useStats] No user, skipping fetch');
      return;
    }
    
    try {
      console.log('[useStats] Fetching stats for user:', user.id);
      setLoading(true);
      setError(null);
      
      // Fetch stats from backend - minutes are already in the database (activity_logs table)
      // No need to call EasyPOS API - database is the source of truth
      const response = await dashboardAPI.getStats();
      const statsData = response.data;
      
      console.log('[useStats] Stats received:', {
        messages_sent: statsData.messages_sent,
        messages_quota: statsData.messages_quota,
        minutes: statsData.minutes,
        tickets_claimed: statsData.tickets_claimed,
        tickets_resolved: statsData.tickets_resolved,
      });
      
      // Minutes are already included in the stats response from the database
      // The backend queries activity_logs table which has the minutes column
      // No external API call needed - all data comes from the database
      
      setStats(statsData);
    } catch (err: any) {
      console.error('[useStats] Error fetching stats:', err);
      console.error('[useStats] Error details:', {
        status: err.response?.status,
        message: err.message,
        responseData: err.response?.data,
      });
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

