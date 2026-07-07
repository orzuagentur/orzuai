/**
 * Optional add-ons billed separately (Stripe price IDs via env when enabled).
 * Pass-through costs (WhatsApp/360dialog, Twilio messaging) stay on the customer account.
 */
export const SUBSCRIPTION_ADD_ONS = [
  {
    id: "ai_reply_pack",
    label: "AI Reply Pack",
    description: "+1,000 customer-facing AI replies per month",
    priceMonthly: 29,
    envKey: "STRIPE_PRICE_ADDON_AI_REPLIES",
  },
  {
    id: "voice_minutes_pack",
    label: "Voice Minutes Pack",
    description: "+500 AI voice minutes per month",
    priceMonthly: 49,
    envKey: "STRIPE_PRICE_ADDON_VOICE_MINUTES",
  },
  {
    id: "team_seat",
    label: "Extra Team Seat",
    description: "+1 workspace member with inbox access",
    priceMonthly: 12,
    envKey: "STRIPE_PRICE_ADDON_TEAM_SEAT",
  },
] as const;

export type SubscriptionAddOnId = (typeof SUBSCRIPTION_ADD_ONS)[number]["id"];

export const PASS_THROUGH_SERVICES = [
  {
    id: "whatsapp",
    label: "WhatsApp (360dialog / Meta)",
    note: "Conversation fees billed by your WhatsApp provider.",
  },
  {
    id: "twilio",
    label: "Twilio Voice & SMS",
    note: "Phone numbers billed monthly on your OrzuX subscription. Call/SMS usage runs on your connected Twilio account.",
  },
] as const;
