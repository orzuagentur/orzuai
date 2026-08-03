import type { EmailConnectionStatus } from "@/types/database.types";

export type OutlookConnectionData = {
  id: string;
  businessId: string;
  status: EmailConnectionStatus;
  outlookAddress: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

export type OutlookConnectConfig = {
  isConfigured: boolean;
  redirectUri: string;
  connectUrl: string;
  tenant: string;
};
