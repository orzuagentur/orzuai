"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  Loader2Icon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getConversationCrmAssistantAction } from "@/features/chats/actions/get-conversation-crm-assistant";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { getChannelBadgeLabel } from "@/features/chats/channel-ui";
import { cn } from "@/lib/utils";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { ConversationDetail } from "@/types/chat.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import { formatRelativeTime } from "@/utils/dashboard";
import {
  getConversationStatusClassName,
  getConversationStatusLabel,
} from "@/utils/conversation-status";
import {
  getLeadScoreBadgeClassName,
  getLeadScoreLabel,
} from "@/utils/lead-score";

type InboxDetailsPanelProps = {
  conversation: ConversationDetail | null;
  cannedResponses: CannedResponseItem[];
  onUseSuggestedReply: (content: string) => void;
  className?: string;
};

function DetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3 border-b px-4 py-4 last:border-b-0", className)}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function InboxDetailsPanel({
  conversation,
  cannedResponses,
  onUseSuggestedReply,
  className,
}: InboxDetailsPanelProps) {
  const [crmData, setCrmData] = useState<Awaited<
    ReturnType<typeof getConversationCrmAssistantAction>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!conversation) {
      setCrmData(null);
      return;
    }

    const conversationId = conversation.id;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const result = await getConversationCrmAssistantAction({
        conversationId,
      });

      if (!cancelled) {
        setCrmData(result);
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [conversation]);

  if (!conversation) {
    return (
      <aside
        className={cn(
          "flex h-full flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <UserIcon className="mb-2 size-8 opacity-40" />
        <p>{CHAT_MESSAGES.selectConversationOverview}</p>
      </aside>
    );
  }

  const firstMessageAt = conversation.messages[0]?.createdAt ?? null;
  const lastMessageAt =
    conversation.messages[conversation.messages.length - 1]?.createdAt ??
    conversation.updatedAt;
  const crm = crmData?.success ? crmData.data : null;

  return (
    <aside className={cn("flex h-full min-h-0 flex-col overflow-y-auto", className)}>
      <DetailSection title={CHAT_MESSAGES.contactDetailsTitle}>
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {conversation.contactName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-medium">{conversation.contactName}</p>
            {crm?.leadScore !== null && crm?.leadScore !== undefined ? (
              <Badge
                variant="outline"
                className={getLeadScoreBadgeClassName(crm.leadScore)}
              >
                {CHAT_MESSAGES.leadScoreLabel}: {crm.leadScore} ·{" "}
                {getLeadScoreLabel(crm.leadScore)}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <PhoneIcon className="size-3.5 shrink-0" />
            <span className="truncate">
              {formatContactIdentifier(conversation.contactPhone)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MailIcon className="size-3.5 shrink-0" />
            <span className="truncate">{CHAT_MESSAGES.contactEmailUnavailable}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPinIcon className="size-3.5 shrink-0" />
            <span className="truncate">{CHAT_MESSAGES.contactLocationUnavailable}</span>
          </div>
        </div>

        <Button variant="link" size="sm" className="h-auto p-0" asChild>
          <Link href={DASHBOARD_ROUTES.contacts}>{CHAT_MESSAGES.viewInCrm}</Link>
        </Button>
      </DetailSection>

      <DetailSection title={CHAT_MESSAGES.aiAssistantTitle}>
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            {CHAT_MESSAGES.crmAssistantLoading}
          </div>
        ) : (
          <>
            {crm?.aiSummary ? (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium">
                  {CHAT_MESSAGES.leadSummaryTitle}
                </p>
                <p className="text-sm text-muted-foreground">{crm.aiSummary}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {CHAT_MESSAGES.leadSummaryEmpty}
              </p>
            )}
            {crm?.suggestedAction ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {CHAT_MESSAGES.crmSuggestedAction}:{" "}
                </span>
                {crm.suggestedAction}
              </p>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <SparklesIcon className="size-3.5" />
              {CHAT_MESSAGES.generateReply}
            </Button>
          </>
        )}
      </DetailSection>

      <DetailSection title={CHAT_MESSAGES.suggestedRepliesTitle}>
        {cannedResponses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {CHAT_MESSAGES.suggestedRepliesEmpty}
          </p>
        ) : (
          <div className="space-y-2">
            {cannedResponses.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onUseSuggestedReply(item.content)}
                className="w-full rounded-lg border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <p className="font-medium">{item.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {item.content}
                </p>
              </button>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title={CHAT_MESSAGES.conversationInfoTitle}>
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="size-3.5" />
              {CHAT_MESSAGES.firstContactLabel}
            </dt>
            <dd className="tabular-nums">
              {firstMessageAt
                ? formatRelativeTime(firstMessageAt)
                : CHAT_MESSAGES.notAvailable}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{CHAT_MESSAGES.lastContactLabel}</dt>
            <dd className="tabular-nums">{formatRelativeTime(lastMessageAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{CHAT_MESSAGES.channelLabel}</dt>
            <dd className="inline-flex items-center gap-1.5">
              <ChannelBrandIcon channel={conversation.channel} className="size-3.5" />
              {getChannelBadgeLabel(conversation.channel)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{CHAT_MESSAGES.statusLabel}</dt>
            <dd>
              <Badge
                variant="outline"
                className={getConversationStatusClassName(conversation.status)}
              >
                {getConversationStatusLabel(conversation.status)}
              </Badge>
            </dd>
          </div>
        </dl>
      </DetailSection>
    </aside>
  );
}
