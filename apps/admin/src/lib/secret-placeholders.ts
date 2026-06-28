const SECRET_KEY_PLACEHOLDERS: Record<string, string> = {
  RESEND_API_KEY: "your-resend-api-key",
  RESEND_FROM_EMAIL: "OrzuX <support@orzux.com>",
  GEMINI_API_KEY: "your-gemini-api-key",
  GEMINI_DEFAULT_MODEL: "gemini-2.5-flash",
  OPENAI_API_KEY: "your-openai-api-key",
  ANTHROPIC_API_KEY: "your-anthropic-api-key",
  ELEVENLABS_API_KEY: "your-elevenlabs-api-key",
  STRIPE_SECRET_KEY: "your-stripe-secret-key",
  STRIPE_WEBHOOK_SECRET: "your-stripe-webhook-secret",
  STRIPE_PRICE_STARTER: "your-stripe-price-id",
  STRIPE_PRICE_PRO: "your-stripe-price-id",
  STRIPE_PRICE_AGENCY: "your-stripe-price-id",
  TWILIO_ACCOUNT_SID: "your-twilio-account-sid",
  TWILIO_AUTH_TOKEN: "your-twilio-auth-token",
  RETELL_API_KEY: "your-retell-api-key",
  VAPI_API_KEY: "your-vapi-api-key",
  GOOGLE_CLIENT_ID: "your-google-client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "your-google-client-secret",
  WHATSAPP_VERIFY_TOKEN: "your-whatsapp-verify-token",
  WHATSAPP_APP_SECRET: "your-whatsapp-app-secret",
  WHATSAPP_API_VERSION: "v22.0",
  DIALOG360_PARTNER_API_KEY: "your-dialog360-partner-key",
  DIALOG360_PLATFORM_SECRET: "your-dialog360-platform-secret",
  DIALOG360_USE_SANDBOX: "true",
  DIALOG360_API_BASE: "https://waba-v2.360dialog.io",
  INSTAGRAM_VERIFY_TOKEN: "your-instagram-verify-token",
  TELEGRAM_WEBHOOK_SECRET: "your-telegram-webhook-secret",
  CRON_SECRET: "your-cron-secret",
  GMAIL_PUBSUB_TOPIC: "projects/your-project/topics/gmail-push",
  GMAIL_PUBSUB_PUSH_SECRET: "your-gmail-pubsub-secret",
  MEDIA_CDN_URL: "https://cdn.yourdomain.com",
  UPSTASH_REDIS_REST_URL: "https://your-redis.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "your-upstash-token",
  QSTASH_TOKEN: "your-qstash-token",
  QSTASH_CURRENT_SIGNING_KEY: "your-qstash-signing-key",
  QSTASH_NEXT_SIGNING_KEY: "your-qstash-signing-key",
  WORKER_CONCURRENCY: "5",
  VAPID_PRIVATE_KEY: "your-vapid-private-key",
  VAPID_SUBJECT: "mailto:admin@yourdomain.com",
};

const SECRET_KEY_FORMAT_HINTS: Record<string, string> = {
  RESEND_API_KEY: "Формат: re_ + 32+ символов",
  GEMINI_API_KEY: "Формат: AIzaSy + 33 символа",
  OPENAI_API_KEY: "Формат: sk-proj- + длинная строка",
  ANTHROPIC_API_KEY: "Формат: sk-ant-api03- + строка",
  STRIPE_SECRET_KEY: "Формат: sk_live_ + 24+ символов",
  STRIPE_WEBHOOK_SECRET: "Формат: whsec_ + строка",
  STRIPE_PRICE_STARTER: "Формат: price_ + id из Stripe",
  STRIPE_PRICE_PRO: "Формат: price_ + id из Stripe",
  STRIPE_PRICE_AGENCY: "Формат: price_ + id из Stripe",
  TWILIO_ACCOUNT_SID: "Формат: AC + 32 символа",
};

export function getSecretPlaceholder(keyName: string): string {
  const normalized = keyName.trim().toUpperCase();

  if (SECRET_KEY_PLACEHOLDERS[normalized]) {
    return SECRET_KEY_PLACEHOLDERS[normalized];
  }

  if (normalized.includes("SECRET") || normalized.includes("TOKEN")) {
    return "your-secret-token-here";
  }

  if (normalized.includes("URL")) {
    return "https://example.com";
  }

  if (normalized.includes("EMAIL")) {
    return "noreply@yourdomain.com";
  }

  if (normalized.includes("KEY") || normalized.includes("API")) {
    return "your-api-key-here";
  }

  return "your-secret-value-here";
}

export function getSecretKeyHint(keyName: string): string | null {
  const normalized = keyName.trim().toUpperCase();
  const formatHint = SECRET_KEY_FORMAT_HINTS[normalized];

  if (formatHint) {
    return formatHint;
  }

  if (normalized.startsWith("STRIPE_")) {
    return "Stripe Dashboard → Developers";
  }

  if (normalized.startsWith("GEMINI_")) {
    return "Google AI Studio → API Keys";
  }

  if (normalized.startsWith("OPENAI_") || normalized.startsWith("ANTHROPIC_")) {
    return "Панель провайдера → API Keys";
  }

  if (normalized.startsWith("RESEND_")) {
    return "Resend → API Keys / Domains";
  }

  return null;
}
