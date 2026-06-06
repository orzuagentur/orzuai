export const TEAM_ROLES = [
  { id: "owner", label: "Owner" },
  { id: "admin", label: "Admin" },
  { id: "manager", label: "Manager" },
  { id: "agent", label: "Agent" },
  { id: "viewer", label: "Viewer" },
] as const;

export const TEAM_MESSAGES = {
  title: "Team",
  description: "Invite teammates and assign roles for inbox routing and CRM access.",
  inviteLabel: "Email address",
  invitePlaceholder: "colleague@company.com",
  roleLabel: "Role",
  inviteButton: "Invite member",
  invited: "Invitation saved.",
  inviteFailed: "Unable to invite member.",
  empty: "Only you on the team so far.",
  ownerBadge: "Owner",
  active: "Active",
  invitedStatus: "Invited",
} as const;
