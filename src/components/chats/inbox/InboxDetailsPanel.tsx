"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CalendarIcon,
  Loader2Icon,
  UserIcon,
} from "lucide-react";

import { ContactAdditionalContactsSection } from "@/components/contacts/ContactAdditionalContactsSection";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ContactProfileInfoTable } from "@/components/contacts/ContactProfileInfoTable";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getInboxDetailsPanelAction } from "@/features/chats/actions/get-inbox-details-panel";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { getChannelBadgeLabel } from "@/features/chats/channel-ui";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  isCrmDetailsFresh,
  peekCachedCrmDetails,
  setCachedCrmDetails,
} from "@/lib/client-cache/inbox-messenger-cache";
import type { InboxDetailsPanelData } from "@/services/inbox-details.service";
import { cn } from "@/lib/utils";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { ConversationDetail } from "@/types/chat.types";
import { buildContactProfileInfoRows } from "@/utils/contact-profile-info";
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
    <section
      className={cn("space-y-3 border-b px-4 py-4 last:border-b-0", className)}
    >
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
  const conversationId = conversation?.id ?? null;
  const [details, setDetails] = useState<InboxDetailsPanelData | null>(() =>
    conversationId ? peekCachedCrmDetails(conversationId) : null,
  );
  const [loadState, setLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >(() =>
    conversationId && peekCachedCrmDetails(conversationId) ? "ready" : "idle",
  );
  const loadedConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setDetails(null);
      setLoadState("idle");
      loadedConversationIdRef.current = null;
      return;
    }

    const cached = peekCachedCrmDetails(conversationId);

    if (cached) {
      setDetails(cached);
      setLoadState("ready");
      loadedConversationIdRef.current = conversationId;

      if (!isCrmDetailsFresh(conversationId)) {
        void getInboxDetailsPanelAction({ conversationId }).then((result) => {
          if (!result.success) {
            return;
          }

          setDetails(result.data);
          setCachedCrmDetails(conversationId, result.data);
        });
      }

      return;
    }

    const activeConversationId = conversationId;
    let cancelled = false;
    loadedConversationIdRef.current = activeConversationId;
    setDetails(null);
    setLoadState("loading");

    void getInboxDetailsPanelAction({ conversationId: activeConversationId }).then(
      (result) => {
        if (cancelled) {
          return;
        }

        if (result.success) {
          setDetails(result.data);
          setCachedCrmDetails(activeConversationId, result.data);
          setLoadState("ready");
          return;
        }

        setDetails(null);
        setLoadState("error");
      },
    );

    return () => {
      cancelled = true;
      if (loadedConversationIdRef.current === activeConversationId) {
        loadedConversationIdRef.current = null;
      }
    };
  }, [conversationId]);

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
  const isLoading = loadState === "loading";
  const contact = details?.contact;
  const leadScore = contact?.leadScore ?? null;
  const infoRows = details
    ? buildContactProfileInfoRows(details.profileForInfoRows)
    : [];
  const additionalContacts = contact?.customFields.additionalContacts ?? [];
  const crmHref = details?.contactId
    ? `${DASHBOARD_ROUTES.contacts}?contact=${details.contactId}`
    : DASHBOARD_ROUTES.contacts;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <DetailSection title={CHAT_MESSAGES.contactDetailsTitle}>
          <div className="flex items-start gap-3">
            <ContactAvatar
              name={contact?.name ?? conversation.contactName}
              avatarUrl={contact?.avatarUrl ?? conversation.contactAvatarUrl}
              className="size-12 shrink-0"
              size="lg"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-lg font-semibold">
                {contact?.name ?? conversation.contactName}
              </p>
              {leadScore !== null ? (
                <Badge
                  variant="outline"
                  className={getLeadScoreBadgeClassName(leadScore)}
                >
                  {CHAT_MESSAGES.leadScoreLabel}: {leadScore} ·{" "}
                  {getLeadScoreLabel(leadScore)}
                </Badge>
              ) : null}
              {contact?.sentiment ? (
                <p className="text-xs capitalize text-muted-foreground">
                  {CONTACTS_MESSAGES.sentimentLabel}: {contact.sentiment}
                </p>
              ) : null}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" />
              {CHAT_MESSAGES.crmAssistantLoading}
            </div>
          ) : contact ? (
            <div className="space-y-4">
              <ContactAdditionalContactsSection
                additionalContacts={additionalContacts}
                readOnly
                compact
              />

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {CONTACTS_MESSAGES.contactInfoTitle}
                </h4>
                <ContactProfileInfoTable rows={infoRows} />
              </div>

              {contact.tags.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {CONTACTS_MESSAGES.tagsLabel}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {contact.customFields.notes ? (
                <p className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground [overflow-wrap:anywhere] [word-break:break-word]">
                  <span className="font-medium text-foreground">
                    {CONTACTS_MESSAGES.notesLabel}:{" "}
                  </span>
                  {contact.customFields.notes}
                </p>
              ) : null}

              <Button variant="link" size="sm" className="h-auto p-0" asChild>
                <Link href={crmHref}>{CHAT_MESSAGES.viewInCrm}</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {CHAT_MESSAGES.notAvailable}
            </p>
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
              <dt className="text-muted-foreground">
                {CHAT_MESSAGES.lastContactLabel}
              </dt>
              <dd className="tabular-nums">
                {formatRelativeTime(lastMessageAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">
                {CHAT_MESSAGES.channelLabel}
              </dt>
              <dd className="inline-flex items-center gap-1.5">
                <ChannelBrandIcon
                  channel={conversation.channel}
                  className="size-3.5"
                />
                {getChannelBadgeLabel(conversation.channel)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">
                {CHAT_MESSAGES.statusLabel}
              </dt>
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
      </div>
    </aside>
  );
}
