export interface VerificationStatus {
  discord: boolean;
  roblox: boolean;
  active: boolean;
  rank: boolean;
  complete: boolean;
  next_step: 'discord' | 'roblox' | 'activation' | 'rank' | null;
}

export interface User {
  id: number;
  discord_id: string;
  discord_username: string;
  discord_avatar: string | null;
  roblox_id: string | null;
  roblox_username: string | null;
  rank: number | null;
  rank_name: string | null;
  status: 'active' | 'inactive' | 'pending_verification';
  created_at: string;
  // Backend-computed verification status - single source of truth
  verification?: VerificationStatus;
}

export interface Stats {
  messages_sent: number;
  messages_quota: number;
  tickets_claimed: number;
  tickets_resolved: number;
  minutes: number;
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
  user_discord_username?: string;
  user_roblox_username?: string;
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

export interface LOARequest {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by: number | null;
  review_notes: string | null;
  reviewed_by_username?: string;
  user_discord_username?: string;
  user_roblox_username?: string;
  created_at: string;
  updated_at: string;
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

