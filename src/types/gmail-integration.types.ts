import type { EmailConnectionStatus } from "./database.types";

export type GmailConnectionData = {
  id: string;
  businessId: string;
  status: EmailConnectionStatus;
  gmailAddress: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  watchExpiration: string | null;
  createdAt: string;
};

export type GmailConnectConfig = {
  isConfigured: boolean;
  redirectUri: string;
  connectUrl: string;
  pushEnabled: boolean;
  pushWebhookUrl: string | null;
};
