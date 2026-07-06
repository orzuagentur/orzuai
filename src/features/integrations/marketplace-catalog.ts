import { GoogleCalendarIcon } from "@/components/icons/channel-brand-icons";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { ChannelIconComponent } from "./constants";

export type MarketplaceAppStatus = "available" | "beta" | "coming_soon";

export type MarketplaceApp = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: MarketplaceAppStatus;
  href?: string;
  icon?: ChannelIconComponent;
};

/** Third-party apps and platform links — connectable channels live in INTEGRATION_CHANNEL_LIST. */
export const THIRD_PARTY_MARKETPLACE_APPS: MarketplaceApp[] = [
  {
    id: "ai_assistant",
    name: "AI Agent",
    category: "AI",
    description: "System prompt, tools, follow-ups, and channel routing.",
    status: "available",
    href: DASHBOARD_ROUTES.aiAssistant,
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "Productivity",
    description: "AI booking and calendar sync.",
    status: "beta",
    href: `${DASHBOARD_ROUTES.integrations}/google_calendar?section=activate`,
    icon: GoogleCalendarIcon,
  },
  {
    id: "stripe",
    name: "Stripe Billing",
    category: "Billing",
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

export const MARKETPLACE_AI_LINK = THIRD_PARTY_MARKETPLACE_APPS.find(
  (app) => app.id === "ai_assistant",
)!;
