import { useEffect, useState } from 'react';
import { managementAPI, type StaffAnalytics } from '@/services/api';

export interface TrackedChannel {
  id: number;
  discord_channel_id: string;
  channel_name: string;
}

export function useManagement() {
  const [users, setUsers] = useState<StaffAnalytics[]>([]);
  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, channelsRes] = await Promise.all([
        managementAPI.getUsers(),
        managementAPI.getTrackedChannels(),
      ]);
      setUsers(usersRes.data);
      setChannels(channelsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { users, channels, loading, error, refresh };
}

