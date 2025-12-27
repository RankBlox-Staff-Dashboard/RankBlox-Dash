import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI, activityAPI } from '../services/api';
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
      
      // Fetch stats from backend
      const response = await dashboardAPI.getStats();
      let statsData = response.data;
      
      // Fetch minutes from EasyPOS API if user has roblox_id
      if (user.roblox_id) {
        try {
          const robloxUserId = parseInt(user.roblox_id, 10);
          
          if (!isNaN(robloxUserId)) {
            const minutes = await activityAPI.getActivityData(robloxUserId);
            // Update stats with minutes from EasyPOS
            statsData = {
              ...statsData,
              minutes: minutes
            };
          }
        } catch (activityError: any) {
          // Silently continue with backend minutes if EasyPOS fails
          // This is expected if the endpoint doesn't exist or API is unavailable
          if (activityError.response?.status !== 404) {
            console.warn('[Stats] Error fetching minutes from EasyPOS API:', activityError.message);
          }
        }
      }
      
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

