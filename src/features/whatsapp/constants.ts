export const WHATSAPP_MESSAGES = {
  pageTitle: "Integrations",
  pageDescription: "Connect WhatsApp Business and enable AI-powered replies.",
  connectTitle: "Connect WhatsApp",
  connectDescription:
    "Sign in with Meta and authorize OrzuAI to connect your WhatsApp Business account.",
  connectSuccess: "WhatsApp connected successfully.",
  syncSuccess: "WhatsApp sync completed successfully.",
  alreadyConnected: "WhatsApp is already connected for this business.",
  noBusinessTitle: "Create your business profile first",
  noBusinessDescription:
    "Set up your business profile before connecting WhatsApp.",
  invalidCredentials: "Meta could not verify the WhatsApp connection.",
  signupIncomplete:
    "WhatsApp setup was not completed. Please finish Meta Embedded Signup and try again.",
  whatsappBusinessHelpTitle: "WhatsApp Business required",
  whatsappBusinessRequired:
    "To connect WhatsApp, you need a WhatsApp Business account. You can install WhatsApp Business for free on your phone, set up your business profile, and then continue the connection here.",
  embeddedSignupNotConfigured:
    "Meta Embedded Signup is not configured yet. Add NEXT_PUBLIC_META_APP_ID, NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID, and WHATSAPP_APP_SECRET to your environment.",
  genericError: "Unable to complete the WhatsApp request. Please try again.",
} as const;
