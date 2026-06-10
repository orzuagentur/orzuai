"use client";

import Link from "next/link";
import { LayoutGridIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";
import {
  buildAiAssistantHref,
  type AiAssistantTab,
} from "@/utils/ai-assistant-url";

type AiAssistantChannelTabsProps = {
  activeChannel: MessagingChannel | null;
  activeTab: AiAssistantTab;
  activeAgentId: string | null;
  searchQuery: string;
  visibleChannelIds: MessagingChannel[];
  aiEnabledByChannel: Partial<Record<MessagingChannel, boolean>>;
  className?: string;
};

export function AiAssistantChannelTabs({
  activeChannel,
  activeTab,
  activeAgentId,
  searchQuery,
  visibleChannelIds,
  aiEnabledByChannel,
  className,
}: AiAssistantChannelTabsProps) {
  const visibleChannels = INTEGRATION_CHANNEL_LIST.filter(
    (channel) =>
      channel.id !== "voice" &&
      channel.id !== "website_knowledge" &&
      visibleChannelIds.includes(channel.id as MessagingChannel),
  );

  function hrefForChannel(channel: MessagingChannel | null) {
    return buildAiAssistantHref({
      channel,
      tab: activeTab,
      agent: activeAgentId,
      q: searchQuery || null,
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
        title={AI_ASSISTANT_MESSAGES.channelsTitle}
        aria-label={AI_ASSISTANT_MESSAGES.channelsTitle}
        className={cn(
          "relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
          isAllActive
            ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <LayoutGridIcon className="size-5" />
      </Link>

      {visibleChannels.map((channel) => {
        const channelId = channel.id as MessagingChannel;
        const isActive = activeChannel === channelId;
        const aiOn = aiEnabledByChannel[channelId];

        return (
          <Link
            key={channel.id}
            href={hrefForChannel(channelId)}
            title={channel.label}
            aria-label={channel.label}
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
                getChannelIconContainerClassName(channelId),
              )}
            >
              <ChannelBrandIcon channel={channelId} className="size-4" />
            </div>
            {aiOn ? (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
