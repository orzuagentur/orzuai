import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isMessagingIntegrationChannel } from "@/features/integrations";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import type { MessagingChannel } from "@/types/database.types";

export const ANALYTICS_TABS = [
  "pulse",
  "channels",
  "sales",
  "ai_ops",
] as const;

export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

export const ANALYTICS_PERIODS = ["7d", "30d", "all"] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export type AnalyticsUrlState = {
  tab?: AnalyticsTab;
  period?: AnalyticsPeriod;
  channel?: MessagingChannel | null;
};

export function isAnalyticsTab(value: string): value is AnalyticsTab {
  return (ANALYTICS_TABS as readonly string[]).includes(value);
}

export function isAnalyticsPeriod(value: string): value is AnalyticsPeriod {
  return (ANALYTICS_PERIODS as readonly string[]).includes(value);
}

export function buildAnalyticsHref(state: AnalyticsUrlState = {}): string {
  const params = new URLSearchParams();

  if (state.tab && state.tab !== "pulse") {
    params.set("tab", state.tab);
  }

  if (state.period && state.period !== "7d") {
    params.set("period", state.period);
  }

  if (state.tab === "channels" && state.channel) {
    params.set("channel", state.channel);
  }

  const query = params.toString();

  return query
    ? `${DASHBOARD_ROUTES.analytics}?${query}`
    : DASHBOARD_ROUTES.analytics;
}

export function parseAnalyticsSearchParams(input: {
  tab?: string;
  period?: string;
  channel?: string;
}): {
  activeTab: AnalyticsTab;
  activePeriod: AnalyticsPeriod;
  activeChannelId: MessagingChannel | null;
} {
  const activeTab =
    input.tab && isAnalyticsTab(input.tab)
      ? input.tab
      : input.tab === "ask"
        ? "pulse"
        : "pulse";
  const activePeriod =
    input.period && isAnalyticsPeriod(input.period) ? input.period : "7d";
  const activeChannelId =
    activeTab === "channels" &&
    input.channel &&
    isMessagingIntegrationChannel(input.channel as MessagingIntegrationChannelId)
      ? (input.channel as MessagingChannel)
      : null;

  return { activeTab, activePeriod, activeChannelId };
}
