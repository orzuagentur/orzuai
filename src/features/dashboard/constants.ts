import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Bot,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Plug,
  Settings,
  Users,
  Workflow,
} from "lucide-react";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export const DEFAULT_SUBSCRIPTION_PLAN = "Free Plan";

export const DASHBOARD_NAV_ITEMS = [
  {
    id: "overview",
    label: "Home",
    href: DASHBOARD_ROUTES.overview,
    icon: LayoutDashboard,
  },
  {
    id: "chats",
    label: "Inbox",
    href: DASHBOARD_ROUTES.chats,
    icon: MessageSquare,
  },
  {
    id: "contacts",
    label: "CRM",
    href: DASHBOARD_ROUTES.contacts,
    icon: Users,
  },
  {
    id: "ai-manager",
    label: "My Assistant",
    href: DASHBOARD_ROUTES.aiManager,
    icon: MessagesSquare,
  },
  {
    id: "ai-assistant",
    label: "AI Agents",
    href: DASHBOARD_ROUTES.aiAssistant,
    icon: Bot,
  },
  {
    id: "automations",
    label: "Automations",
    href: DASHBOARD_ROUTES.automations,
    icon: Workflow,
  },
  {
    id: "analytics",
    label: "Analytics",
    href: DASHBOARD_ROUTES.analytics,
    icon: BarChart3,
  },
  {
    id: "integrations",
    label: "Integrations",
    href: DASHBOARD_ROUTES.integrations,
    icon: Plug,
  },
  {
    id: "knowledge-base",
    label: "Knowledge",
    href: DASHBOARD_ROUTES.knowledgeBase,
    icon: BookOpen,
  },
  {
    id: "subscription",
    label: "Billing",
    href: DASHBOARD_ROUTES.subscription,
    icon: CreditCard,
  },
  {
    id: "settings",
    label: "Settings",
    href: DASHBOARD_ROUTES.settings,
    icon: Settings,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}>;

export const SETTINGS_MESSAGES = {
  pageTitle: "Settings",
  pageDescription:
    "Manage your business profile, logo, contact information, and account.",
} as const;

export const OVERVIEW_MESSAGES = {
  title: "Home",
  description: "Monitor messages, AI performance, and activity across all channels.",
  channelMetricsTitle: "Connected channels",
  channelMetricsDescription:
    "Live performance for your active messaging channels.",
  connectChannelCta: "Connect channel",
  emptyBusinessTitle: "Set up your business",
  emptyBusinessDescription:
    "Create your business profile to start tracking messages, contacts, and AI performance.",
} as const;

export const ANALYTICS_CARD_LABELS = {
  totalMessages: "Total Messages",
  uniqueContacts: "Unique Contacts",
  aiResponses: "AI Responses",
  conversionRate: "AI Coverage",
} as const;

export const DASHBOARD_COMING_SOON_MESSAGE =
  "This section is coming in a future release.";

export type DashboardNavItemId = (typeof DASHBOARD_NAV_ITEMS)[number]["id"];
