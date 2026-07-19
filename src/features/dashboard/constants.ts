import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Phone,
  Plug,
  UserCog,
  Users,
} from "lucide-react";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";

export const DASHBOARD_AI_NAV_ITEMS = [
  {
    id: "ai-agent",
    label: AI_ASSISTANT_MESSAGES.singleAgentTitle,
    href: DASHBOARD_ROUTES.aiAssistant,
    infoTitle: AI_ASSISTANT_MESSAGES.singleAgentInfoTitle,
    infoBody: AI_ASSISTANT_MESSAGES.singleAgentInfoBody,
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
    label: "Chats",
    href: DASHBOARD_ROUTES.chats,
    icon: MessageSquare,
  },
  {
    id: "orders",
    label: "Orders",
    href: DASHBOARD_ROUTES.orders,
    icon: ClipboardList,
  },
  {
    id: "voice",
    label: "Calls",
    href: DASHBOARD_ROUTES.voice,
    icon: Phone,
  },
  {
    id: "contacts",
    label: "CRM",
    href: DASHBOARD_ROUTES.contacts,
    icon: Users,
  },
  {
    id: "calendar",
    label: "Calendar",
    href: DASHBOARD_ROUTES.calendar,
    icon: Calendar,
  },
  {
    id: "ai-assistant",
    label: "AI Agent",
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
    id: "team",
    label: "Team",
    href: DASHBOARD_ROUTES.team,
    icon: UserCog,
  },
  {
    id: "integrations",
    label: "Integrations",
    href: DASHBOARD_ROUTES.integrations,
    icon: Plug,
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

/** Base dashboard navigation (Calendar is always available; Google sync is optional). */
export function buildDashboardNavItems(
  _options: DashboardNavOptions = {},
): DashboardNavItem[] {
  return [...DASHBOARD_NAV_ITEMS];
}

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
  panelTitle: "Notifications",
  panelDescription:
    "AI action reports and manager call-outs stay here until you review them.",
  emptyState: "No notifications yet",
  aiActionLabel: "AI action report",
  humanRequestLabel: "Manager call-out",
  resolvedLabel: "Handled",
  connect: "Connect",
  dismiss: "Dismiss",
  deleteNotification: "Delete",
  deleteNotificationTitle: "Delete notification?",
  deleteNotificationDescription:
    "This removes the notification from your list. It cannot be undone.",
  deleteNotificationConfirm: "Delete",
  deleteNotificationCancel: "Cancel",
  accept: "Accept",
  decline: "Decline",
  openChat: "Open chat",
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
