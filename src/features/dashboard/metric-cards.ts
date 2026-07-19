import type { LucideIcon } from "lucide-react";
import {
  BotIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  HandshakeIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  TrophyIcon,
  UserPlusIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import type {
  DashboardActivityViewId,
  DashboardCardMetricKey,
  DashboardCardPeriod,
  DashboardCardSlotId,
} from "@/types/dashboard-home.types";

export const DASHBOARD_CARD_PERIOD_OPTIONS: Array<{
  id: DashboardCardPeriod;
  label: string;
}> = [
  { id: "all", label: "All time" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

export type DashboardCardVariantConfig = {
  id: DashboardCardMetricKey;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type DashboardCardSlotConfig = {
  id: DashboardCardSlotId;
  href: string;
  defaultVariant: DashboardCardMetricKey;
  variants: DashboardCardVariantConfig[];
};

/** Each slot owns exclusive metrics — never shared across cards. */
export const DASHBOARD_CARD_SLOTS: DashboardCardSlotConfig[] = [
  {
    id: "messages",
    href: DASHBOARD_ROUTES.chats,
    defaultVariant: "newMessages",
    variants: [
      {
        id: "newMessages",
        label: "New messages",
        description: "Inbound and outbound messages in the selected period.",
        icon: MessageSquareIcon,
      },
      {
        id: "totalMessages",
        label: "Total messages",
        description: "All channel messages counted for this period.",
        icon: MessagesSquareIcon,
      },
      {
        id: "aiResponses",
        label: "AI responses",
        description: "Replies generated automatically by your AI assistant.",
        icon: BotIcon,
      },
    ],
  },
  {
    id: "contacts",
    href: DASHBOARD_ROUTES.contacts,
    defaultVariant: "newContacts",
    variants: [
      {
        id: "newContacts",
        label: "New contacts",
        description: "Customers added to your CRM in this period.",
        icon: UserPlusIcon,
      },
      {
        id: "allContacts",
        label: "All contacts",
        description: "Full CRM size (not limited by the selected period).",
        icon: UsersIcon,
      },
      {
        id: "qualifiedContacts",
        label: "Qualified leads",
        description: "Contacts currently marked as qualified in the pipeline.",
        icon: HandshakeIcon,
      },
    ],
  },
  {
    id: "orders",
    href: DASHBOARD_ROUTES.orders,
    defaultVariant: "newOrders",
    variants: [
      {
        id: "newOrders",
        label: "New orders",
        description: "Orders created or waiting to be started.",
        icon: ClipboardListIcon,
      },
      {
        id: "inProgressOrders",
        label: "In progress",
        description: "Orders currently being handled by your team.",
        icon: ClipboardListIcon,
      },
      {
        id: "doneOrders",
        label: "Completed orders",
        description: "Orders marked done in the selected period.",
        icon: CheckCircle2Icon,
      },
    ],
  },
  {
    id: "deals",
    href: DASHBOARD_ROUTES.contacts,
    defaultVariant: "openDeals",
    variants: [
      {
        id: "openDeals",
        label: "Open deals",
        description: "Active pipeline deals that are not won or lost.",
        icon: HandshakeIcon,
      },
      {
        id: "wonDeals",
        label: "Wins",
        description: "Deals closed as won in the selected period.",
        icon: TrophyIcon,
      },
      {
        id: "lostDeals",
        label: "Losses",
        description: "Deals closed as lost in the selected period.",
        icon: XCircleIcon,
      },
    ],
  },
];

export const DASHBOARD_ACTIVITY_VIEWS: Array<{
  id: DashboardActivityViewId;
  label: string;
  description: string;
  metric: "messages" | "clients" | "deals" | "calls" | "orders";
  valueNoun: string;
  strokeColor: string;
  fillId: string;
}> = [
  {
    id: "messageActivity",
    label: "Message activity",
    description: "Inbound and outbound message volume over time.",
    metric: "messages",
    valueNoun: "messages",
    strokeColor: "rgb(124 58 237)",
    fillId: "dashboardMessagesFill",
  },
  {
    id: "newClients",
    label: "New clients",
    description: "Contacts created across messaging channels.",
    metric: "clients",
    valueNoun: "clients",
    strokeColor: "rgb(14 165 233)",
    fillId: "dashboardClientsFill",
  },
  {
    id: "dealOutcomes",
    label: "Won vs lost",
    description: "Deal outcomes closed as won or lost.",
    metric: "deals",
    valueNoun: "outcomes",
    strokeColor: "rgb(16 185 129)",
    fillId: "dashboardDealsFill",
  },
  {
    id: "callVolume",
    label: "Platform calls",
    description: "AI, manager, inbound and outbound call volume.",
    metric: "calls",
    valueNoun: "calls",
    strokeColor: "rgb(244 63 94)",
    fillId: "dashboardCallsFill",
  },
  {
    id: "orderVolume",
    label: "Orders created",
    description: "New CRM orders by status over the selected period.",
    metric: "orders",
    valueNoun: "orders",
    strokeColor: "rgb(245 158 11)",
    fillId: "dashboardOrdersFill",
  },
];

export function periodToDays(period: DashboardCardPeriod): number | null {
  switch (period) {
    case "week":
      return 7;
    case "month":
      return 30;
    case "year":
      return 365;
    case "all":
      return null;
  }
}

export function periodLabel(period: DashboardCardPeriod): string {
  return (
    DASHBOARD_CARD_PERIOD_OPTIONS.find((option) => option.id === period)
      ?.label ?? "All time"
  );
}
