import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI, activityAPI } from '../services/api';
import { useAuth } from '@/context/AuthContext';
import type { Stats } from '../types';

export function useStats() {
  console.log('[useStats] Hook initialized');
  const { user } = useAuth();
  console.log('[useStats] User from useAuth:', user);
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    console.log('[useStats] ========== fetchStats called ==========');
    console.log('[useStats] User object:', user);
    console.log('[useStats] User roblox_id:', user?.roblox_id);
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('[useStats] Fetching stats from backend...');
      // Fetch stats from backend
      const response = await dashboardAPI.getStats();
      let statsData = response.data;
      console.log('[useStats] Backend stats received:', statsData);
      
      // Fetch minutes from EasyPOS API if user has roblox_id
      if (user?.roblox_id) {
        console.log('[useStats] User has roblox_id, fetching from EasyPOS API...');
        try {
          console.log('[Stats] Fetching minutes from EasyPOS API for roblox_id:', user.roblox_id);
          const robloxUserId = parseInt(user.roblox_id, 10);
          console.log('[Stats] Parsed robloxUserId:', robloxUserId);
          
          if (!isNaN(robloxUserId)) {
            console.log('[Stats] Calling activityAPI.getActivityData with userId:', robloxUserId);
            const minutes = await activityAPI.getActivityData(robloxUserId);
            console.log('[Stats] ✓ Fetched minutes from EasyPOS:', minutes);
            // Update stats with minutes from EasyPOS
            statsData = {
              ...statsData,
              minutes: minutes
            };
            console.log('[Stats] Updated statsData with EasyPOS minutes:', statsData);
          } else {
            console.warn('[Stats] ✗ Invalid roblox_id (NaN):', user.roblox_id);
          }
        } catch (activityError: any) {
          console.error('[Stats] ✗ Error fetching minutes from EasyPOS API:', activityError);
          console.error('[Stats] Error stack:', activityError.stack);
          console.error('[Stats] Error details:', activityError.response?.data || activityError.message);
          // Continue with backend minutes if EasyPOS fails
        }
      } else {
        console.log('[useStats] User does not have roblox_id, skipping EasyPOS API call');
        console.log('[useStats] User object keys:', user ? Object.keys(user) : 'user is null/undefined');
      }
      
      console.log('[useStats] Setting stats data:', statsData);
      setStats(statsData);
      console.log('[useStats] ========== fetchStats completed ==========');
    } catch (err: any) {
      console.error('[useStats] ✗ Error in fetchStats:', err);
      setError(err.response?.data?.error || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('[useStats] useEffect triggered, user:', user);
    if (user) {
      console.log('[useStats] User exists, calling fetchStats...');
      fetchStats();
      // Poll every 30 seconds
      const interval = setInterval(() => {
        console.log('[useStats] Polling interval triggered, calling fetchStats...');
        fetchStats();
      }, 30000);
      return () => {
        console.log('[useStats] Cleaning up interval');
        clearInterval(interval);
      };
    } else {
      console.log('[useStats] User does not exist yet, waiting...');
    }
  }, [user, fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

