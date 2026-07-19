"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutGridIcon, StarIcon } from "lucide-react";

import { SmsIcon } from "@/components/icons/channel-brand-icons";
import { ChannelRailItem } from "@/components/navigation/ChannelRailItem";
import { useOptionalDashboardNavBadges } from "@/hooks/use-dashboard-nav-badges";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_CHANNEL_LIST, CHAT_MESSAGES } from "@/features/chats";
import type { ChatChannelId } from "@/features/chats";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { SMS_MESSAGES } from "@/features/sms/constants";
import {
  CHANNEL_RAIL_NAV_CLASS,
  getChannelRailFavoritesShellClassName,
  getChannelRailIconShellClassName,
} from "@/features/navigation/channel-rail-ui";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";
import { countChannelsWithUnread } from "@/utils/conversation-unread";

export type InboxChannelTabId = ChatChannelId | "all" | "favorites" | "sms";

type InboxChannelTabsProps = {
  activeChannel: InboxChannelTabId;
  unreadByChannel?: Partial<Record<MessagingChannel, number>>;
  visibleChannelIds?: MessagingChannel[];
  /** @deprecated Voice lives in the sidebar Calls section. */
  voiceInboxEnabled?: boolean;
  smsInboxEnabled?: boolean;
  className?: string;
};

export function InboxChannelTabs({
  activeChannel,
  unreadByChannel: localUnreadByChannel = {},
  visibleChannelIds = [],
  smsInboxEnabled = false,
  className,
}: InboxChannelTabsProps) {
  const router = useRouter();
  const navBadges = useOptionalDashboardNavBadges();
  const unreadByChannel = navBadges?.counts.unreadByChannel ?? localUnreadByChannel;

  const visibleChannels = CHAT_CHANNEL_LIST.filter((channel) =>
    visibleChannelIds.includes(channel.id),
  );
  const channelsWithUnread = countChannelsWithUnread(unreadByChannel);

  useEffect(() => {
    router.prefetch(DASHBOARD_ROUTES.chats);
    router.prefetch(DASHBOARD_ROUTES.chatsFavorites);

    if (smsInboxEnabled) {
      router.prefetch(DASHBOARD_ROUTES.chatsSms);
    }

    for (const channel of visibleChannels) {
      router.prefetch(`${DASHBOARD_ROUTES.chats}/${channel.id}`);
    }
  }, [router, visibleChannels, smsInboxEnabled]);

  return (
    <nav
      aria-label={CHAT_MESSAGES.channelRailLabel}
      className={cn(CHANNEL_RAIL_NAV_CLASS, className)}
    >
      <ChannelRailItem
        href={DASHBOARD_ROUTES.chats}
        isActive={activeChannel === "all"}
        label={CHAT_MESSAGES.viewAll}
        ariaLabel={`${CHAT_MESSAGES.viewAll}${channelsWithUnread > 0 ? ` (${channelsWithUnread} channels with unread)` : ""}`}
        badge={channelsWithUnread > 0 ? channelsWithUnread : null}
        iconShell={
          <div className={getChannelRailIconShellClassName(activeChannel === "all")}>
            <LayoutGridIcon className="size-5" />
          </div>
        }
      />

      <ChannelRailItem
        href={DASHBOARD_ROUTES.chatsFavorites}
        isActive={activeChannel === "favorites"}
        label={CHAT_MESSAGES.channelRailFavorites}
        ariaLabel={CHAT_MESSAGES.favoritesTabLabel}
        iconShell={
          <div
            className={getChannelRailFavoritesShellClassName(
              activeChannel === "favorites",
            )}
          >
            <StarIcon
              className={cn(
                "size-5",
                activeChannel === "favorites"
                  ? "fill-amber-500 text-amber-500"
                  : "text-muted-foreground",
              )}
            />
          </div>
        }
      />

      {visibleChannels.map((channel) => {
        const unreadCount = unreadByChannel[channel.id] ?? 0;
        const isActive = activeChannel === channel.id;

        return (
          <ChannelRailItem
            key={channel.id}
            href={`${DASHBOARD_ROUTES.chats}/${channel.id}`}
            isActive={isActive}
            label={channel.label}
            ariaLabel={`${channel.label}${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            badge={unreadCount > 0 ? unreadCount : null}
            iconShell={
              <div
                className={getChannelRailIconShellClassName(
                  isActive,
                  getChannelIconContainerClassName(channel.id),
                )}
              >
                <channel.icon className="size-5" />
              </div>
            }
          />
        );
      })}

      {smsInboxEnabled ? (
        <ChannelRailItem
          href={DASHBOARD_ROUTES.chatsSms}
          isActive={activeChannel === "sms"}
          label={SMS_MESSAGES.inboxTabLabel}
          ariaLabel={SMS_MESSAGES.inboxTabLabel}
          iconShell={
            <div
              className={getChannelRailIconShellClassName(
                activeChannel === "sms",
                getChannelIconContainerClassName("sms"),
              )}
            >
              <SmsIcon className="size-5" />
            </div>
          }
        />
      ) : null}
    </nav>
  );
}
