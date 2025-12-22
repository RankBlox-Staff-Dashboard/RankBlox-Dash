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
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  token: string;
  expires_at: string;
  refresh_token?: string;
  refresh_expires_at?: string;
}

export interface VerificationCode {
  id: number;
  user_id: number;
  emoji_code: string;
  expires_at: string;
  used: boolean;
}

export interface Permission {
  id: number;
  user_id: number;
  permission_flag: string;
  granted: boolean;
  overridden: boolean;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  week_start: string;
  messages_sent: number;
  tickets_claimed: number;
  tickets_resolved: number;
}

export interface Infraction {
  id: number;
  user_id: number;
  reason: string;
  type: 'warning' | 'strike';
  issued_by: number | null;
  voided: boolean;
  created_at: string;
}

export interface Ticket {
  id: number;
  discord_channel_id: string;
  discord_message_id: string | null;
  claimed_by: number | null;
  status: 'open' | 'claimed' | 'resolved' | 'closed';
  created_at: string;
}

export interface TrackedChannel {
  id: number;
  discord_channel_id: string;
  channel_name: string;
}

export interface JwtPayload {
  userId: number;
  discordId: string;
  rank: number | null;
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
