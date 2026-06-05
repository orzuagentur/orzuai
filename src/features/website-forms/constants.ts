export const WEBSITE_FORMS_MESSAGES = {
  connectTitle: "Website Forms",
  connectDescription:
    "Connect any website or CMS. Each submission creates a lead, contact, and conversation in OrzuAI.",
  connectWithOneClick: "Enable Website Forms",
  connectSuccess: "Website Forms enabled. Copy your webhook URL and API key below.",
  noBusinessTitle: "Business profile required",
  noBusinessDescription: "Complete your business settings before enabling Website Forms.",
  notConfigured: "Set NEXT_PUBLIC_APP_URL to your HTTPS production URL on Vercel.",
  httpsRequired:
    "Website Forms requires a public HTTPS app URL (e.g. https://orzuaibot.vercel.app).",
  genericError: "Something went wrong. Please try again.",
  webhookUrlLabel: "Webhook URL",
  apiKeyLabel: "API Key",
  apiKeyHint:
    "Use the API key for server-side integrations. Many CMS tools only need the webhook URL.",
  copySuccess: "Copied to clipboard",
  regenerateKey: "Regenerate API key",
  regenerateConfirm:
    "Regenerating invalidates the previous API key. Update integrations that use the old key.",
  siteNameLabel: "Site name (optional)",
  siteUrlLabel: "Site URL (optional)",
  followUpTitle: "AI follow-up channel",
  followUpDescription:
    "After a form is submitted, OrzuAI can reply using AI on WhatsApp, Email, or in-app (Website Forms inbox).",
  followUpWhatsapp: "WhatsApp (needs phone in form + WhatsApp connected)",
  followUpEmail: "Email (needs email in form + Resend configured)",
  followUpTelegram:
    "Telegram (needs chat_id in form or matching email on an existing Telegram contact)",
  followUpNone: "Inbox only (no outbound message)",
  autoFollowUpLabel: "Enable AI follow-up after new submissions",
  saveSettings: "Save settings",
  settingsSaved: "Settings saved",
  disconnect: "Disconnect",
  disconnectSuccess: "Website Forms disconnected",
  cmsTitle: "Connect without coding",
  cmsGeneric: "Generic webhook (Tilda, Wix, Webflow, Framer, custom HTML)",
  cmsWordPress: "WordPress (Contact Form 7 / WPForms webhook)",
  cmsShopify: "Shopify / other CMS",
  instructionsWebhook:
    "Paste the Webhook URL into your form’s “Webhook”, “Notify URL”, or “Send to URL” field. Send JSON with name, email, phone, and/or message.",
  instructionsApiKey:
    "For server-side POST requests, add header: X-OrzuAI-Api-Key: your_api_key",
  lastSubmission: "Last submission",
  never: "Never",
  newKeyTitle: "Save your new API key",
  newKeyDescription: "This key is shown once. Copy it before leaving this page.",
} as const;
