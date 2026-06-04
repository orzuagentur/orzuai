export const WHATSAPP_MESSAGES = {
  pageTitle: "Integrations",
  pageDescription: "Connect WhatsApp Business and enable AI-powered replies.",
  connectTitle: "Connect WhatsApp",
  connectDescription:
    "Enter credentials from Meta Developer Console (WhatsApp → API Setup). Configure the webhook URL below in Meta before connecting.",
  connectSuccess: "WhatsApp connected successfully.",
  connectWaiting: "Verifying credentials with Meta...",
  phoneNumberIdLabel: "Phone number ID",
  phoneNumberIdPlaceholder: "From API Setup → Phone number ID",
  phoneNumberIdHint:
    "Meta Developer Console → your app → WhatsApp → API Setup.",
  wabaIdLabel: "WhatsApp Business Account ID",
  wabaIdPlaceholder: "WABA ID from API Setup",
  wabaIdHint: "Used to subscribe this app to your WhatsApp Business Account.",
  accessTokenLabel: "Permanent access token",
  accessTokenPlaceholder: "System user or permanent token from Meta",
  accessTokenHint:
    "Generate in Meta Business Settings or API Setup. Needs whatsapp_business_messaging and manage permissions.",
  businessAccountIdLabel: "Meta Business Account ID (optional)",
  businessAccountIdPlaceholder: "Optional",
  webhookUrlLabel: "Webhook callback URL",
  verifyTokenLabel: "Webhook verify token",
  verifyTokenHint:
    "Set the same value in Meta and as WHATSAPP_VERIFY_TOKEN in your deployment.",
  requirementsTitle: "Before you connect",
  requirements: [
    "WhatsApp Business API app in Meta Developer Console",
    "Phone number added and verified in WhatsApp Manager",
    "Permanent access token with messaging permissions",
    "Webhook URL and verify token configured in Meta (see below)",
    "WHATSAPP_APP_SECRET set on the server for incoming webhooks",
  ] as const,
  notConfigured:
    "Set NEXT_PUBLIC_APP_URL (HTTPS) and Supabase env vars to enable WhatsApp connection.",
  syncSuccess: "WhatsApp sync completed successfully.",
  alreadyConnected: "WhatsApp is already connected for this business.",
  noBusinessTitle: "Create your business profile first",
  noBusinessDescription:
    "Set up your business profile before connecting WhatsApp.",
  invalidCredentials: "Meta could not verify the WhatsApp connection.",
  signupIncomplete:
    "WhatsApp setup was not completed. Please finish Meta Embedded Signup and try again.",
  signupPhoneNumberRequired:
    "Please add and verify a WhatsApp phone number in the Meta popup to finish setup.",
  whatsappBusinessHelpTitle: "WhatsApp Business required",
  whatsappBusinessRequired:
    "To connect WhatsApp, you need a WhatsApp Business account. You can install WhatsApp Business for free on your phone, set up your business profile, and then continue the connection here.",
  embeddedSignupNotConfigured:
    "Meta Embedded Signup is not configured yet. Add NEXT_PUBLIC_META_APP_ID, NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID, and WHATSAPP_APP_SECRET to your environment.",
  genericError: "Unable to complete the WhatsApp request. Please try again.",
} as const;
