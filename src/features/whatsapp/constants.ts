export const WHATSAPP_MESSAGES = {
  pageTitle: "Integrations",
  pageDescription: "Connect WhatsApp Business and enable AI-powered replies.",
  connectTitle: "Connect WhatsApp",
  connectDescription:
    "Link your Meta WhatsApp Business phone number to OrzuAI.",
  verifyTitle: "Verify your number",
  verifyDescription:
    "Enter the 6-digit verification code sent to your WhatsApp number.",
  connectSuccess: "WhatsApp connection created. Verify your number to finish.",
  verifySuccess: "WhatsApp number verified and connected successfully.",
  syncSuccess: "WhatsApp sync completed successfully.",
  alreadyConnected: "WhatsApp is already connected for this business.",
  noBusinessTitle: "Create your business profile first",
  noBusinessDescription:
    "Set up your business profile before connecting WhatsApp.",
  invalidCredentials: "Meta rejected the WhatsApp credentials. Check your IDs and token.",
  invalidCode: "The verification code is incorrect.",
  codeExpired: "The verification code has expired. Connect again to receive a new code.",
  genericError: "Unable to complete the WhatsApp request. Please try again.",
  missingWebhookConfig:
    "WhatsApp webhook is not configured. Set WHATSAPP_VERIFY_TOKEN in your environment.",
  webhookUrlHint:
    "Use this webhook URL in Meta Developer Console for message delivery.",
} as const;
