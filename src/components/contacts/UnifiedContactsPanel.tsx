"use client";

import Link from "next/link";
import { useState } from "react";

import { ContactProfileDrawer } from "@/components/contacts/ContactProfileDrawer";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import {
  CONTACT_CHANNEL_FILTERS,
  CONTACT_SEGMENT_FILTERS,
  CONTACTS_MESSAGES,
} from "@/features/contacts/constants";
import type { ContactSegment } from "@/types/contact.types";
import { cn } from "@/lib/utils";
import type { UnifiedContactsPageData } from "@/types/contact.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import { formatRelativeTime } from "@/utils/dashboard";
import { getLeadScoreBadgeClassName } from "@/utils/lead-score";

type UnifiedContactsPanelProps = UnifiedContactsPageData;

function buildContactsHref(
  channel: string | null,
  segment: ContactSegment,
): string {
  const params = new URLSearchParams();

  if (channel) {
    params.set("channel", channel);
  }

  if (segment !== "all") {
    params.set("segment", segment);
  }

  const query = params.toString();

  return query
    ? `${DASHBOARD_ROUTES.contacts}?${query}`
    : DASHBOARD_ROUTES.contacts;
}

export function UnifiedContactsPanel({
  hasBusiness,
  contacts,
  total,
  activeChannelFilter,
  activeSegment,
}: UnifiedContactsPanelProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!hasBusiness) {
    return null;
  }

  function openContact(contactId: string) {
    setSelectedContactId(contactId);
    setDrawerOpen(true);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-h1">{CONTACTS_MESSAGES.pageTitle}</h1>
        <p className="text-body text-muted-foreground">
          {CONTACTS_MESSAGES.pageDescription}
        </p>
        <p className="text-caption">
          {CONTACTS_MESSAGES.contactsCount(total)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CONTACT_SEGMENT_FILTERS.map((filter) => {
          const isActive = filter.id === activeSegment;

          return (
            <Link
              key={filter.id}
              href={buildContactsHref(activeChannelFilter, filter.id)}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {CONTACT_CHANNEL_FILTERS.map((filter) => {
          const isActive =
            filter.id === activeChannelFilter ||
            (filter.id === null && !activeChannelFilter);

          return (
            <Link
              key={filter.id ?? "all"}
              href={buildContactsHref(filter.id, activeSegment)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50",
              )}
            >
              {filter.id ? (
                <ChannelBrandIcon channel={filter.id} className="size-3.5" />
              ) : null}
              {filter.id
                ? getChannelBadgeLabel(filter.id)
                : CONTACTS_MESSAGES.filterAll}
            </Link>
          );
        })}
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          variant="contacts"
          title={CONTACTS_MESSAGES.emptyTitle}
          description={CONTACTS_MESSAGES.emptyDescription}
          actionLabel={CONTACTS_MESSAGES.emptyCta}
          actionHref={DASHBOARD_ROUTES.integrations}
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <button
                type="button"
                onClick={() => openContact(contact.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{contact.name}</p>
                    {contact.leadScore !== null ? (
                      <Badge
                        variant="outline"
                        className={`px-1.5 py-0 text-[10px] ${getLeadScoreBadgeClassName(contact.leadScore)}`}
                      >
                        {contact.leadScore}
                      </Badge>
                    ) : null}
                    <Badge
                      variant="outline"
                      className={`gap-1 px-1.5 py-0 text-[10px] ${getChannelBadgeClassName(contact.channel)}`}
                    >
                      <ChannelBrandIcon
                        channel={contact.channel}
                        className="size-3"
                      />
                      {getChannelBadgeLabel(contact.channel)}
                    </Badge>
                  </div>
                  <p className="text-caption">
                    {formatContactIdentifier(contact.identifier)}
                    {contact.email ? ` · ${contact.email}` : ""}
                  </p>
                  {contact.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {contact.lastMessagePreview ? (
                    <p className="text-body line-clamp-2 text-muted-foreground">
                      {contact.lastMessagePreview}
                    </p>
                  ) : null}
                </div>
                {contact.lastMessageAt ? (
                  <span className="shrink-0 text-caption">
                    {formatRelativeTime(contact.lastMessageAt)}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ContactProfileDrawer
        contactId={selectedContactId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
