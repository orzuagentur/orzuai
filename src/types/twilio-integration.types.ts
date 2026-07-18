export type TwilioConnectionStatus =
  | "disconnected"
  | "authorized"
  | "connected";

export type TwilioAvailablePhoneNumber = {
  phoneNumber: string;
  friendlyName: string | null;
  locality: string | null;
  region: string | null;
};

export type TwilioPhoneNumberOption = {
  sid: string;
  phoneNumber: string;
  friendlyName: string | null;
  voiceUrl?: string | null;
  smsUrl?: string | null;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
};

export type TwilioWebhookField = {
  label: string;
  value: string | null;
  expected?: string | null;
  ok?: boolean;
};

export type TwilioErrorLogItem = {
  sid: string;
  dateCreated: string | null;
  errorCode: string | null;
  message: string;
  requestMethod: string | null;
  requestUrl: string | null;
  responseBody: string | null;
  diagnosis: string;
};

export type TwilioNumberDiagnostics = {
  status: "ok" | "warning" | "error" | "unavailable";
  summary: string;
  connectedAccountSid: string | null;
  platformAccountSid: string | null;
  selectedPhoneSid: string | null;
  selectedPhoneNumber: string | null;
  browserTwimlAppSid: string | null;
  numberFields: TwilioWebhookField[];
  browserAppFields: TwilioWebhookField[];
  errorLogs: TwilioErrorLogItem[];
};

export type TwilioAuthMode = "platform" | "connect" | "api_key" | "auth_token";

export type TwilioBillingOwner = "customer" | "platform";

export type TwilioBrowserPhoneStatus =
  | "disabled"
  | "pending"
  | "ready"
  | "failed";

export type TwilioConnectionData = {
  id: string;
  businessId: string;
  status: TwilioConnectionStatus;
  authMode: TwilioAuthMode;
  billingOwner: TwilioBillingOwner;
  connectedAccountSid: string | null;
  parentAccountSid: string | null;
  apiKeySid: string | null;
  apiKeySecretKeyName: string | null;
  authTokenSecretKeyName: string | null;
  browserTwimlAppSid: string | null;
  browserPhoneStatus: TwilioBrowserPhoneStatus;
  browserPhoneLastError: string | null;
  browserPhoneProvisionedAt: string | null;
  hasApiKeySecret: boolean;
  hasAuthTokenSecret: boolean;
  accountFriendlyName: string | null;
  phoneNumber: string | null;
  phoneSid: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
};

export type TwilioConnectConfig = {
  isConfigured: boolean;
  connectOAuthEnabled: boolean;
  manualConnectEnabled: boolean;
  connectUrl: string;
  authorizeRedirectUri: string;
  deauthorizeRedirectUri: string;
};
