import {
  TEAM_PERMISSION_KEYS,
  type TeamPermissionKey,
  type TeamPermissions,
  type TeamRole,
} from "@/features/team/types";

const ALL_PERMISSIONS = Object.fromEntries(
  TEAM_PERMISSION_KEYS.map((key) => [key, true]),
) as TeamPermissions;

const NO_PERMISSIONS = Object.fromEntries(
  TEAM_PERMISSION_KEYS.map((key) => [key, false]),
) as TeamPermissions;

export const ROLE_DEFAULT_PERMISSIONS: Record<TeamRole, TeamPermissions> = {
  owner: ALL_PERMISSIONS,
  admin: {
    ...ALL_PERMISSIONS,
    billing: false,
  },
  manager: {
    ...NO_PERMISSIONS,
    inbox: true,
    crm: true,
    calendar: true,
    analytics: true,
  },
  agent: {
    ...NO_PERMISSIONS,
    inbox: true,
    crm: true,
    calendar: true,
  },
  viewer: {
    ...NO_PERMISSIONS,
    inbox: true,
    crm: true,
    analytics: true,
  },
};

export const TEAM_PERMISSION_LABELS: Record<
  TeamPermissionKey,
  { label: string; description: string }
> = {
  inbox: {
    label: "Chats",
    description: "Read and reply to customer conversations.",
  },
  crm: {
    label: "CRM",
    description: "View and manage contacts, leads, and deals.",
  },
  calendar: {
    label: "Calendar",
    description: "View bookings and manage availability.",
  },
  ai_agent: {
    label: "AI Agent",
    description: "Configure AI assistant behavior and knowledge.",
  },
  analytics: {
    label: "Analytics",
    description: "Access performance dashboards and reports.",
  },
  integrations: {
    label: "Integrations",
    description: "Connect channels and third-party services.",
  },
  billing: {
    label: "Billing",
    description: "Manage subscription plans and payment methods.",
  },
  settings: {
    label: "Settings",
    description: "Edit business profile and workspace settings.",
  },
  team: {
    label: "Team",
    description: "Invite members and manage roles and permissions.",
  },
};

const ROLE_RANK: Record<TeamRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  agent: 2,
  viewer: 1,
};

export function canManageTeam(role: TeamRole): boolean {
  return role === "owner" || role === "admin";
}

export function canAssignRole(actorRole: TeamRole, targetRole: TeamRole): boolean {
  if (actorRole === "owner") {
    return targetRole !== "owner";
  }

  if (actorRole === "admin") {
    return targetRole === "manager" || targetRole === "agent" || targetRole === "viewer";
  }

  return false;
}

export function canRemoveMember(
  actorRole: TeamRole,
  member: { isOwner: boolean; role: TeamRole },
): boolean {
  if (member.isOwner) {
    return false;
  }

  if (!canManageTeam(actorRole)) {
    return false;
  }

  if (actorRole === "owner") {
    return true;
  }

  return member.role === "manager" || member.role === "agent" || member.role === "viewer";
}

export function resolveMemberPermissions(
  role: TeamRole,
  overrides: Partial<TeamPermissions> | null | undefined,
): TeamPermissions {
  const defaults = ROLE_DEFAULT_PERMISSIONS[role];

  if (!overrides || Object.keys(overrides).length === 0) {
    return defaults;
  }

  return TEAM_PERMISSION_KEYS.reduce<TeamPermissions>((acc, key) => {
    acc[key] = overrides[key] ?? defaults[key];
    return acc;
  }, {} as TeamPermissions);
}

export function parseStoredPermissions(
  value: unknown,
): Partial<TeamPermissions> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const parsed: Partial<TeamPermissions> = {};

  for (const key of TEAM_PERMISSION_KEYS) {
    if (typeof record[key] === "boolean") {
      parsed[key] = record[key];
    }
  }

  return parsed;
}

export function serializePermissions(
  permissions: TeamPermissions,
  role: TeamRole,
): Record<string, boolean> {
  const defaults = ROLE_DEFAULT_PERMISSIONS[role];
  const overrides: Record<string, boolean> = {};

  for (const key of TEAM_PERMISSION_KEYS) {
    if (permissions[key] !== defaults[key]) {
      overrides[key] = permissions[key];
    }
  }

  return overrides;
}

export function isAccessWindowActive(
  accessStartsAt: string | null,
  accessEndsAt: string | null,
  now = new Date(),
): boolean {
  if (accessStartsAt) {
    const startsAt = new Date(accessStartsAt);

    if (Number.isNaN(startsAt.getTime()) || startsAt > now) {
      return false;
    }
  }

  if (accessEndsAt) {
    const endsAt = new Date(accessEndsAt);

    if (Number.isNaN(endsAt.getTime()) || endsAt < now) {
      return false;
    }
  }

  return true;
}

export function getAccessWindowLabel(
  accessStartsAt: string | null,
  accessEndsAt: string | null,
): string {
  if (!accessStartsAt && !accessEndsAt) {
    return "Always active";
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  });

  if (accessStartsAt && accessEndsAt) {
    return `${formatter.format(new Date(accessStartsAt))} – ${formatter.format(new Date(accessEndsAt))}`;
  }

  if (accessStartsAt) {
    return `From ${formatter.format(new Date(accessStartsAt))}`;
  }

  return `Until ${formatter.format(new Date(accessEndsAt!))}`;
}

export function roleLabel(role: TeamRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "agent":
      return "Agent";
    case "viewer":
      return "Viewer";
  }
}

export function compareRoles(left: TeamRole, right: TeamRole): number {
  return ROLE_RANK[left] - ROLE_RANK[right];
}
