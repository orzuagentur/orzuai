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
  syncHint:
    "With Pub/Sub push configured, new emails appear in Inbox within seconds. Without push, production polls every ~3 min — use Sync now for manual refresh.",
  pushEnabledHint: "Instant sync is active via Gmail Pub/Sub push.",
  pushDisabledHint:
    "Polling mode only. Configure Gmail Pub/Sub in Google Cloud and set GMAIL_PUBSUB_* env vars for instant delivery.",
  pushWebhookLabel: "Pub/Sub push endpoint URL",
  pushWatchUntil: "Push watch active until",
  pushNotConfigured: "Gmail Pub/Sub push is not configured.",
  pushFailed: "Could not start Gmail push watch.",
  enablePushWatch: "Enable instant sync",
  syncNow: "Sync now",
  syncSuccess: (count: number, scanned: number) =>
    count > 0
      ? `Imported ${count} new email(s).`
      : scanned > 0
        ? "Inbox is up to date."
        : "No incoming emails found in Gmail inbox (last 30 days). Send a test to your connected address from another mailbox.",
  syncFailed: "Could not sync Gmail.",
  syncApiError:
    "Gmail API is disabled in Google Cloud. Open Google Cloud Console → APIs & Services → Library → enable Gmail API for the same project as your OAuth client, then click Sync now.",
  inboxHint:
    "Only emails received in your Gmail inbox appear here (not outgoing-only). Send a test to your connected address.",
  lastSynced: "Last synced",
  openInbox: "Open Chats",
} as const;

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
