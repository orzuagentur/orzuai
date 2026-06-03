export const WHATSAPP_MESSAGES = {
  pageTitle: "Integrations",
  pageDescription: "Connect WhatsApp Business and enable AI-powered replies.",
  connectTitle: "Connect WhatsApp",
  connectWithFacebook: "Continue with Facebook",
  connectLoginHint:
    "Log in with your existing Facebook account. After login, Meta will let you select or create a business portfolio — do not create a new personal Facebook profile.",
  connectDescription:
    "Sign in with Meta (Facebook) and authorize OrzuAI to connect your WhatsApp Business account.",
  connectSuccess: "WhatsApp connected successfully.",
  connectWaiting:
    "Complete the Meta popup. You will add your WhatsApp number and confirm it with the code from Meta.",
  connectCancelled: "WhatsApp setup was cancelled. You can try again.",
  connectMissingCode:
    "Meta did not return an authorization code. Please close the popup and try again.",
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
