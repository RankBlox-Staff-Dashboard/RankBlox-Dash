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
    try {
      setLoading(true);
      setError(null);
      
      // Fetch stats from backend
      const response = await dashboardAPI.getStats();
      let statsData = response.data;
      
      // Fetch minutes from EasyPOS API if user has roblox_id
      if (user?.roblox_id) {
        try {
          console.log('[Stats] Fetching minutes from EasyPOS API for roblox_id:', user.roblox_id);
          const robloxUserId = parseInt(user.roblox_id, 10);
          if (!isNaN(robloxUserId)) {
            const minutes = await activityAPI.getActivityData(robloxUserId);
            console.log('[Stats] Fetched minutes from EasyPOS:', minutes);
            // Update stats with minutes from EasyPOS
            statsData = {
              ...statsData,
              minutes: minutes
            };
          } else {
            console.warn('[Stats] Invalid roblox_id:', user.roblox_id);
          }
        } catch (activityError: any) {
          console.error('[Stats] Error fetching minutes from EasyPOS API:', activityError);
          // Continue with backend minutes if EasyPOS fails
        }
      }
      
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStats();
      // Poll every 30 seconds
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

