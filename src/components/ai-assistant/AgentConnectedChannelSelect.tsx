"use client";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getConnectedMessagingChannels } from "@/features/ai-assistant/connected-channels";
import { getChannelLabel } from "@/features/ai-assistant/agent-channel-routing";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { cn } from "@/lib/utils";

type AgentConnectedChannelSelectProps = {
  selectedChannels: MessagingIntegrationChannelId[];
  visibleChannelIds: MessagingIntegrationChannelId[];
  channelStatuses: IntegrationChannelStatusMap;
  disabled?: boolean;
  onToggle: (channel: MessagingIntegrationChannelId) => void;
};

export function AgentConnectedChannelSelect({
  selectedChannels,
  visibleChannelIds,
  channelStatuses,
  disabled = false,
  onToggle,
}: AgentConnectedChannelSelectProps) {
  const connectedChannels = getConnectedMessagingChannels(
    channelStatuses,
    visibleChannelIds,
  );

  if (connectedChannels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {AI_ASSISTANT_MESSAGES.wizardNoChannelsConnected}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {connectedChannels.map((channel) => {
        const selected = selectedChannels.includes(channel);

        return (
          <Button
            key={channel}
            type="button"
            variant={selected ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            className={cn("gap-2", selected && "shadow-sm")}
            onClick={() => onToggle(channel)}
          >
            <ChannelBrandIcon channel={channel} className="size-4" />
            {getChannelLabel(channel)}
            {selected ? (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                On
              </Badge>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
