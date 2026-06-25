export type AppSecretRecord = {
  id: string;
  keyName: string;
  description: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  updatedByEmail: string | null;
  maskedValue: string;
};

export type AppSecretAuditRecord = {
  id: string;
  secretId: string | null;
  keyName: string;
  action: "created" | "updated" | "deleted" | "viewed" | "tested";
  actorUserId: string | null;
  actorEmail: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
