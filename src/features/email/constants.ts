import { DASHBOARD_ROUTES } from "@/constants/routes";

export const EMAIL_INTEGRATION_HREF = `${DASHBOARD_ROUTES.integrations}/email`;

export const EMAIL_MESSAGES = {
  connectTitle: "Gmail",
  connectDescription:
    "Connect Gmail to receive and reply to customer emails with AI in your inbox.",
  connectButton: "Connect Gmail",
  reconnectButton: "Reconnect",
  connectedAs: "Connected as",
  notConfiguredTitle: "Google OAuth not configured",
  notConfiguredDescription:
    "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. In Google Cloud Console, enable Gmail API and add the redirect URI below.",
  redirectUriLabel: "Authorized redirect URI",
  noBusinessTitle: "Business profile required",
  noBusinessDescription:
    "Create your business profile before connecting Gmail.",
  disconnectSuccess: "Gmail disconnected.",
  oauthError: "Could not connect Gmail. Please try again.",
  oauthSuccess: "Gmail connected successfully.",
  syncHint: "Incoming mail syncs every ~3 min on production. Use Sync now after sending a test email to your Gmail address.",
  syncNow: "Sync now",
  syncSuccess: (count: number) =>
    count > 0 ? `Imported ${count} new email(s).` : "Inbox is up to date.",
  syncFailed: "Could not sync Gmail.",
  inboxHint:
    "Only emails received in your Gmail inbox appear here (not outgoing-only). Send a test to your connected address.",
  lastSynced: "Last synced",
  openInbox: "Open Inbox",
} as const;

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
