export type PlatformAdminRole = "owner" | "admin" | "support";

export type PlatformAdminMember = {
  userId: string;
  email: string;
  role: PlatformAdminRole;
  createdAt: string;
  createdBy: string | null;
  lastSignInAt: string | null;
  isOnline: boolean;
};

export type PlatformAdminAuditEntry = {
  id: string;
  targetUserId: string | null;
  targetEmail: string;
  action: "added" | "removed" | "role_updated";
  actorEmail: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
