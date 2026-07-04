export type TeamRole = "owner" | "admin" | "manager" | "agent" | "viewer";

export type TeamMemberStatus = "active" | "invited" | "removed";

export const TEAM_PERMISSION_KEYS = [
  "inbox",
  "crm",
  "calendar",
  "ai_agent",
  "analytics",
  "integrations",
  "billing",
  "settings",
  "team",
] as const;

export type TeamPermissionKey = (typeof TEAM_PERMISSION_KEYS)[number];

export type TeamPermissions = Record<TeamPermissionKey, boolean>;

export type TeamMemberRecord = {
  id: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  isOwner: boolean;
  permissions: TeamPermissions;
  accessStartsAt: string | null;
  accessEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeamPageData = {
  hasBusiness: boolean;
  canManageTeam: boolean;
  members: TeamMemberRecord[];
  maxTeamSeats: number;
  usedSeats: number;
  planLabel: string;
  pendingInvites: number;
  activeMembers: number;
};
