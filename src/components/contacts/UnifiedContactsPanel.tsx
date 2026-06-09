"use client";

import Link from "next/link";

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
import type { UnifiedContactsPageData } from "@/types/contact.types";
import { buildContactsHref } from "@/utils/contacts-url";
import { formatContactIdentifier } from "@/utils/contact-display";

type UnifiedContactsPanelProps = UnifiedContactsPageData & {
  embedded?: boolean;
};

function buildContactHref(
  data: UnifiedContactsPageData,
  contactId: string,
): string {
  return buildContactsHref({
    channel: data.activeChannelFilter,
    segment: data.activeSegment,
    view: data.activeView,
    contact: contactId,
    q: data.searchQuery || null,
    page: data.page,
  });
}

export function UnifiedContactsPanel({
  embedded = false,
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
            : CONTACTS_MESSAGES.emptyTitle
        }
        description={
          isSearch
            ? CONTACTS_MESSAGES.searchEmptyDescription
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
              href={buildContactHref(listData, contact.id)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                isSelected && "bg-primary/5",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{contact.name}</p>
                <p className="text-caption truncate text-muted-foreground">
                  {formatContactIdentifier(contact.identifier)}
                </p>
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
