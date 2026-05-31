import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Bot,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Settings,
  Users,
} from "lucide-react";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export const DEFAULT_SUBSCRIPTION_PLAN = "Free Plan";

export const DASHBOARD_NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    href: DASHBOARD_ROUTES.overview,
    icon: LayoutDashboard,
  },
  {
    id: "chats",
    label: "Chats",
    href: DASHBOARD_ROUTES.chats,
    icon: MessageSquare,
  },
  {
    id: "contacts",
    label: "Contacts",
    href: DASHBOARD_ROUTES.contacts,
    icon: Users,
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    href: DASHBOARD_ROUTES.knowledgeBase,
    icon: BookOpen,
  },
  {
    id: "integrations",
    label: "Integrations",
    href: DASHBOARD_ROUTES.integrations,
    icon: Plug,
  },
  {
    id: "ai-assistant",
    label: "AI Assistant",
    href: DASHBOARD_ROUTES.aiAssistant,
    icon: Bot,
  },
  {
    id: "analytics",
    label: "Analytics",
    href: DASHBOARD_ROUTES.analytics,
    icon: BarChart3,
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

export const OVERVIEW_MESSAGES = {
  title: "Overview",
  description: "Monitor your WhatsApp assistant performance at a glance.",
  emptyBusinessTitle: "Set up your business",
  emptyBusinessDescription:
    "Create your business profile to start tracking messages, contacts, and AI performance.",
} as const;

export const ANALYTICS_CARD_LABELS = {
  totalMessages: "Total Messages",
  uniqueContacts: "Unique Contacts",
  aiResponses: "AI Responses",
  conversionRate: "Conversion Rate",
} as const;

export const DASHBOARD_COMING_SOON_MESSAGE =
  "This section is coming in a future release.";

export type DashboardNavItemId = (typeof DASHBOARD_NAV_ITEMS)[number]["id"];
