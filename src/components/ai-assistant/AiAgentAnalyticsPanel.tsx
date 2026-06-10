"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  BarChart3Icon,
  Loader2Icon,
  MessageSquareIcon,
  MessagesSquareIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AiAgentChannelIconRow } from "@/components/ai-assistant/AiAgentChannelIconRow";
import { AiAgentIcon } from "@/components/ai-assistant/AiAgentIcon";
import { Button } from "@/components/ui/button";
import { fetchAiAgentAnalyticsAction } from "@/features/ai-assistant/actions/fetch-ai-agent-analytics";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getChannelLabel } from "@/features/channel-workspace";
import { cn } from "@/lib/utils";
import type { AiAgentAnalytics, AiAgentItem } from "@/types/ai-agent.types";
import { formatRelativeTime } from "@/utils/dashboard";

type AiAgentAnalyticsPanelProps = {
  agent: AiAgentItem;
  onBack?: () => void;
  onClose: () => void;
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof UsersIcon;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? (
            <p className="mt-1 text-caption text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function AiAgentAnalyticsPanel({
  agent,
  onBack,
  onClose,
}: AiAgentAnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<AiAgentAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);

      const result = await fetchAiAgentAnalyticsAction(agent.id);

      if (cancelled) {
        return;
      }

      if (!result.success) {
        toast.error(result.error.message);
        setAnalytics(null);
        setIsLoading(false);
        return;
      }

      setAnalytics(result.data);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  const maxDailyCount = Math.max(
    ...(analytics?.dailyReplies.map((point) => point.count) ?? [1]),
    1,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b bg-muted/20 px-4 py-4">
        {onBack ? (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
          </Button>
        ) : null}
        <AiAgentIcon iconId={agent.icon} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">
            {AI_ASSISTANT_MESSAGES.agentAnalyticsTitle}
          </p>
          <p className="text-caption text-muted-foreground">{agent.name}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {AI_ASSISTANT_MESSAGES.agentAnalyticsClose}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={AI_ASSISTANT_MESSAGES.agentAnalyticsContacts}
                value={analytics.contactsServed}
                hint={AI_ASSISTANT_MESSAGES.agentAnalyticsContactsHint}
                icon={UsersIcon}
              />
              <StatCard
                label={AI_ASSISTANT_MESSAGES.agentAnalyticsConversations}
                value={analytics.conversationsHandled}
                hint={AI_ASSISTANT_MESSAGES.agentAnalyticsConversationsHint}
                icon={MessagesSquareIcon}
              />
              <StatCard
                label={AI_ASSISTANT_MESSAGES.agentAnalyticsTotalReplies}
                value={analytics.totalAiReplies}
                hint={AI_ASSISTANT_MESSAGES.agentAnalyticsTotalRepliesHint}
                icon={MessageSquareIcon}
              />
              <StatCard
                label={AI_ASSISTANT_MESSAGES.agentAnalyticsLast7Days}
                value={analytics.aiRepliesLast7Days}
                hint={AI_ASSISTANT_MESSAGES.agentAnalyticsLast30DaysCount(
                  analytics.aiRepliesLast30Days,
                )}
                icon={BarChart3Icon}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.agentAnalyticsAvgPerContact}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {analytics.avgRepliesPerContact}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.agentAnalyticsAvgPerConversation}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {analytics.avgRepliesPerConversation}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.agentAnalyticsClientMessages}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {analytics.clientMessagesInHandledConversations}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.agentAnalyticsHumanReplies}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {analytics.humanRepliesAfterAgent}
                </p>
              </div>
            </div>

            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold">
                {AI_ASSISTANT_MESSAGES.agentAnalyticsActivityTitle}
              </h3>
              <p className="mt-1 text-caption text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.agentAnalyticsActivityHint}
              </p>
              <div className="mt-4 flex h-36 items-end gap-1.5">
                {analytics.dailyReplies.map((point) => (
                  <div
                    key={point.date}
                    className="flex min-w-0 flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className={cn(
                        "w-full rounded-t-md bg-primary/80 transition-all",
                        point.count === 0 && "bg-muted",
                      )}
                      style={{
                        height: `${Math.max((point.count / maxDailyCount) * 100, point.count > 0 ? 8 : 4)}%`,
                      }}
                      title={`${formatShortDate(point.date)}: ${point.count}`}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {formatShortDate(point.date)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold">
                {AI_ASSISTANT_MESSAGES.agentAnalyticsByChannel}
              </h3>
              <div className="mt-4 space-y-3">
                {analytics.channelBreakdown.map((entry) => (
                  <div
                    key={entry.channel}
                    className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <AiAgentChannelIconRow channels={[entry.channel]} size="md" />
                      <p className="text-sm font-medium">
                        {getChannelLabel(entry.channel)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center sm:gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {AI_ASSISTANT_MESSAGES.agentAnalyticsContacts}
                        </p>
                        <p className="text-sm font-semibold tabular-nums">
                          {entry.contactsServed}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {AI_ASSISTANT_MESSAGES.agentAnalyticsConversations}
                        </p>
                        <p className="text-sm font-semibold tabular-nums">
                          {entry.conversationsHandled}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {AI_ASSISTANT_MESSAGES.agentAnalyticsTotalReplies}
                        </p>
                        <p className="text-sm font-semibold tabular-nums">
                          {entry.aiReplies}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold">
                {AI_ASSISTANT_MESSAGES.agentAnalyticsTimeline}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {AI_ASSISTANT_MESSAGES.agentAnalyticsFirstReply}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {analytics.firstReplyAt
                      ? formatRelativeTime(analytics.firstReplyAt)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {AI_ASSISTANT_MESSAGES.agentAnalyticsLastReply}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {analytics.lastReplyAt
                      ? formatRelativeTime(analytics.lastReplyAt)
                      : "—"}
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <BarChart3Icon className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.agentAnalyticsEmpty}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
