export const TELEGRAM_MESSAGES = {
  connectTitle: "Connect Telegram",
  connectDescription:
    "Connect a Telegram Bot to receive and reply to customer messages through OrzuX.",
  botTokenLabel: "Bot token",
  botTokenPlaceholder: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
  botTokenHint:
    "Create a bot with @BotFather on Telegram, then paste the token here. Keep it secret — never share it publicly.",
  connectButton: "Connect Telegram Bot",
  connectSuccess: "Telegram bot connected successfully.",
  disconnectSuccess: "Telegram bot disconnected.",
  connectWaiting: "Validating bot token and registering webhook…",
  invalidToken:
    "Telegram rejected this bot token. Check the token from @BotFather and try again.",
  notConfigured:
    "Telegram requires a public HTTPS app URL. Set NEXT_PUBLIC_APP_URL (e.g. https://orzuaibot.vercel.app).",
  requirementsTitle: "Before you connect",
  requirementBotFather: "Create a bot via @BotFather in Telegram and copy the API token.",
  requirementHttps:
    "Your app URL must be HTTPS (production) so Telegram can deliver webhooks.",
  requirementPrivacy:
    "Configure bot commands and description in @BotFather for a professional experience.",
  alreadyConnected: "Telegram is already connected for this business.",
  noBusinessTitle: "Create your business profile first",
  noBusinessDescription:
    "Set up your business profile in OrzuX before connecting Telegram.",
  genericError: "Unable to complete the Telegram request. Please try again.",
} as const;
