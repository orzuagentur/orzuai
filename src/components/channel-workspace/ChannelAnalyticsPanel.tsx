import Link from "next/link";
import { BarChart3, MessageSquareIcon } from "lucide-react";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  CHANNEL_WORKSPACE_MESSAGES,
  getChannelLabel,
} from "@/features/channel-workspace";
import type { ChannelAnalyticsData } from "@/types/channel-workspace.types";
import { formatMetricValue, formatRelativeTime } from "@/utils/dashboard";

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
      value: formatMetricValue(data.totalMessages),
    },
    {
      label: CHANNEL_WORKSPACE_MESSAGES.uniqueContacts,
      value: formatMetricValue(data.totalContacts),
    },
    {
      label: CHANNEL_WORKSPACE_MESSAGES.aiReplies,
      value: formatMetricValue(data.aiReplies),
    },
    {
      label: CHANNEL_WORKSPACE_MESSAGES.manualReplies,
      value: formatMetricValue(data.manualReplies),
    },
    {
      label: CHANNEL_WORKSPACE_MESSAGES.activeConversations,
      value: formatMetricValue(data.activeConversations),
    },
    {
      label: CHANNEL_WORKSPACE_MESSAGES.conversionRate,
      value: `${data.conversionRate}%`,
    },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              <div>
                <CardTitle>
                  {label} — {CHANNEL_WORKSPACE_MESSAGES.analyticsTitle}
                </CardTitle>
                <CardDescription className="mt-1">
                  {CHANNEL_WORKSPACE_MESSAGES.analyticsDescription}
                </CardDescription>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`${DASHBOARD_ROUTES.chats}/${data.channel}`}>
                {CHANNEL_WORKSPACE_MESSAGES.openChats}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              No activity yet on {label}. Metrics update when customers message
              you.
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {CHANNEL_WORKSPACE_MESSAGES.openChatsHint}
            </p>
          )}
        </CardContent>
      </Card>

      <ActivityChart
        data={data.activity}
        title={CHANNEL_WORKSPACE_MESSAGES.activityTitle}
        description="Message volume over time. Use the clock to change the period."
        valueNoun="messages"
        initialDays={7}
        fillId={`channel-${data.channel}-activityFill`}
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            {CHANNEL_WORKSPACE_MESSAGES.recentTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {CHANNEL_WORKSPACE_MESSAGES.recentEmpty}
            </p>
          ) : (
            <ul className="divide-y">
              {data.recentMessages.map((message) => (
                <li
                  key={message.id}
                  className="flex gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <MessageSquareIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {message.contactName}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{message.senderType}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(message.createdAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm">{message.preview}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
