"use client";

import { LayoutGridIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { ChannelRailItem } from "@/components/navigation/ChannelRailItem";
import { CONTACT_CHANNEL_FILTERS, CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import {
  CHANNEL_RAIL_NAV_CLASS,
  getChannelRailIconShellClassName,
} from "@/features/navigation/channel-rail-ui";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";
import { buildContactsHref } from "@/utils/contacts-url";
import type { ContactSegment, CrmEntityTab, LeadSegment } from "@/types/contact.types";

type ContactsChannelTabsProps = {
  activeTab?: CrmEntityTab;
  activeChannel: MessagingChannel | null;
  activeSegment: ContactSegment;
  activeLeadSegment?: LeadSegment;
  activeView: "list" | "pipeline";
  activeContactId: string | null;
  showProfilePanel?: boolean;
  searchQuery: string;
  visibleChannelIds: MessagingChannel[];
  voiceInboxEnabled?: boolean;
  smsInboxEnabled?: boolean;
  className?: string;
};

export function ContactsChannelTabs({
  activeTab = "contacts",
  activeChannel,
  activeSegment,
  activeLeadSegment = "all_leads",
  activeView,
  activeContactId,
  showProfilePanel = false,
  searchQuery,
  visibleChannelIds,
  voiceInboxEnabled = false,
  smsInboxEnabled = false,
  className,
}: ContactsChannelTabsProps) {
  const visibleChannels = CONTACT_CHANNEL_FILTERS.filter((filter) => {
    if (filter.id === null) {
      return false;
    }

    if (filter.id === "voice") {
      return voiceInboxEnabled;
    }

    if (filter.id === "sms") {
      return smsInboxEnabled;
    }

    return visibleChannelIds.includes(filter.id);
  });

  function hrefForChannel(channel: MessagingChannel | null) {
    if (activeTab === "leads") {
      return buildContactsHref({
        tab: "leads",
        channel,
        leadSegment: activeLeadSegment,
        view: activeView,
        contact: activeContactId,
        profile: showProfilePanel,
        q: searchQuery || null,
        page: 1,
      });
    }

    return buildContactsHref({
      tab: "contacts",
      channel,
      segment: activeSegment,
      view: activeView,
      contact: activeContactId,
      profile: showProfilePanel,
      q: searchQuery || null,
      page: 1,
    });
  }

  const isAllActive = !activeChannel;

  return (
    <nav
      aria-label={CONTACTS_MESSAGES.filterAll}
      className={cn(CHANNEL_RAIL_NAV_CLASS, className)}
    >
      <ChannelRailItem
        href={hrefForChannel(null)}
        isActive={isAllActive}
        label={CONTACTS_MESSAGES.filterAll}
        ariaLabel={CONTACTS_MESSAGES.filterAll}
        iconShell={
          <div className={getChannelRailIconShellClassName(isAllActive)}>
            <LayoutGridIcon className="size-5" />
          </div>
        }
      />

      {visibleChannels.map((filter) => {
        const channel = filter.id!;
        const isActive = activeChannel === channel;

        return (
          <ChannelRailItem
            key={channel}
            href={hrefForChannel(channel)}
            isActive={isActive}
            label={filter.label}
            ariaLabel={filter.label}
            iconShell={
              <div
                className={getChannelRailIconShellClassName(
                  isActive,
                  getChannelIconContainerClassName(channel),
                )}
              >
                <ChannelBrandIcon channel={channel} className="size-5" />
              </div>
            }
          />
        );
      })}
    </nav>
  );
}
