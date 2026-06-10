"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getConnectedMessagingChannels } from "@/features/ai-assistant/connected-channels";
import { getChannelLabel } from "@/features/channel-workspace";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";

type AgentConnectedChannelSelectProps = {
  selectedChannels: MessagingChannel[];
  visibleChannelIds: MessagingChannel[];
  channelStatuses: IntegrationChannelStatusMap;
  disabled?: boolean;
  onToggle: (channel: MessagingChannel) => void;
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

  return (
    <div className="space-y-3">
      <Label>{AI_ASSISTANT_MESSAGES.agentChannels}</Label>

      {connectedChannels.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {connectedChannels.map((channel) => {
            const isSelected = selectedChannels.includes(channel);

            return (
              <div
                key={channel}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border p-4",
                  isSelected ? "border-primary bg-primary/5" : "bg-card",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      getChannelIconContainerClassName(channel),
                    )}
                  >
                    <ChannelBrandIcon channel={channel} className="size-4" />
                  </span>
                  <p className="font-medium">{getChannelLabel(channel)}</p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => onToggle(channel)}
                >
                  {isSelected
                    ? AI_ASSISTANT_MESSAGES.wizardChannelSelected
                    : AI_ASSISTANT_MESSAGES.wizardChannelSelect}
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {AI_ASSISTANT_MESSAGES.wizardNoChannelsConnected}
        </p>
      )}

      <Button type="button" variant="outline" className="gap-2" asChild>
        <Link href={DASHBOARD_ROUTES.marketplace}>
          <PlusIcon className="size-4" />
          {AI_ASSISTANT_MESSAGES.wizardAddChannel}
        </Link>
      </Button>
    </div>
  );
}
