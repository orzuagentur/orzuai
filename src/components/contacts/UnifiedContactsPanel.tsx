"use client";

import Link from "next/link";
import { StarIcon } from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { formatDealMoney } from "@/lib/deal-currency";
import { cn } from "@/lib/utils";
import type {
  LeadsPageData,
  UnifiedContactsPageData,
} from "@/types/contact.types";
import { buildContactsHref } from "@/utils/contacts-url";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  getLeadScoreBadgeClassName,
  getLeadScoreLabel,
} from "@/utils/lead-score";

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

const LEAD_STAGE_BADGE_CLASSNAMES = {
  new: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  qualified:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200",
  proposal:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  won: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-500/30 dark:bg-zinc-500/10 dark:text-zinc-200",
  lost: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
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
        const href = buildContactHref(listData, contact.id, variant);

        if (variant === "leads") {
          return (
            <li key={contact.id}>
              <Link
                href={href}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40",
                  isSelected && "bg-muted/70",
                )}
              >
                <ContactAvatar
                  name={contact.name}
                  avatarUrl={contact.avatarUrl}
                  className="size-10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {contact.isFavorite ? (
                      <StarIcon className="size-3 shrink-0 fill-amber-400 text-amber-400" />
                    ) : null}
                    <p className="min-w-0 truncate font-medium">
                      {contact.name}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 px-1.5 py-0 text-[10px]",
                        LEAD_STAGE_BADGE_CLASSNAMES[contact.pipelineStage],
                      )}
                    >
                      {STAGE_LABELS[contact.pipelineStage]}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {contact.leadScore !== null ? (
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          getLeadScoreBadgeClassName(contact.leadScore),
                        )}
                      >
                        {contact.leadScore}{" "}
                        {getLeadScoreLabel(contact.leadScore)}
                      </span>
                    ) : null}
                    {contact.dealValue !== null ? (
                      <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium tabular-nums text-foreground">
                        {formatDealMoney(contact.dealValue, "USD")}
                      </span>
                    ) : null}
                    {contact.expectedCloseDate ? (
                      <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                        {CONTACTS_MESSAGES.columnClose}:{" "}
                        {contact.expectedCloseDate}
                      </span>
                    ) : null}
                    {contact.lastMessageAt ? (
                      <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                        <RelativeTime value={contact.lastMessageAt} />
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1.5 truncate text-caption text-muted-foreground">
                    {contact.lastMessagePreview ??
                      formatContactIdentifier(contact.identifier)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 gap-1 px-1.5 py-0 text-[10px]",
                    getChannelBadgeClassName(contact.channel),
                  )}
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
        }

        return (
          <li key={contact.id}>
            <Link
              href={href}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                isSelected && "bg-muted/70",
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
                <p className="truncate text-caption text-muted-foreground">
                  {contact.lastMessagePreview ??
                    formatContactIdentifier(contact.identifier)}
                </p>
                {contact.lastMessageAt ? (
                  <p className="text-caption text-muted-foreground/80">
                    <RelativeTime value={contact.lastMessageAt} />
                  </p>
                ) : null}
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 gap-1 px-1.5 py-0 text-[10px]",
                  getChannelBadgeClassName(contact.channel),
                )}
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
