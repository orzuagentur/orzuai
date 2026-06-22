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
  syncHint: "New emails sync automatically every few minutes.",
  openInbox: "Open Inbox",
} as const;

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
