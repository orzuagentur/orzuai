import { BarChart3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CHANNEL_WORKSPACE_MESSAGES,
  getChannelLabel,
} from "@/features/channel-workspace";
import type { ChannelAnalyticsData } from "@/types/channel-workspace.types";

type ChannelAnalyticsPanelProps = {
  data: ChannelAnalyticsData;
};

export function ChannelAnalyticsPanel({ data }: ChannelAnalyticsPanelProps) {
  const label = getChannelLabel(data.channel);

  if (!data.hasBusiness) {
    return null;
  }

  const metrics = [
    {
      label: CHANNEL_WORKSPACE_MESSAGES.totalMessages,
      value: data.totalMessages,
    },
    {
      label: CHANNEL_WORKSPACE_MESSAGES.uniqueContacts,
      value: data.totalContacts,
    },
    {
      label: CHANNEL_WORKSPACE_MESSAGES.aiReplies,
      value: data.aiReplies,
    },
    {
      label: CHANNEL_WORKSPACE_MESSAGES.conversionRate,
      value: `${data.conversionRate}%`,
    },
  ];

  return (
    <Card className="max-w-3xl shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <CardTitle>
            {label} — {CHANNEL_WORKSPACE_MESSAGES.analyticsTitle}
          </CardTitle>
        </div>
        <CardDescription>
          {CHANNEL_WORKSPACE_MESSAGES.analyticsDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border bg-muted/20 p-4"
            >
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
        {data.totalMessages === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No activity yet on {label}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
