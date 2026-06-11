"use client";

import Link from "next/link";
import { StarIcon } from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { cn } from "@/lib/utils";
import type { LeadsPageData, UnifiedContactsPageData } from "@/types/contact.types";
import { buildContactsHref } from "@/utils/contacts-url";
import { formatContactIdentifier } from "@/utils/contact-display";
import { formatRelativeTime } from "@/utils/dashboard";
import {
  getLeadScoreBadgeClassName,
  getLeadScoreLabel,
} from "@/utils/lead-score";
import { formatDealMoney } from "@/lib/deal-currency";

type UnifiedContactsPanelProps = (UnifiedContactsPageData | LeadsPageData) & {
  embedded?: boolean;
  variant?: "contacts" | "leads";
};

const STAGE_LABELS = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
} as const;

function buildContactHref(
  data: UnifiedContactsPageData | LeadsPageData,
  contactId: string,
  variant: "contacts" | "leads",
): string {
  if (variant === "leads" && "activeLeadSegment" in data) {
    return buildContactsHref({
      tab: "leads",
      channel: data.activeChannelFilter,
      leadSegment: data.activeLeadSegment,
      view: data.activeView,
      contact: contactId,
      profile: data.showProfilePanel,
      q: data.searchQuery || null,
      page: data.page,
    });
  }

  return buildContactsHref({
    tab: "contacts",
    channel: data.activeChannelFilter,
    segment: data.activeSegment,
    view: data.activeView,
    contact: contactId,
    profile: data.showProfilePanel,
    q: data.searchQuery || null,
    page: data.page,
  });
}

export function UnifiedContactsPanel({
  embedded = false,
  variant = "contacts",
  ...listData
}: UnifiedContactsPanelProps) {
  if (!listData.hasBusiness) {
    return null;
  }

  const { contacts, searchQuery, activeContactId } = listData;

  if (contacts.length === 0) {
    const isSearch = searchQuery.trim().length > 0;

    return (
      <EmptyState
        variant="contacts"
        title={
          isSearch
            ? CONTACTS_MESSAGES.searchEmptyTitle
            : variant === "leads"
              ? CONTACTS_MESSAGES.leadsEmptyTitle
              : CONTACTS_MESSAGES.emptyTitle
        }
        description={
          isSearch
            ? CONTACTS_MESSAGES.searchEmptyDescription
            : variant === "leads"
              ? CONTACTS_MESSAGES.leadsEmptyDescription
              : CONTACTS_MESSAGES.emptyDescription
        }
        actionLabel={isSearch ? undefined : CONTACTS_MESSAGES.emptyCta}
        actionHref={isSearch ? undefined : DASHBOARD_ROUTES.integrations}
      />
    );
  }

  return (
    <ul className={cn("divide-y", embedded && "bg-card")}>
      {contacts.map((contact) => {
        const isSelected = contact.id === activeContactId;

        return (
          <li key={contact.id}>
            <Link
              href={buildContactHref(listData, contact.id, variant)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                isSelected && "bg-primary/5",
              )}
            >
              <ContactAvatar
                name={contact.name}
                avatarUrl={contact.avatarUrl}
                className="size-10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {contact.isFavorite ? (
                    <StarIcon className="size-3 shrink-0 fill-amber-400 text-amber-400" />
                  ) : null}
                  <p className="truncate font-medium">{contact.name}</p>
                </div>
                <p className="text-caption truncate text-muted-foreground">
                  {variant === "leads" ? (
                    <>
                      {STAGE_LABELS[contact.pipelineStage]}
                      {contact.dealValue !== null
                        ? ` · ${formatDealMoney(contact.dealValue, "USD")}`
                        : ""}
                    </>
                  ) : (
                    contact.lastMessagePreview ??
                    formatContactIdentifier(contact.identifier)
                  )}
                </p>
                {variant === "leads" && contact.leadScore !== null ? (
                  <span
                    className={cn(
                      "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      getLeadScoreBadgeClassName(contact.leadScore),
                    )}
                  >
                    {contact.leadScore} · {getLeadScoreLabel(contact.leadScore)}
                  </span>
                ) : null}
                {contact.lastMessageAt ? (
                  <p className="text-caption text-muted-foreground/80">
                    {formatRelativeTime(contact.lastMessageAt)}
                  </p>
                ) : null}
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 gap-1 px-1.5 py-0 text-[10px] ${getChannelBadgeClassName(contact.channel)}`}
              >
                <ChannelBrandIcon
                  channel={contact.channel}
                  className="size-3"
                />
                {getChannelBadgeLabel(contact.channel)}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
