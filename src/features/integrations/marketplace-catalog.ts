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

/** Third-party apps only — connectable channels live in INTEGRATION_CHANNEL_LIST. */
export const THIRD_PARTY_MARKETPLACE_APPS: MarketplaceApp[] = [
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
];
