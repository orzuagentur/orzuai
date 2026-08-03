import { DASHBOARD_ROUTES } from "@/constants/routes";

export const OUTLOOK_INTEGRATION_HREF = `${DASHBOARD_ROUTES.integrations}/email`;

export const OUTLOOK_MESSAGES = {
  connectTitle: "Microsoft Outlook",
  connectDescription:
    "Connect Outlook or Microsoft 365 to receive and reply to customer emails with AI in your inbox.",
  connectButton: "Connect Outlook",
  reconnectButton: "Reconnect Outlook",
  connectedAs: "Connected as",
  notConfiguredTitle: "Microsoft OAuth not configured",
  notConfiguredDescription:
    "Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET from Azure App Registration, then add the redirect URI below.",
  redirectUriLabel: "Redirect URI (Azure)",
  disconnectSuccess: "Outlook disconnected.",
  oauthError: "Could not connect Outlook. Please try again.",
  oauthSuccess: "Outlook connected successfully.",
  syncHint:
    "Outlook inbox syncs every ~3 minutes in production. Use Sync now for an immediate refresh.",
  syncNow: "Sync Outlook now",
  syncSuccess: (count: number, scanned: number) =>
    count > 0
      ? `Imported ${count} new email(s).`
      : scanned > 0
        ? "Outlook inbox is up to date."
        : "No recent inbox messages found. Send a test email to your connected Outlook address.",
  syncFailed: "Could not sync Outlook.",
  lastSynced: "Last synced",
} as const;

/** Delegated Graph scopes for personal + work/school mailboxes. */
export const OUTLOOK_SCOPES = [
  "offline_access",
  "openid",
  "profile",
  "email",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
] as const;
