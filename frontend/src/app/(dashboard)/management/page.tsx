'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useManagement } from '@/hooks/useManagement';
import { managementAPI } from '@/services/api';
import type { PermissionFlag, User } from '@/types';

const ALL_PERMISSIONS: PermissionFlag[] = [
  'VIEW_DASHBOARD',
  'VIEW_TICKETS',
  'CLAIM_TICKETS',
  'VIEW_INFRACTIONS',
  'VIEW_ALL_INFRACTIONS',
  'ISSUE_INFRACTIONS',
  'VOID_INFRACTIONS',
  'VIEW_ANALYTICS',
  'MANAGE_PERMISSIONS',
  'MANAGE_USERS',
  'MANAGE_CHANNELS',
];

export default function ManagementPage() {
  const { user } = useAuth();
  const { users, channels, loading, error, refresh } = useManagement();

  const isAdmin = !!(user?.rank && user.rank >= 16 && user.rank <= 255);

  const [newChannelId, setNewChannelId] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const staffUsers = useMemo(() => users.filter((u) => u.rank !== null), [users]);

  if (!isAdmin) {
    return (
      <div className="flex-1 p-8">
        <h2 className="text-2xl font-bold text-white mb-2">Management</h2>
        <div className="text-red-400">You are not authorized to view this page.</div>
      </div>
    );
  }

  const updateStatus = async (u: User, status: User['status']) => {
    setBusy(`status:${u.id}`);
    try {
      await managementAPI.updateUserStatus(u.id, status);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const updatePermission = async (u: User, permission: PermissionFlag, granted: boolean) => {
    setBusy(`perm:${u.id}:${permission}`);
    try {
      await managementAPI.updateUserPermission(u.id, permission, granted);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const addChannel = async () => {
    setBusy('addChannel');
    try {
      await managementAPI.addTrackedChannel(newChannelId.trim(), newChannelName.trim());
      setNewChannelId('');
      setNewChannelName('');
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const removeChannel = async (id: number) => {
    setBusy(`rmChannel:${id}`);
    try {
      await managementAPI.removeTrackedChannel(id);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex-1 p-8 space-y-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Management</h2>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded text-white hover:bg-dark-border transition"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-gray-400">Loading management data...</div>}
      {error && <div className="text-red-400">{error}</div>}

      <section className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Tracked channels</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input
            value={newChannelId}
            onChange={(e) => setNewChannelId(e.target.value)}
            placeholder="Discord channel ID"
            className="bg-black/20 border border-dark-border rounded px-3 py-2 text-white"
          />
          <input
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="Channel name"
            className="bg-black/20 border border-dark-border rounded px-3 py-2 text-white"
          />
          <button
            onClick={addChannel}
            disabled={!newChannelId.trim() || !newChannelName.trim() || busy !== null}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded"
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {channels.length === 0 && <div className="text-gray-400">No tracked channels.</div>}
          {channels.map((ch) => (
            <div key={ch.id} className="flex items-center justify-between bg-black/20 border border-dark-border rounded px-3 py-2">
              <div>
                <div className="text-white font-medium">{ch.channel_name}</div>
                <div className="text-xs text-gray-400">{ch.discord_channel_id}</div>
              </div>
              <button
                onClick={() => removeChannel(ch.id)}
                disabled={busy !== null}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Staff users</h3>

        <div className="space-y-4">
          {staffUsers.length === 0 && <div className="text-gray-400">No staff users found.</div>}

          {staffUsers.map((u) => (
            <div key={u.id} className="bg-black/20 border border-dark-border rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-white font-semibold">
                    {u.roblox_username || u.discord_username} <span className="text-xs text-gray-400">#{u.id}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Rank: {u.rank ?? 'N/A'} {u.rank_name ? `(${u.rank_name})` : ''} • Status: {u.status}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(['active', 'inactive', 'pending_verification'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(u, s)}
                      disabled={busy !== null}
                      className={`px-3 py-1 rounded text-sm border ${
                        u.status === s ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent border-dark-border text-gray-200'
                      } disabled:opacity-50`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-gray-300 mb-2">Permissions (override)</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map((p) => (
                    <div key={p} className="flex items-center gap-2 bg-black/20 border border-dark-border rounded px-2 py-1">
                      <span className="text-xs text-gray-200">{p}</span>
                      <button
                        onClick={() => updatePermission(u, p, true)}
                        disabled={busy !== null}
                        className="text-xs px-2 py-0.5 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        Grant
                      </button>
                      <button
                        onClick={() => updatePermission(u, p, false)}
                        disabled={busy !== null}
                        className="text-xs px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

