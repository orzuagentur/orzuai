import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Settings,
  Users,
  Workflow,
} from "lucide-react";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";

export const DASHBOARD_AI_NAV_ITEMS = [
  {
    id: "ai-assistant-section",
    label: AI_ASSISTANT_MESSAGES.tabAssistant,
    href: DASHBOARD_ROUTES.aiAssistantSection,
    infoTitle: AI_ASSISTANT_MESSAGES.hubAssistantInfoTitle,
    infoBody: AI_ASSISTANT_MESSAGES.hubAssistantInfoBody,
  },
  {
    id: "ai-agents-section",
    label: AI_ASSISTANT_MESSAGES.tabAgents,
    href: DASHBOARD_ROUTES.aiAgentsSection,
    infoTitle: AI_ASSISTANT_MESSAGES.hubAgentsInfoTitle,
    infoBody: AI_ASSISTANT_MESSAGES.hubAgentsInfoBody,
  },
] as const;

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
    id: "ai-assistant",
    label: "AI",
    href: DASHBOARD_ROUTES.aiAssistantSection,
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

export type DashboardNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type DashboardNavItemId =
  | (typeof DASHBOARD_NAV_ITEMS)[number]["id"]
  | "calendar";

export type DashboardNavOptions = {
  googleCalendarConnected?: boolean;
};

/** Base nav plus integration-driven items (e.g. Calendar when Google is connected). */
export function buildDashboardNavItems(
  options: DashboardNavOptions = {},
): DashboardNavItem[] {
  const items: DashboardNavItem[] = [...DASHBOARD_NAV_ITEMS];

  if (options.googleCalendarConnected) {
    const crmIndex = items.findIndex((item) => item.id === "contacts");
    const calendarItem: DashboardNavItem = {
      id: "calendar",
      label: "Calendar",
      href: DASHBOARD_ROUTES.calendar,
      icon: Calendar,
    };

    if (crmIndex >= 0) {
      items.splice(crmIndex + 1, 0, calendarItem);
    } else {
      items.push(calendarItem);
    }
  }

  return items;
}

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

export const INBOUND_ALERT_MESSAGES = {
  newMessageTitle: "New message",
  openChat: "Open",
} as const;

export const AI_HUMAN_REQUEST_MESSAGES = {
  buttonLabel: "Notifications",
  panelTitle: "Human help requests",
  panelDescription:
    "When AI cannot handle a conversation, it calls you here — not as a new message.",
  emptyState: "No human help requests from AI",
  connect: "Connect",
  dismiss: "Dismiss",
  accept: "Accept",
  decline: "Decline",
  overlayTitle: "Customer wants a manager",
  overlayDescription: "AI asked for a real person to join this conversation.",
  declineSuccess: "Request declined. The customer was notified.",
  declinePartial: "Request declined, but the customer could not be notified.",
  acceptSuccess: "Opening conversation…",
  toastTitle: "AI needs a real person",
  toastReasonFallback: "Customer needs human help",
  relativeJustNow: "Just now",
} as const;

export const ANALYTICS_CARD_LABELS = {
  totalMessages: "Total Messages",
  uniqueContacts: "Unique Contacts",
  aiResponses: "AI Responses",
  conversionRate: "AI Coverage",
} as const;

export const DASHBOARD_COMING_SOON_MESSAGE =
  "This section is coming in a future release.";
