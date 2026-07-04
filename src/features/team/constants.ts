export const TEAM_ROLES = [
  { id: "owner", label: "Owner" },
  { id: "admin", label: "Admin" },
  { id: "manager", label: "Manager" },
  { id: "agent", label: "Agent" },
  { id: "viewer", label: "Viewer" },
] as const;

export const TEAM_ROLE_DESCRIPTIONS: Record<
  (typeof TEAM_ROLES)[number]["id"],
  string
> = {
  owner: "Full workspace control, billing, and team management.",
  admin: "Manage inbox, CRM, AI, and team members except billing.",
  manager: "Oversee inbox, CRM, calendar, and analytics without admin tools.",
  agent: "Handle conversations and view CRM records assigned to them.",
  viewer: "Read-only access to inbox, CRM, and analytics.",
};

export const TEAM_MESSAGES = {
  pageTitle: "Team",
  pageDescription:
    "Invite managers and agents, assign roles, and control access to each workspace area.",
  title: "Team",
  description: "Invite teammates and assign roles for inbox routing and CRM access.",
  inviteLabel: "Email address",
  invitePlaceholder: "colleague@company.com",
  roleLabel: "Role",
  inviteButton: "Invite member",
  inviteMember: "Invite member",
  invited: "Invitation saved.",
  inviteFailed: "Unable to invite member.",
  seatLimitReached: "Your plan has no available team seats. Upgrade billing to add more members.",
  empty: "Only you on the team so far.",
  ownerBadge: "Owner",
  active: "Active",
  invitedStatus: "Invited",
  expiredAccess: "Access expired",
  scheduledAccess: "Scheduled",
  permissionsTitle: "Permissions",
  permissionsDescription:
    "Toggle access to each workspace area. Role defaults apply unless you customize them.",
  accessWindowTitle: "Access window",
  accessWindowDescription:
    "Optional start and end dates for temporary or scheduled access.",
  accessStartsAt: "Starts on",
  accessEndsAt: "Ends on",
  saveMember: "Save changes",
  memberUpdated: "Team member updated.",
  memberUpdateFailed: "Unable to update team member.",
  memberRemoved: "Team member removed.",
  memberRemoveFailed: "Unable to remove team member.",
  removeMember: "Remove member",
  removeMemberConfirm: "Remove this member from the team? They will lose workspace access.",
  editMember: "Edit member",
  seatsUsed: "Seats used",
  pendingInvites: "Pending invites",
  activeMembers: "Active members",
  searchPlaceholder: "Search by email…",
  noResults: "No members match your search.",
  rolePermissions: "Role & permissions",
  accessSchedule: "Access schedule",
  manageInTeam: "Manage team members, roles, and permissions in the Team section.",
  openTeam: "Open Team",
} as const;
