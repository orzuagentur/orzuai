"use client";

import { AnalyticsChannelDetailPanel } from "@/components/analytics/AnalyticsChannelDetailPanel";
import { AnalyticsChannelsListPanel } from "@/components/analytics/AnalyticsChannelsListPanel";
import { EmptyState } from "@/components/ui/empty-state";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { cn } from "@/lib/utils";
import type { AnalyticsPageData } from "@/types/channel-workspace.types";

type AnalyticsChannelsPanelProps = {
  data: AnalyticsPageData;
  onClearChannel: () => void;
};

export function AnalyticsChannelsPanel({
  data,
  onClearChannel,
}: AnalyticsChannelsPanelProps) {
  const activeEntry = data.activeChannelId
    ? data.channels.find((entry) => entry.channel === data.activeChannelId)
    : null;

  const showDetailOnMobile = Boolean(data.activeChannelId);

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">
          {ANALYTICS_MESSAGES.channelsPanelTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {ANALYTICS_MESSAGES.channelsPanelDescription}
        </p>
      </div>

      <div
        className={cn(
          "grid h-[calc(100%-4.5rem)] min-h-0 min-w-0 overflow-hidden",
          "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "flex min-h-0 min-w-0 flex-col overflow-hidden border-r",
            showDetailOnMobile && "hidden lg:flex",
          )}
        >
          <AnalyticsChannelsListPanel
            channels={data.channels}
            channelStatuses={data.channelStatuses}
            activeChannelId={data.activeChannelId}
            activePeriod={data.activePeriod}
          />
        </aside>

        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-col overflow-hidden",
            showDetailOnMobile ? "flex" : "hidden lg:flex",
          )}
        >
          {activeEntry ? (
            <AnalyticsChannelDetailPanel
              entry={activeEntry}
              onBack={showDetailOnMobile ? onClearChannel : undefined}
            />
          ) : (
            <EmptyState
              variant="generic"
              title={ANALYTICS_MESSAGES.channelsSelectHint}
              description={ANALYTICS_MESSAGES.channelsSelectDescription}
              className="flex-1"
            />
          )}
        </main>
      </div>
    </div>
  );
}
