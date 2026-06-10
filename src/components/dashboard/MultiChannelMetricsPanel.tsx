import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { OVERVIEW_MESSAGES } from "@/features/dashboard/constants";
import { buildAnalyticsHref } from "@/utils/analytics-url";
import { getChannelBadgeLabel } from "@/features/chats/channel-ui";
import type { ChannelMetricSummary } from "@/types/dashboard.types";
import { formatMetricValue } from "@/utils/dashboard";

type MultiChannelMetricsPanelProps = {
  channels: ChannelMetricSummary[];
};

function getStatusBadge(status: ChannelMetricSummary["status"]) {
  if (status === "connected") {
    return { label: "Live", variant: "default" as const };
  }

  return { label: "Pending", variant: "secondary" as const };
}

export function MultiChannelMetricsPanel({
  channels,
}: MultiChannelMetricsPanelProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {OVERVIEW_MESSAGES.channelMetricsTitle}
        </CardTitle>
        <CardDescription>
          {OVERVIEW_MESSAGES.channelMetricsDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {channels.map((entry) => {
            const statusBadge = getStatusBadge(entry.status);

            return (
              <Link
                key={entry.channel}
                href={buildAnalyticsHref({
                  tab: "channels",
                  channel: entry.channel,
                })}
                className="rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ChannelBrandIcon channel={entry.channel} className="size-4" />
                    <span className="text-sm font-medium">
                      {getChannelBadgeLabel(entry.channel)}
                    </span>
                  </div>
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-caption">Msgs</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMetricValue(entry.totalMessages)}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption">Contacts</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMetricValue(entry.totalContacts)}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption">AI</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMetricValue(entry.aiReplies)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}

          <Link
            href={DASHBOARD_ROUTES.integrations}
            className="flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/10 p-3 text-center transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PlusIcon className="size-4" />
            </div>
            <span className="text-sm font-medium">
              {OVERVIEW_MESSAGES.connectChannelCta}
            </span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
