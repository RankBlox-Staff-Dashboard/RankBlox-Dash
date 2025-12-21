export interface User {
  id: number;
  discord_id: string;
  discord_username: string;
  roblox_id: string | null;
  roblox_username: string | null;
  rank: number | null;
  rank_name: string | null;
  status: 'active' | 'inactive' | 'pending_verification';
  created_at: string;
}

export interface Stats {
  messages_sent: number;
  messages_quota: number;
  tickets_claimed: number;
  tickets_resolved: number;
  infractions: number;
  week_start: string;
}

export interface Infraction {
  id: number;
  user_id: number;
  reason: string;
  type: 'warning' | 'strike';
  issued_by: number | null;
  issued_by_username?: string;
  voided: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  discord_channel_id: string;
  discord_message_id: string | null;
  claimed_by: number | null;
  claimed_by_username?: string;
  claimed_by_roblox?: string;
  status: 'open' | 'claimed' | 'resolved' | 'closed';
  created_at: string;
}

export interface Analytics {
  total_active_users: number;
  active_workspaces: number;
  total_staff: number;
}

export type PermissionFlag =
  | 'VIEW_DASHBOARD'
  | 'VIEW_TICKETS'
  | 'CLAIM_TICKETS'
  | 'VIEW_INFRACTIONS'
  | 'VIEW_ALL_INFRACTIONS'
  | 'ISSUE_INFRACTIONS'
  | 'VOID_INFRACTIONS'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_PERMISSIONS'
  | 'MANAGE_USERS'
  | 'MANAGE_CHANNELS';

