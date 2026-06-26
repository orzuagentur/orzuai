export type TwilioConnectionStatus =
  | "disconnected"
  | "authorized"
  | "connected";

export type TwilioPhoneNumberOption = {
  sid: string;
  phoneNumber: string;
  friendlyName: string | null;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
};

export type TwilioConnectionData = {
  id: string;
  businessId: string;
  status: TwilioConnectionStatus;
  connectedAccountSid: string | null;
  accountFriendlyName: string | null;
  phoneNumber: string | null;
  phoneSid: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

export type TwilioConnectConfig = {
  isConfigured: boolean;
  connectUrl: string;
  authorizeRedirectUri: string;
};
