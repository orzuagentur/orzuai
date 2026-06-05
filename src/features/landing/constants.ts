export const LANDING_COPY = {
  tagline: "The AI inbox for WhatsApp, Instagram, Telegram, and your website.",
  subtitle:
    "Unify customer conversations, automate replies with AI trained on your business knowledge, and grow faster — all from one dashboard.",
  startButton: "START",
  modalTitle: "Welcome to OrzuAI",
  modalDescription:
    "Sign in or create an account to launch your multi-channel AI assistant.",
} as const;

export const LANDING_FEATURES = [
  "WhatsApp & Instagram",
  "Telegram & Web forms",
  "AI-powered replies",
] as const;

export const LANDING_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "telegram", label: "Telegram" },
  { id: "website_forms", label: "Website Forms" },
] as const;
