"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2Icon,
  CalendarIcon,
  Loader2Icon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SparklesIcon,
  TagIcon,
  UserIcon,
} from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getConversationCrmAssistantAction } from "@/features/chats/actions/get-conversation-crm-assistant";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { getChannelBadgeLabel } from "@/features/chats/channel-ui";
import { getContactProfileAction } from "@/features/contacts/actions/get-contact-profile";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import type { ConversationCrmAssistantData } from "@/services/crm-assistant.service";
import { cn } from "@/lib/utils";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { ConversationDetail } from "@/types/chat.types";
import type { PipelineStage, UnifiedContactItem } from "@/types/contact.types";
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
  onGenerateReply?: () => void;
  className?: string;
};

const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
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

function formatDealValue(value: number | null): string {
  if (value === null) {
    return CHAT_MESSAGES.notAvailable;
  }

  return `$${value.toLocaleString()}`;
}

export function InboxDetailsPanel({
  conversation,
  cannedResponses,
  onUseSuggestedReply,
  onGenerateReply,
  className,
}: InboxDetailsPanelProps) {
  const [crmData, setCrmData] = useState<ConversationCrmAssistantData | null>(null);
  const [contactProfile, setContactProfile] = useState<UnifiedContactItem | null>(
    null,
  );
  const [crmLoadState, setCrmLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const loadedConversationIdRef = useRef<string | null>(null);
  const conversationId = conversation?.id ?? null;
  const contactId = conversation?.contactId ?? crmData?.contactId ?? null;

  useEffect(() => {
    if (!conversationId) {
      setCrmData(null);
      setContactProfile(null);
      setCrmLoadState("idle");
      loadedConversationIdRef.current = null;
      return;
    }

    if (loadedConversationIdRef.current === conversationId) {
      return;
    }

    const activeConversationId = conversationId;
    let cancelled = false;
    loadedConversationIdRef.current = activeConversationId;
    setCrmData(null);
    setContactProfile(null);
    setCrmLoadState("loading");

    async function load(id: string, resolvedContactId: string | null) {
      const [assistantResult, profileResult] = await Promise.all([
        getConversationCrmAssistantAction({ conversationId: id }),
        resolvedContactId
          ? getContactProfileAction(resolvedContactId)
          : Promise.resolve(null),
      ]);

      if (cancelled) {
        return;
      }

      if (assistantResult.success) {
        setCrmData(assistantResult.data);
      } else {
        setCrmData(null);
      }

      if (profileResult?.contact) {
        setContactProfile(profileResult.contact);
      } else if (assistantResult.success) {
        const fallbackProfile = await getContactProfileAction(
          assistantResult.data.contactId,
        );

        if (!cancelled && fallbackProfile?.contact) {
          setContactProfile(fallbackProfile.contact);
        }
      }

      setCrmLoadState(assistantResult.success ? "ready" : "error");
    }

    void load(activeConversationId, conversation?.contactId ?? null);

    return () => {
      cancelled = true;
    };
  }, [conversation?.contactId, conversationId]);

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
  const isCrmLoading = crmLoadState === "loading";
  const leadScore = contactProfile?.leadScore ?? crmData?.leadScore ?? null;
  const aiSummary = contactProfile?.aiSummary ?? crmData?.aiSummary ?? null;
  const crmHref = contactId
    ? DASHBOARD_ROUTES.contacts
    : DASHBOARD_ROUTES.contacts;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-x-hidden overflow-y-auto",
        className,
      )}
    >
      <DetailSection title={CHAT_MESSAGES.contactDetailsTitle}>
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {conversation.contactName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-medium">{conversation.contactName}</p>
            {leadScore !== null ? (
              <Badge
                variant="outline"
                className={getLeadScoreBadgeClassName(leadScore)}
              >
                {CHAT_MESSAGES.leadScoreLabel}: {leadScore} ·{" "}
                {getLeadScoreLabel(leadScore)}
              </Badge>
            ) : null}
            {contactProfile?.sentiment ? (
              <p className="text-xs text-muted-foreground capitalize">
                {CONTACTS_MESSAGES.sentimentLabel}: {contactProfile.sentiment}
              </p>
            ) : null}
          </div>
        </div>

        {isCrmLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            {CHAT_MESSAGES.crmAssistantLoading}
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <PhoneIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {formatContactIdentifier(conversation.contactPhone)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MailIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {contactProfile?.email ?? CHAT_MESSAGES.contactEmailUnavailable}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2Icon className="size-3.5 shrink-0" />
              <span className="truncate">
                {contactProfile?.customFields.company ?? CHAT_MESSAGES.notAvailable}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPinIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {contactProfile?.customFields.location ??
                  CHAT_MESSAGES.contactLocationUnavailable}
              </span>
            </div>
            {contactProfile?.tags.length ? (
              <div className="flex items-start gap-2 text-muted-foreground">
                <TagIcon className="mt-0.5 size-3.5 shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {contactProfile.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {CONTACTS_MESSAGES.pipelineStageLabel}
                </span>
                <span>
                  {contactProfile
                    ? PIPELINE_STAGE_LABELS[contactProfile.pipelineStage]
                    : CHAT_MESSAGES.notAvailable}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {CONTACTS_MESSAGES.dealValueLabel}
                </span>
                <span>{formatDealValue(contactProfile?.dealValue ?? null)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {CONTACTS_MESSAGES.expectedCloseLabel}
                </span>
                <span>
                  {contactProfile?.expectedCloseDate ?? CHAT_MESSAGES.notAvailable}
                </span>
              </div>
            </div>
            {contactProfile?.customFields.notes ? (
              <p className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground [overflow-wrap:anywhere] [word-break:break-word]">
                <span className="font-medium text-foreground">
                  {CONTACTS_MESSAGES.notesLabel}:{" "}
                </span>
                {contactProfile.customFields.notes}
              </p>
            ) : null}
          </div>
        )}

        <Button variant="link" size="sm" className="h-auto p-0" asChild>
          <Link href={crmHref}>{CHAT_MESSAGES.viewInCrm}</Link>
        </Button>
      </DetailSection>

      <DetailSection title={CHAT_MESSAGES.aiAssistantTitle}>
        {isCrmLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            {CHAT_MESSAGES.crmAssistantLoading}
          </div>
        ) : (
          <>
            {aiSummary ? (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium">
                  {CHAT_MESSAGES.leadSummaryTitle}
                </p>
                <p className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere] [word-break:break-word]">
                  {aiSummary}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {CHAT_MESSAGES.leadSummaryEmpty}
              </p>
            )}
            {crmData?.suggestedAction ? (
              <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere] [word-break:break-word]">
                <span className="font-medium text-foreground">
                  {CHAT_MESSAGES.crmSuggestedAction}:{" "}
                </span>
                {crmData.suggestedAction}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onGenerateReply}
            >
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
