import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
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

type LeadSourcePanelProps = {
  sources: LeadSourceEntry[];
};

export function LeadSourcePanel({ sources }: LeadSourcePanelProps) {
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
            {sources.map((source) => (
              <li key={source.channel}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <ChannelBrandIcon
                      channel={source.channel}
                      className="size-4"
                    />
                    {getChannelBadgeLabel(source.channel)}
                  </span>
                  <span className="text-muted-foreground">
                    {source.contacts} ({source.percentage}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
