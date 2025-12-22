'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useManagement } from '@/hooks/useManagement';
import { usePermissions } from '@/hooks/usePermissions';
import { managementAPI } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { RobloxAvatar } from '@/components/RobloxAvatar';
import { 
  RefreshCw, 
  Users, 
  Hash, 
  AlertTriangle, 
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Shield
} from 'lucide-react';
import type { PermissionFlag, User, LOARequest, Infraction } from '@/types';

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

type Tab = 'users' | 'channels' | 'loa' | 'infractions';

export default function ManagementPage() {
  const { user } = useAuth();
  const { users, channels, loading, error, refresh } = useManagement();
  const { permissions, loading: permissionsLoading } = usePermissions();

  // User is admin if they have MANAGE_USERS or MANAGE_PERMISSIONS permission
  // This is determined by backend based on rank (24-255) or permission overrides
  const isAdmin = useMemo(() => {
    return permissions.includes('MANAGE_USERS') || permissions.includes('MANAGE_PERMISSIONS');
  }, [permissions]);

  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [newChannelId, setNewChannelId] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  
  // LOA state
  const [loaRequests, setLoaRequests] = useState<LOARequest[]>([]);
  const [loaLoading, setLoaLoading] = useState(false);
  
  // Infractions state
  const [allInfractions, setAllInfractions] = useState<Infraction[]>([]);
  const [infractionsLoading, setInfractionsLoading] = useState(false);
  const [showInfractionModal, setShowInfractionModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [infractionReason, setInfractionReason] = useState('');
  const [infractionType, setInfractionType] = useState<'warning' | 'strike'>('warning');

  const staffUsers = useMemo(() => users.filter((u) => u.rank !== null), [users]);

  useEffect(() => {
    if (activeTab === 'loa') {
      fetchLOARequests();
    } else if (activeTab === 'infractions') {
      fetchInfractions();
    }
  }, [activeTab]);

  const fetchLOARequests = async () => {
    try {
      setLoaLoading(true);
      const res = await managementAPI.getLOARequests();
      setLoaRequests(res.data);
    } catch (err) {
      console.error('Error fetching LOA requests:', err);
    } finally {
      setLoaLoading(false);
    }
  };

  const fetchInfractions = async () => {
    try {
      setInfractionsLoading(true);
      const res = await managementAPI.getAllInfractions();
      setAllInfractions(res.data);
    } catch (err) {
      console.error('Error fetching infractions:', err);
    } finally {
      setInfractionsLoading(false);
    }
  };

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <div className="p-4 animate-fadeIn">
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white/50 mx-auto mb-4" />
          <p className="text-white/60">Loading...</p>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4 animate-fadeIn">
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-white/60">You do not have permission to view this page.</p>
        </Card>
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

  const reviewLOA = async (loaId: number, status: 'approved' | 'denied') => {
    setBusy(`loa:${loaId}`);
    try {
      await managementAPI.reviewLOA(loaId, status);
      await fetchLOARequests();
    } finally {
      setBusy(null);
    }
  };

  const issueInfraction = async () => {
    if (!selectedUserId || !infractionReason.trim()) return;
    
    setBusy('issueInfraction');
    try {
      await managementAPI.issueInfraction(selectedUserId, infractionReason, infractionType);
      setShowInfractionModal(false);
      setSelectedUserId(null);
      setInfractionReason('');
      setInfractionType('warning');
      await fetchInfractions();
    } finally {
      setBusy(null);
    }
  };

  const voidInfraction = async (infractionId: number) => {
    setBusy(`void:${infractionId}`);
    try {
      await managementAPI.voidInfraction(infractionId);
      await fetchInfractions();
    } finally {
      setBusy(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/30 text-yellow-300">Pending</span>;
      case 'approved':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/30 text-green-300">Approved</span>;
      case 'denied':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/30 text-red-300">Denied</span>;
      default:
        return null;
    }
  };

  const tabs = [
    { key: 'users' as Tab, label: 'Staff Users', icon: Users },
    { key: 'channels' as Tab, label: 'Tracked Channels', icon: Hash },
    { key: 'loa' as Tab, label: 'LOA Requests', icon: Calendar },
    { key: 'infractions' as Tab, label: 'Infractions', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Management Panel</h2>
              <p className="text-xs text-white/50">Administrator controls for Atlanta High</p>
            </div>
          </div>
          <button
            onClick={() => {
              refresh();
              if (activeTab === 'loa') fetchLOARequests();
              if (activeTab === 'infractions') fetchInfractions();
            }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            <RefreshCw className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </Card>

      {/* Tab Navigation */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {loading && <div className="text-center text-white/50 py-8">Loading...</div>}
      {error && <div className="text-center text-red-400 py-8">{error}</div>}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card className="p-5 animate-fadeIn">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-white/70" />
            Staff Users ({staffUsers.length})
          </h3>
          <div className="space-y-3">
            {staffUsers.map((u) => (
                <div key={u.id} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition">
                  <div className="flex items-center gap-3 mb-3">
                    <RobloxAvatar
                      robloxId={u.roblox_id}
                      discordId={u.discord_id}
                      discordAvatar={u.discord_avatar}
                      alt={u.roblox_username || u.discord_username}
                      size={40}
                      className="w-10 h-10"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">{u.roblox_username || u.discord_username}</div>
                      <div className="text-xs text-white/50">
                        {u.rank_name || `Rank ${u.rank}`} • ID: {u.id}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setShowInfractionModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition"
                    >
                      Issue Infraction
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['active', 'inactive', 'pending_verification'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(u, s)}
                        disabled={busy !== null}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                          u.status === s 
                            ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' 
                            : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                        } disabled:opacity-50`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <Card className="p-5 animate-fadeIn">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Hash className="w-5 h-5 text-white/70" />
            Tracked Channels ({channels.length})
          </h3>
          
          <div className="flex gap-2 mb-4">
            <input
              value={newChannelId}
              onChange={(e) => setNewChannelId(e.target.value)}
              placeholder="Channel ID"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
            <input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Channel Name"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={addChannel}
              disabled={!newChannelId.trim() || !newChannelName.trim() || busy !== null}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="space-y-2">
            {channels.length === 0 && <div className="text-white/50 text-sm text-center py-4">No tracked channels</div>}
            {channels.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <div className="text-white font-medium text-sm">{ch.channel_name}</div>
                  <div className="text-xs text-white/40">{ch.discord_channel_id}</div>
                </div>
                <button
                  onClick={() => removeChannel(ch.id)}
                  disabled={busy !== null}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 disabled:opacity-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* LOA Tab */}
      {activeTab === 'loa' && (
        <Card className="p-5 animate-fadeIn">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-white/70" />
            LOA Requests
          </h3>
          
          {loaLoading ? (
            <div className="text-center py-8 text-white/50">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : loaRequests.length === 0 ? (
            <div className="text-center py-8 text-white/50">No LOA requests</div>
          ) : (
            <div className="space-y-3">
              {loaRequests.map((loa) => (
                <div key={loa.id} className="p-4 rounded-xl bg-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white font-medium">{loa.user_roblox_username || loa.user_discord_username}</span>
                      {getStatusBadge(loa.status)}
                    </div>
                    <span className="text-xs text-white/40">
                      {new Date(loa.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mb-2">
                    {new Date(loa.start_date).toLocaleDateString()} - {new Date(loa.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-white/50 mb-3">{loa.reason}</p>
                  {loa.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewLOA(loa.id, 'approved')}
                        disabled={busy !== null}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition text-sm disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => reviewLOA(loa.id, 'denied')}
                        disabled={busy !== null}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition text-sm disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Infractions Tab */}
      {activeTab === 'infractions' && (
        <Card className="p-5 animate-fadeIn">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            All Infractions
          </h3>
          
          {infractionsLoading ? (
            <div className="text-center py-8 text-white/50">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : allInfractions.length === 0 ? (
            <div className="text-center py-8 text-white/50">No infractions</div>
          ) : (
            <div className="space-y-3">
              {allInfractions.map((inf) => (
                <div key={inf.id} className={`p-4 rounded-xl ${inf.voided ? 'bg-white/5 opacity-60' : inf.type === 'strike' ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{inf.user_roblox_username || inf.user_discord_username}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        inf.voided ? 'bg-white/10 text-white/50' : inf.type === 'strike' ? 'bg-red-500/30 text-red-300' : 'bg-yellow-500/30 text-yellow-300'
                      }`}>
                        {inf.voided ? 'Voided' : inf.type}
                      </span>
                    </div>
                    <span className="text-xs text-white/40">
                      {new Date(inf.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mb-1">{inf.reason}</p>
                  <p className="text-xs text-white/40 mb-2">By {inf.issued_by_username || 'System'}</p>
                  {!inf.voided && (
                    <button
                      onClick={() => voidInfraction(inf.id)}
                      disabled={busy !== null}
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition text-xs disabled:opacity-50"
                    >
                      Void Infraction
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Issue Infraction Modal */}
      {showInfractionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-zinc-900 rounded-2xl border border-white/10 p-6 animate-scaleIn">
            <h3 className="text-lg font-bold text-white mb-4">Issue Infraction</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">User</label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">Select a user</option>
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.roblox_username || u.discord_username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Type</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setInfractionType('warning')}
                    className={`flex-1 px-4 py-2 rounded-xl transition ${
                      infractionType === 'warning' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                  >
                    Warning
                  </button>
                  <button
                    onClick={() => setInfractionType('strike')}
                    className={`flex-1 px-4 py-2 rounded-xl transition ${
                      infractionType === 'strike' ? 'bg-red-500/30 text-red-300 border border-red-500/50' : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                  >
                    Strike
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Reason</label>
                <textarea
                  value={infractionReason}
                  onChange={(e) => setInfractionReason(e.target.value)}
                  rows={3}
                  placeholder="Enter the reason for this infraction..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowInfractionModal(false);
                    setSelectedUserId(null);
                    setInfractionReason('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={issueInfraction}
                  disabled={!selectedUserId || !infractionReason.trim() || busy !== null}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 text-red-300 font-medium hover:bg-red-500/30 transition disabled:opacity-50"
                >
                  Issue Infraction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

