export const INSTAGRAM_MESSAGES = {
  connectTitle: "Instagram Direct",
  connectWithFacebook: "Connect with Meta",
  connectButton: "Connect with Meta",
  connectDescription:
    "Official Meta login. Link your Professional Instagram account to receive and reply to Direct messages in OrzuX.",
  connectWaiting:
    "Complete the Meta popup — select your business and Instagram Professional account.",
  connectFinishing: "Saving connection…",
  connectSuccess: "Instagram connected.",
  disconnectSuccess: "Instagram disconnected.",
  connectCancelled: "Setup cancelled. You can try again.",
  connectMetaIncomplete:
    "Meta did not complete the connection. Add this site to App Domains, Allowed domains for the JavaScript SDK, and Valid OAuth Redirect URIs in Meta Developer Console, then try again.",
  connectMissingCode:
    "Meta finished setup but did not return an authorization code. Check OAuth and Embedded Signup settings in Meta Developer Console, then try again.",
  requirementsTitle: "You need",
  requirementProfessional: "Instagram Professional account (Business or Creator).",
  requirementFacebookPage: "Instagram linked to a Facebook Page in Meta Business Suite.",
  connectedAccount: "Account",
  connectedAt: "Connected",
  connectedHint: "Direct messages sync automatically via Meta webhooks.",
  signupIncomplete: "Setup was not completed in Meta. Please try again.",
  signupPageRequired:
    "Link a Facebook Page with your Instagram Professional account in the Meta popup.",
  invalidCredentials: "Meta could not verify the Instagram connection.",
  notConfigured:
    "Embedded Signup is not configured. Set NEXT_PUBLIC_META_APP_ID, NEXT_PUBLIC_INSTAGRAM_EMBEDDED_SIGNUP_CONFIG_ID, and WHATSAPP_APP_SECRET.",
  alreadyConnected: "Instagram is already connected for this business.",
  noBusinessTitle: "Business profile required",
  noBusinessDescription:
    "Create your business profile in OrzuX before connecting Instagram.",
  genericError: "Unable to complete the Instagram request. Please try again.",
  connectLoginHint:
    "Use the Facebook login that manages your Instagram. Select an existing business — do not create a new personal profile.",
} as const;
