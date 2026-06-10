"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { ChannelAnalyticsPanel } from "@/components/channel-workspace/ChannelAnalyticsPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { getChannelLabel } from "@/features/channel-workspace";
import { buildIntegrationActivateHref } from "@/features/integrations";
import type { AnalyticsChannelEntry } from "@/types/channel-workspace.types";

type AnalyticsChannelDetailPanelProps = {
  entry: AnalyticsChannelEntry;
  onBack?: () => void;
};

export function AnalyticsChannelDetailPanel({
  entry,
  onBack,
}: AnalyticsChannelDetailPanelProps) {
  const label = getChannelLabel(entry.channel);

  if (!entry.isChannelConnected) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 lg:hidden"
              onClick={onBack}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
          ) : null}
          <h2 className="text-base font-semibold">{label}</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <Card className="max-w-lg shadow-none">
            <CardHeader>
              <CardTitle>
                {ANALYTICS_MESSAGES.channelsDisconnectedTitle(label)}
              </CardTitle>
              <CardDescription>
                {ANALYTICS_MESSAGES.channelNotConnected}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={buildIntegrationActivateHref(entry.channel)}>
                  {ANALYTICS_MESSAGES.goToIntegrations}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {onBack ? (
        <div className="border-b px-4 py-2 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={onBack}
          >
            <ArrowLeftIcon className="size-4" />
            {ANALYTICS_MESSAGES.channelsColumnChannel}
          </Button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <ChannelAnalyticsPanel data={entry.analytics} />
      </div>
    </div>
  );
}
