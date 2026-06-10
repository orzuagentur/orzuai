import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { getChannelLabel } from "@/features/channel-workspace";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";

type AiAgentChannelIconRowProps = {
  channels: MessagingChannel[];
  size?: "sm" | "md";
  className?: string;
};

const buttonSizeClasses = {
  sm: "size-6",
  md: "size-7",
} as const;

const iconSizeClasses = {
  sm: "size-3",
  md: "size-3.5",
} as const;

export function AiAgentChannelIconRow({
  channels,
  size = "sm",
  className,
}: AiAgentChannelIconRowProps) {
  if (channels.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {channels.map((channel) => (
        <span
          key={channel}
          title={getChannelLabel(channel)}
          aria-label={getChannelLabel(channel)}
          className={cn(
            "inline-flex items-center justify-center rounded-md",
            buttonSizeClasses[size],
            getChannelIconContainerClassName(channel),
          )}
        >
          <ChannelBrandIcon
            channel={channel}
            className={iconSizeClasses[size]}
          />
        </span>
      ))}
    </div>
  );
}
