import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { getChannelBadgeLabel } from "@/features/chats/channel-ui";
import type { LeadSourceEntry } from "@/types/dashboard.types";
import type { MessagingChannel } from "@/types/database.types";

type LeadSourcePanelProps = {
  sources: LeadSourceEntry[];
  channelHref?: (channel: MessagingChannel, count: number) => string | null;
  channelLinkLabel?: (count: number) => string;
};

export function LeadSourcePanel({
  sources,
  channelHref,
  channelLinkLabel,
}: LeadSourcePanelProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.leadSourceTitle}
        </CardTitle>
        <CardDescription>
          {ANALYTICS_MESSAGES.leadSourceDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {ANALYTICS_MESSAGES.leadSourceEmpty}
          </p>
        ) : (
          <ul className="space-y-3">
            {sources.map((source) => {
              const href = channelHref?.(source.channel, source.contacts);

              return (
                <li key={source.channel}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <ChannelBrandIcon
                        channel={source.channel}
                        className="size-4"
                      />
                      {getChannelBadgeLabel(source.channel)}
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {source.contacts} ({source.percentage}%)
                      {href ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2"
                          asChild
                        >
                          <Link href={href}>
                            {channelLinkLabel?.(source.contacts) ??
                              ANALYTICS_MESSAGES.viewInCrm}
                            <ArrowRightIcon className="size-3.5" />
                          </Link>
                        </Button>
                      ) : null}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
