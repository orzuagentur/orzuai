import { DASHBOARD_ROUTES } from "@/constants/routes";

export type MarketplaceAppStatus = "available" | "beta" | "coming_soon";

export type MarketplaceApp = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: MarketplaceAppStatus;
  href?: string;
};

export const MARKETPLACE_APPS: MarketplaceApp[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "Messaging",
    description: "Cloud API inbox and AI auto-replies.",
    status: "available",
    href: `${DASHBOARD_ROUTES.integrations}/whatsapp?section=activate`,
  },
  {
    id: "telegram",
    name: "Telegram Bot",
    category: "Messaging",
    description: "Connect a bot for customer chats.",
    status: "available",
    href: `${DASHBOARD_ROUTES.integrations}/telegram?section=activate`,
  },
  {
    id: "website-forms",
    name: "Website Forms",
    category: "Leads",
    description: "Capture leads from any website.",
    status: "available",
    href: `${DASHBOARD_ROUTES.integrations}/website_forms?section=activate`,
  },
  {
    id: "voice",
    name: "AI Voice",
    category: "Voice",
    description: "AI calls leads after form submissions.",
    status: "available",
    href: `${DASHBOARD_ROUTES.integrations}/voice?section=activate`,
  },
  {
    id: "stripe",
    name: "Stripe Billing",
    category: "Payments",
    description: "Subscriptions and invoices.",
    status: "available",
    href: DASHBOARD_ROUTES.subscription,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    description: "Sync contacts and deals.",
    status: "coming_soon",
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Connect 5,000+ apps.",
    status: "coming_soon",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Booking",
    description: "AI booking from chat.",
    status: "beta",
  },
];
