import type { PlatformAdminRole } from "@/features/team/types";

const ROLE_RANK: Record<PlatformAdminRole, number> = {
  owner: 3,
  admin: 2,
  support: 1,
};

export function canManageTeam(actorRole: PlatformAdminRole): boolean {
  return actorRole === "owner" || actorRole === "admin";
}

export function canAssignRole(
  actorRole: PlatformAdminRole,
  targetRole: PlatformAdminRole,
): boolean {
  if (actorRole === "owner") {
    return true;
  }

  if (actorRole === "admin") {
    return targetRole === "admin" || targetRole === "support";
  }

  return false;
}

export function canRemoveMember(
  actorRole: PlatformAdminRole,
  actorUserId: string,
  targetUserId: string,
  targetRole: PlatformAdminRole,
): boolean {
  if (actorUserId === targetUserId) {
    return false;
  }

  if (!canManageTeam(actorRole)) {
    return false;
  }

  if (actorRole === "owner") {
    return true;
  }

  return targetRole === "support";
}

export function canChangeRole(
  actorRole: PlatformAdminRole,
  targetRole: PlatformAdminRole,
  nextRole: PlatformAdminRole,
): boolean {
  if (actorRole !== "owner") {
    return false;
  }

  if (targetRole === "owner" && nextRole !== "owner") {
    return true;
  }

  return canAssignRole(actorRole, nextRole);
}

export function roleLabel(role: PlatformAdminRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "support":
      return "Support";
  }
}

export function compareRoles(
  left: PlatformAdminRole,
  right: PlatformAdminRole,
): number {
  return ROLE_RANK[left] - ROLE_RANK[right];
}
