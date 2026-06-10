"use client";

import Link from "next/link";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { getChannelLabel } from "@/features/channel-workspace";
import type { IntegrationChannelStatusEntry } from "@/features/integrations";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations";
import { cn } from "@/lib/utils";
import type {
  AnalyticsChannelEntry,
  AnalyticsPageData,
} from "@/types/channel-workspace.types";
import type { MessagingChannel } from "@/types/database.types";
import { buildAnalyticsHref } from "@/utils/analytics-url";
import { formatMetricValue } from "@/utils/dashboard";

type AnalyticsChannelsListPanelProps = {
  channels: AnalyticsChannelEntry[];
  channelStatuses: AnalyticsPageData["channelStatuses"];
  activeChannelId: MessagingChannel | null;
  activePeriod: AnalyticsPageData["activePeriod"];
};

function statusLabel(status: IntegrationChannelStatusEntry["status"]) {
  if (status === "connected") {
    return ANALYTICS_MESSAGES.channelsStatusConnected;
  }

  if (status === "pending") {
    return ANALYTICS_MESSAGES.channelsStatusPending;
  }

  return ANALYTICS_MESSAGES.channelsStatusDisconnected;
}

function statusBadgeVariant(
  status: IntegrationChannelStatusEntry["status"],
): "default" | "secondary" | "outline" {
  if (status === "connected") {
    return "default";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

function getAiShare(entry: AnalyticsChannelEntry): string {
  const { totalMessages, aiReplies } = entry.analytics;

  if (totalMessages <= 0) {
    return "—";
  }

  return `${Math.round((aiReplies / totalMessages) * 100)}%`;
}

export function AnalyticsChannelsListPanel({
  channels,
  channelStatuses,
  activeChannelId,
  activePeriod,
}: AnalyticsChannelsListPanelProps) {
  const entryByChannel = new Map(channels.map((entry) => [entry.channel, entry]));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="hidden border-b px-4 py-2 lg:grid lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.75fr))_minmax(0,0.9fr)] lg:gap-3 lg:text-xs lg:font-medium lg:text-muted-foreground">
        <span>{ANALYTICS_MESSAGES.channelsColumnChannel}</span>
        <span className="text-right">{ANALYTICS_MESSAGES.channelsColumnMessages}</span>
        <span className="text-right">{ANALYTICS_MESSAGES.channelsColumnContacts}</span>
        <span className="text-right">{ANALYTICS_MESSAGES.channelsColumnAiShare}</span>
        <span className="text-right">{ANALYTICS_MESSAGES.channelsColumnStatus}</span>
      </div>

      <ul className="divide-y">
        {MESSAGING_INTEGRATION_CHANNELS.map((channelId) => {
          const entry = entryByChannel.get(channelId);
          const status =
            channelStatuses[channelId]?.status ?? "disconnected";
          const isActive = activeChannelId === channelId;
          const analytics = entry?.analytics;

          return (
            <li key={channelId}>
              <Link
                href={buildAnalyticsHref({
                  tab: "channels",
                  channel: channelId,
                  period: activePeriod,
                })}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                  isActive && "bg-primary/5",
                  "lg:grid lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.75fr))_minmax(0,0.9fr)] lg:gap-3",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 lg:min-w-0">
                  <ChannelBrandIcon channel={channelId} className="size-4 shrink-0" />
                  <span className="truncate text-sm font-medium">
                    {getChannelLabel(channelId)}
                  </span>
                </div>

                <div className="hidden text-right text-sm tabular-nums lg:block">
                  {formatMetricValue(analytics?.totalMessages ?? 0)}
                </div>
                <div className="hidden text-right text-sm tabular-nums lg:block">
                  {formatMetricValue(analytics?.totalContacts ?? 0)}
                </div>
                <div className="hidden text-right text-sm tabular-nums lg:block">
                  {entry ? getAiShare(entry) : "—"}
                </div>
                <div className="flex shrink-0 justify-end lg:block">
                  <Badge
                    variant={statusBadgeVariant(status)}
                    className="text-[10px]"
                  >
                    {statusLabel(status)}
                  </Badge>
                </div>

                <div className="ml-auto grid shrink-0 grid-cols-3 gap-2 text-center text-xs lg:hidden">
                  <div>
                    <p className="text-muted-foreground">
                      {ANALYTICS_MESSAGES.channelsColumnMessages}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {formatMetricValue(analytics?.totalMessages ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {ANALYTICS_MESSAGES.channelsColumnContacts}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {formatMetricValue(analytics?.totalContacts ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {ANALYTICS_MESSAGES.channelsColumnAiShare}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {entry ? getAiShare(entry) : "—"}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
