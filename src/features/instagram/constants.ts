export const INSTAGRAM_MESSAGES = {
  connectTitle: "Connect Instagram",
  connectWithFacebook: "Continue with Facebook",
  connectDescription:
    "Sign in with Meta (Facebook) to link your Instagram Professional account and enable Direct messages via the Instagram Messaging API.",
  connectLoginHint:
    "Use the Facebook account that manages your Instagram Professional profile. After login, select your business portfolio and Instagram account in Meta — do not create a new personal Facebook profile.",
  connectWaiting:
    "Complete the Meta popup. Select your business and Instagram account, then grant OrzuAI access.",
  connectFinishing: "Finishing Instagram connection...",
  connectSuccess: "Instagram connected successfully.",
  connectCancelled: "Instagram setup was cancelled. You can try again.",
  connectMissingCode:
    "Meta did not return an authorization code. Please close the popup and try again.",
  signupIncomplete:
    "Instagram setup was not completed. Please finish Meta Embedded Signup and try again.",
  signupPageRequired:
    "Please link a Facebook Page with an Instagram Professional account in the Meta popup.",
  invalidCredentials: "Meta could not verify the Instagram connection.",
  notConfigured:
    "Instagram Embedded Signup is not configured. Add NEXT_PUBLIC_META_APP_ID, NEXT_PUBLIC_INSTAGRAM_EMBEDDED_SIGNUP_CONFIG_ID, and WHATSAPP_APP_SECRET to your environment.",
  requirementsTitle: "Before you connect",
  requirementProfessional:
    "Instagram account must be Professional (Business or Creator).",
  requirementFacebookPage:
    "Instagram must be linked to a Facebook Page in Meta Business Suite.",
  requirementMetaApp:
    "Meta app must include Instagram product and Messaging permissions (configured in Developer Console).",
  alreadyConnected: "Instagram is already connected for this business.",
  noBusinessTitle: "Create your business profile first",
  noBusinessDescription:
    "Set up your business profile in OrzuAI before connecting Instagram.",
  genericError: "Unable to complete the Instagram request. Please try again.",
} as const;
