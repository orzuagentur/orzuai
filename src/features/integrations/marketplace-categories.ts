import type { IntegrationChannelConfig } from "./constants";

export type MarketplaceCategoryId =
  | "messengers"
  | "website"
  | "email"
  | "sms"
  | "calls"
  | "other";

export type MarketplaceCategory = {
  id: MarketplaceCategoryId;
  label: string;
  description: string;
};

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  {
    id: "messengers",
    label: "Messengers",
    description: "WhatsApp, Telegram, Messenger, and other chat apps.",
  },
  {
    id: "website",
    label: "Website",
    description: "Live chat and lead capture on your site.",
  },
  {
    id: "email",
    label: "Email",
    description: "Gmail inbox with AI replies.",
  },
  {
    id: "sms",
    label: "SMS",
    description: "Two-way text messaging via Twilio.",
  },
  {
    id: "calls",
    label: "Calls",
    description: "AI phone line and call handling via Twilio.",
  },
  {
    id: "other",
    label: "Other",
    description: "Calendar, billing, and partner apps.",
  },
];

export type MarketplaceChannelEntry = IntegrationChannelConfig & {
  marketplaceCategory: MarketplaceCategoryId;
};

export type MarketplaceLinkEntry = {
  id: string;
  label: string;
  description: string;
  category: MarketplaceCategoryId;
  href: string;
  available: boolean;
  icon: IntegrationChannelConfig["icon"];
};

export function groupMarketplaceChannels(
  channels: MarketplaceChannelEntry[],
): Array<{ category: MarketplaceCategory; channels: MarketplaceChannelEntry[] }> {
  return MARKETPLACE_CATEGORIES.map((category) => ({
    category,
    channels: channels.filter(
      (channel) => channel.marketplaceCategory === category.id,
    ),
  })).filter((group) => group.channels.length > 0);
}
