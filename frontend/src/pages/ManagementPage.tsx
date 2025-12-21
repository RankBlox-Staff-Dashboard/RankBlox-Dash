import { useState, useEffect } from 'react';
import { managementAPI } from '../services/api';
import type { User, PermissionFlag } from '../types';

const PERMISSIONS: PermissionFlag[] = [
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

export function ManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [trackedChannels, setTrackedChannels] = useState<any[]>([]);
  const [newChannelId, setNewChannelId] = useState('');
  const [newChannelName, setNewChannelName] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchTrackedChannels();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await managementAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackedChannels = async () => {
    try {
      const response = await managementAPI.getTrackedChannels();
      setTrackedChannels(response.data);
    } catch (error) {
      console.error('Error fetching tracked channels:', error);
    }
  };

  const handleStatusUpdate = async (userId: number, status: 'active' | 'inactive' | 'pending_verification') => {
    try {
      await managementAPI.updateUserStatus(userId, status);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const handlePermissionUpdate = async (userId: number, permission: PermissionFlag, granted: boolean) => {
    try {
      await managementAPI.updateUserPermission(userId, permission, granted);
      alert('Permission updated successfully');
    } catch (error) {
      console.error('Error updating permission:', error);
      alert('Failed to update permission');
    }
  };

  const handleAddChannel = async () => {
    if (!newChannelId || !newChannelName) {
      alert('Please fill in both channel ID and name');
      return;
    }

    try {
      await managementAPI.addTrackedChannel(newChannelId, newChannelName);
      setNewChannelId('');
      setNewChannelName('');
      fetchTrackedChannels();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add channel');
    }
  };

  const handleRemoveChannel = async (channelId: number) => {
    if (!confirm('Are you sure you want to remove this tracked channel?')) return;

    try {
      await managementAPI.removeTrackedChannel(channelId);
      fetchTrackedChannels();
    } catch (error) {
      alert('Failed to remove channel');
    }
  };

  return (
    <div className="flex-1 p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Management Panel</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Users Section */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Staff Members</h3>
          {loading ? (
            <div className="text-gray-400">Loading users...</div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="bg-dark-card rounded-lg p-4 border border-dark-border cursor-pointer hover:border-blue-500 transition"
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{user.discord_username}</p>
                      {user.roblox_username && (
                        <p className="text-sm text-gray-400">{user.roblox_username}</p>
                      )}
                      {user.rank && (
                        <p className="text-xs text-gray-500">Rank {user.rank}</p>
                      )}
                    </div>
                    <select
                      value={user.status}
                      onChange={(e) => handleStatusUpdate(user.id, e.target.value as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-dark-border border border-dark-border rounded px-2 py-1 text-sm text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending_verification">Pending</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected User Permissions */}
        {selectedUser && (
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Permissions: {selectedUser.discord_username}
            </h3>
            <div className="bg-dark-card rounded-lg p-4 border border-dark-border space-y-2 max-h-96 overflow-y-auto">
              {PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center justify-between p-2 hover:bg-dark-border rounded cursor-pointer"
                >
                  <span className="text-sm text-gray-300">{permission}</span>
                  <input
                    type="checkbox"
                    onChange={(e) => handlePermissionUpdate(selectedUser.id, permission, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-dark-border border-dark-border rounded focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Tracked Channels */}
        <div className="lg:col-span-2">
          <h3 className="text-xl font-semibold text-white mb-4">Tracked Channels</h3>
          <div className="bg-dark-card rounded-lg p-4 border border-dark-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Channel ID"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                className="bg-dark-border border border-dark-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Channel Name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="bg-dark-border border border-dark-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleAddChannel}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition mb-4"
            >
              Add Channel
            </button>

            <div className="space-y-2">
              {trackedChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-3 bg-dark-border rounded"
                >
                  <div>
                    <p className="font-semibold text-white">{channel.channel_name}</p>
                    <p className="text-sm text-gray-400">{channel.discord_channel_id}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveChannel(channel.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

