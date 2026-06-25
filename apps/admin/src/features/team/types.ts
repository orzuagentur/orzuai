export type PlatformAdminRole = "owner" | "admin" | "support";

export type PlatformAdminMember = {
  userId: string;
  email: string;
  role: PlatformAdminRole;
  createdAt: string;
  createdBy: string | null;
  lastSignInAt: string | null;
  lastSeenAt: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  isOnline: boolean;
};

export type PlatformAdminActivityEvent = {
  id: string;
  userId: string | null;
  email: string;
  eventType: "login" | "logout" | "online" | "offline";
  createdAt: string;
};

export type PlatformAdminNotification = {
  id: string;
  type: "invite_accepted" | "admin_online" | "admin_offline";
  title: string;
  body: string;
  actorUserId: string | null;
  actorEmail: string;
  readAt: string | null;
  createdAt: string;
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
