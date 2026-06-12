"use client";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import {
  getConnectedMessagingChannels,
} from "@/features/ai-assistant/connected-channels";
import { getChannelLabel } from "@/features/channel-workspace";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import { cn } from "@/lib/utils";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";

type AutomationsChannelBadgeRowProps = {
  channelStatuses: IntegrationChannelStatusMap;
  visibleChannelIds: MessagingIntegrationChannelId[];
  className?: string;
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: "size-6",
  md: "size-7",
} as const;

const iconSizeClasses = {
  sm: "size-3",
  md: "size-3.5",
} as const;

export function AutomationsChannelBadgeRow({
  channelStatuses,
  visibleChannelIds,
  className,
  size = "sm",
}: AutomationsChannelBadgeRowProps) {
  const connected = new Set(
    getConnectedMessagingChannels(channelStatuses, visibleChannelIds),
  );

  const channels = MESSAGING_INTEGRATION_CHANNELS.filter((channel) =>
    visibleChannelIds.includes(channel),
  );

  if (channels.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {channels.map((channel) => {
        const isConnected = connected.has(channel);

        return (
          <span
            key={channel}
            title={`${getChannelLabel(channel)} · ${isConnected ? "Connected" : "Not connected"}`}
            aria-label={`${getChannelLabel(channel)} ${isConnected ? "connected" : "not connected"}`}
            className={cn(
              "relative inline-flex items-center justify-center rounded-md",
              sizeClasses[size],
              getChannelIconContainerClassName(channel),
              !isConnected && "opacity-35 grayscale",
            )}
          >
            <ChannelBrandIcon
              channel={channel}
              className={iconSizeClasses[size]}
            />
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 size-2 rounded-full border border-background",
                isConnected ? "bg-emerald-500" : "bg-neutral-400",
              )}
            />
          </span>
        );
      })}
    </div>
  );
}
