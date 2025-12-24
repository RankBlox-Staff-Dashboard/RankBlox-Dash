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
 */
export interface UserWithQuota extends User {
  messages_sent: number;
  messages_quota: number;
  quota_met: boolean;
  quota_percentage: number;
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
      setLoading(true);
      setError(null);

      const response = await managementAPI.getUsers();

      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }

      const allUsers = Array.isArray(response.data)
        ? (response.data as any[])
        : [];

      console.log(`[useStaffStats] Received ${allUsers.length} users from API`);

      // Filter for staff members (users with a rank) and normalize quota fields
      const staffData: UserWithQuota[] = allUsers
        .filter((u) => u.rank !== null)
        .map((u) => {
          // Handle messages_sent - ensure it's a number
          // Backend should already normalize this, but handle edge cases
          const messagesSent = typeof u.messages_sent === 'string'
            ? parseInt(u.messages_sent, 10)
            : typeof u.messages_sent === 'number'
            ? u.messages_sent
            : 0;
          
          // Ensure valid number
          const messagesSentNum = isNaN(messagesSent) || messagesSent < 0 ? 0 : messagesSent;
          
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
              normalized: messagesSentNum,
              quota_met: quotaMet,
              quota_percentage: quotaPercentage,
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
            status: u.status,
            created_at: u.created_at,
            messages_sent: messagesSentNum,
            messages_quota: messagesQuota,
            quota_met: quotaMet,
            quota_percentage: quotaPercentage,
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

