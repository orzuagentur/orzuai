export const INSTAGRAM_MESSAGES = {
  connectTitle: "Connect Instagram",
  connectDescription:
    "Enter your Facebook Page ID and Page access token from Meta Developer Console. Instagram Professional must be linked to the Page.",
  connectWaiting: "Verifying credentials with Meta...",
  connectSuccess: "Instagram connected successfully.",
  pageIdLabel: "Facebook Page ID",
  pageIdPlaceholder: "From Meta → Page settings or API Setup",
  pageIdHint:
    "The Facebook Page linked to your Instagram Professional account.",
  accessTokenLabel: "Page access token",
  accessTokenPlaceholder: "Long-lived Page access token from Meta",
  accessTokenHint:
    "Generate in Meta Business Suite or Graph API Explorer with pages_messaging and instagram_manage_messages.",
  igUserIdLabel: "Instagram account ID (optional)",
  igUserIdPlaceholder: "IG User ID if auto-detect fails",
  igUserIdHint:
    "Usually resolved from the Page. Fill only if Meta returns incomplete Page data.",
  businessAccountIdLabel: "Meta Business Account ID (optional)",
  businessAccountIdPlaceholder: "Optional",
  webhookUrlLabel: "Webhook callback URL",
  verifyTokenLabel: "Webhook verify token",
  verifyTokenHint:
    "Set in Meta and as INSTAGRAM_VERIFY_TOKEN (or WHATSAPP_VERIFY_TOKEN) on your deployment.",
  requirementsTitle: "Before you connect",
  requirements: [
    "Instagram Professional (Business or Creator) linked to a Facebook Page",
    "Meta app with Instagram Messaging product and permissions",
    "Page access token with messaging permissions",
    "Webhook URL and verify token configured in Meta (see below)",
    "WHATSAPP_APP_SECRET on the server for webhook signature validation",
  ] as const,
  notConfigured:
    "Set NEXT_PUBLIC_APP_URL (HTTPS) and Supabase env vars to enable Instagram connection.",
  signupIncomplete:
    "Instagram setup was not completed. Please finish Meta Embedded Signup and try again.",
  signupPageRequired:
    "Please link a Facebook Page with an Instagram Professional account in the Meta popup.",
  invalidCredentials: "Meta could not verify the Instagram connection.",
  alreadyConnected: "Instagram is already connected for this business.",
  noBusinessTitle: "Create your business profile first",
  noBusinessDescription:
    "Set up your business profile in OrzuAI before connecting Instagram.",
  genericError: "Unable to complete the Instagram request. Please try again.",
} as const;
