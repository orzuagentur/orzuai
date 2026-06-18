export const WHATSAPP_MESSAGES = {
  pageTitle: "Integrations",
  pageDescription: "Connect WhatsApp Business and enable AI-powered replies.",
  connectTitle: "WhatsApp Business",
  connectDescription:
    "Connect your WhatsApp number through 360dialog Embedded Signup — or paste an API key manually from the Hub.",
  connectButton: "Connect WhatsApp",
  connectWaiting: "Verifying API key and registering webhook…",
  connectSuccess: "WhatsApp connected.",
  embeddedConnectButton: "Connect with 360dialog",
  embeddedConnectWaiting: "Finishing setup…",
  embeddedConnectSuccess: "WhatsApp connected.",
  embeddedConnectPending:
    "Number registered — finishing activation. This usually takes under a minute.",
  embeddedConnectTitle: "Quick connect",
  embeddedConnectDescription:
    "Add a WhatsApp Business number in a few minutes via 360dialog. Billing stays between you and 360dialog.",
  manualConnectTitle: "Manual connect",
  manualConnectDescription:
    "Already have a Number API key? Paste it below instead.",
  pendingTitle: "Activating your number",
  pendingDescription:
    "360dialog is finishing setup. You can leave this page — we will connect automatically when the number is live.",
  disconnectSuccess: "WhatsApp disconnected.",
  connectedNumber: "Connected number",
  connectedAt: "Connected",
  lastActivity: "Last activity",
  connectedHint: "New messages arrive automatically via 360dialog webhooks.",
  requirementsTitle: "Before you connect",
  requirementAccount:
    "A WhatsApp Business API number onboarded in 360dialog (https://hub.360dialog.com).",
  requirementApiKey:
    "Number API key from 360dialog Hub → your number → API Keys.",
  noBusinessTitle: "Business profile required",
  noBusinessDescription: "Create your business profile before connecting WhatsApp.",
  alreadyConnected: "WhatsApp is already connected for this business.",
  invalidCredentials: "360dialog could not verify this API key.",
  webhookSetupFailed:
    "API key is valid but webhook registration failed. Check NEXT_PUBLIC_APP_URL is HTTPS.",
  genericError: "Unable to complete the WhatsApp request. Please try again.",
  syncSuccess: "WhatsApp sync completed successfully.",
  notConfigured:
    "Set NEXT_PUBLIC_APP_URL (HTTPS) and Supabase env vars to enable WhatsApp.",
  apiKeyLabel: "360dialog API key",
  apiKeyPlaceholder: "Paste the Number API key from 360dialog Hub",
  apiKeyHint: "Generated in 360dialog Hub for your WhatsApp number. Keep it secret.",
  phoneNumberIdLabel: "Phone number ID",
  phoneNumberIdPlaceholder: "From 360dialog Hub → number details",
  phoneNumberIdHint:
    "Used to route inbound webhooks to this workspace. Shown in 360dialog Hub.",
  displayPhoneLabel: "Display phone number (optional)",
  displayPhonePlaceholder: "+1234567890",
  displayPhoneHint: "For your reference in the dashboard. Inbound webhooks update this automatically.",
  webhookUrlLabel: "Webhook URL (registered automatically)",
  requirements: [
    "WhatsApp number onboarded in 360dialog",
    "Number API key from 360dialog Hub",
    "Phone number ID from 360dialog Hub",
    "HTTPS production URL (NEXT_PUBLIC_APP_URL)",
  ] as const,
} as const;
