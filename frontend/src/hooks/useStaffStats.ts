import { useState, useEffect, useCallback } from 'react';
import { managementAPI } from '@/services/api';
import type { User } from '@/types';
import {
  calculateQuotaMet,
  calculateQuotaPercentage,
  getMessagesQuota,
} from '@/utils/staffStats';

/**
 * Extended User type with quota statistics
 * This matches the backend response from /management/users
 * Includes all the same data fields as the MySQL query script output
 */
export interface UserWithQuota extends User {
  messages_sent: number;
  messages_quota: number;
  quota_met: boolean;
  quota_percentage: number;
  minutes: number;
  tickets_claimed: number;
  tickets_resolved: number;
  week_start?: string;
  updated_at?: string;
}

/**
 * Unified hook for fetching staff statistics
 * This is the single source of truth for staff member data with quota information
 */
export function useStaffStats() {
  const [staffMembers, setStaffMembers] = useState<UserWithQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffStats = useCallback(async () => {
    try {
      console.log('[useStaffStats] Fetching staff stats...');
      setLoading(true);
      setError(null);

      const response = await managementAPI.getUsers();
      console.log('[useStaffStats] API response received:', {
        hasData: !!response.data,
        isArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data) ? response.data.length : 0,
      });

      if (!response || !response.data) {
        console.error('[useStaffStats] Invalid response from server');
        throw new Error('Invalid response from server');
      }

      const allUsers = Array.isArray(response.data)
        ? (response.data as any[])
        : [];

      console.log(`[useStaffStats] Received ${allUsers.length} users from API`);
      
      // Debug: Log all users received from API
      if (allUsers.length > 0) {
        console.log(`[useStaffStats] All users from API:`, allUsers.map(u => ({
          id: u.id,
          username: u.roblox_username || u.discord_username,
          messages_sent: u.messages_sent,
          messages_sent_type: typeof u.messages_sent,
          quota_met: u.quota_met,
          status: u.status,
          rank: u.rank
        })));
      } else {
        console.log(`[useStaffStats] No users received from API`);
      }

      // Filter for staff members (users with a rank) and normalize quota fields
      const staffData: UserWithQuota[] = allUsers
        .filter((u) => u.rank !== null)
        .map((u) => {
          // Handle messages_sent - ensure it's a number from API
          let messagesSentNum = 0;
          if (u.messages_sent !== null && u.messages_sent !== undefined) {
            if (typeof u.messages_sent === 'string') {
              messagesSentNum = parseInt(u.messages_sent, 10);
            } else if (typeof u.messages_sent === 'number') {
              messagesSentNum = u.messages_sent;
            }
          }
          
          // Ensure valid number
          if (isNaN(messagesSentNum) || messagesSentNum < 0) {
            messagesSentNum = 0;
          }
          
          const messagesQuota = typeof u.messages_quota === 'number' 
            ? u.messages_quota 
            : getMessagesQuota();

          // Use centralized calculation functions to ensure consistency
          const quotaMet = calculateQuotaMet(messagesSentNum, messagesQuota);
          const quotaPercentage = calculateQuotaPercentage(messagesSentNum, messagesQuota);

          // Debug logging for specific user
          if (u.roblox_username === 'BlakeGamez0' || u.discord_username?.includes('Blake')) {
            console.log(`[useStaffStats] Processing ${u.roblox_username || u.discord_username}:`, {
              raw_messages_sent: u.messages_sent,
              raw_type: typeof u.messages_sent,
              normalized: messagesSentNum,
              status: u.status,
              quota_met: quotaMet,
            });
          }

          return {
            id: u.id,
            discord_id: u.discord_id,
            discord_username: u.discord_username,
            discord_avatar: u.discord_avatar,
            roblox_id: u.roblox_id,
            roblox_username: u.roblox_username,
            rank: u.rank,
            rank_name: u.rank_name,
            status: u.status, // Keep status as-is from backend
            created_at: u.created_at,
            messages_sent: messagesSentNum, // Actual count from MySQL via API
            messages_quota: messagesQuota,
            quota_met: quotaMet,
            quota_percentage: quotaPercentage,
            minutes: u.minutes || 0,
            tickets_claimed: u.tickets_claimed || 0,
            tickets_resolved: u.tickets_resolved || 0,
            week_start: u.week_start,
            updated_at: u.updated_at,
          };
        });

      console.log(`[useStaffStats] Filtered to ${staffData.length} staff members`);
      setStaffMembers(staffData);
    } catch (err: any) {
      console.error('Failed to fetch staff stats:', err);

      if (err?.response?.status === 404) {
        setError('No staff members found');
      } else if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError('You do not have permission to view this data');
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setError('No internet connection');
      } else {
        setError('Failed to load staff data. Please try again.');
      }

      setStaffMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffStats();
  }, [fetchStaffStats]);

  return {
    staffMembers,
    loading,
    error,
    refresh: fetchStaffStats,
  };
}

