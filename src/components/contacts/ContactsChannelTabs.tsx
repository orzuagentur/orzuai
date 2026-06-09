"use client";

import Link from "next/link";
import { LayoutGridIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { CONTACT_CHANNEL_FILTERS, CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";
import { buildContactsHref } from "@/utils/contacts-url";
import type { ContactSegment } from "@/types/contact.types";

type ContactsChannelTabsProps = {
  activeChannel: MessagingChannel | null;
  activeSegment: ContactSegment;
  activeView: "list" | "pipeline";
  activeContactId: string | null;
  searchQuery: string;
  visibleChannelIds: MessagingChannel[];
  className?: string;
};

export function ContactsChannelTabs({
  activeChannel,
  activeSegment,
  activeView,
  activeContactId,
  searchQuery,
  visibleChannelIds,
  className,
}: ContactsChannelTabsProps) {
  const visibleChannels = CONTACT_CHANNEL_FILTERS.filter(
    (filter) => filter.id !== null && visibleChannelIds.includes(filter.id),
  );
  function hrefForChannel(channel: MessagingChannel | null) {
    return buildContactsHref({
      channel,
      segment: activeSegment,
      view: activeView,
      contact: activeContactId,
      q: searchQuery || null,
      page: 1,
    });
  }

  const isAllActive = !activeChannel;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1 overflow-x-auto border-b px-4 py-2",
        className,
      )}
    >
      <Link
        href={hrefForChannel(null)}
        title={CONTACTS_MESSAGES.filterAll}
        aria-label={CONTACTS_MESSAGES.filterAll}
        className={cn(
          "relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
          isAllActive
            ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <LayoutGridIcon className="size-5" />
      </Link>

      {visibleChannels.map((filter) => {
          const channel = filter.id!;
          const isActive = activeChannel === channel;

          return (
            <Link
              key={channel}
              href={hrefForChannel(channel)}
              title={filter.label}
              aria-label={filter.label}
              className={cn(
                "relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-primary/15 ring-1 ring-primary/30"
                  : "hover:bg-muted/60",
              )}
            >
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-md",
                  getChannelIconContainerClassName(channel),
                )}
              >
                <ChannelBrandIcon channel={channel} className="size-4" />
              </div>
            </Link>
          );
        })}
    </div>
  );
}
