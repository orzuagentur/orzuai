"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toggleChannelAiAction } from "@/features/channel-workspace/actions/toggle-channel-ai";
import { AI_MANAGER_MESSAGES } from "@/features/ai-manager/constants";
import {
  buildIntegrationActivateHref,
  INTEGRATION_CHANNEL_LIST,
} from "@/features/integrations";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import type { ChannelAiSettingsData } from "@/types/channel-workspace.types";
import { buildAiManagerHref } from "@/utils/ai-manager-url";
import { cn } from "@/lib/utils";

type AiManagerChannelCardProps = {
  settings: ChannelAiSettingsData;
  isExpanded: boolean;
};

export function AiManagerChannelCard({
  settings,
  isExpanded,
}: AiManagerChannelCardProps) {
  const router = useRouter();
  const [aiEnabled, setAiEnabled] = useState(settings.aiEnabled);
  const [isToggling, setIsToggling] = useState(false);
  const channelMeta = INTEGRATION_CHANNEL_LIST.find(
    (item) => item.id === settings.channel,
  );
  const label = channelMeta?.label ?? settings.channel;

  async function handleToggle() {
    setIsToggling(true);

    try {
      const nextEnabled = !aiEnabled;
      const result = await toggleChannelAiAction(settings.channel, nextEnabled);

      if (!result.success) {
        toast.error(result.message ?? "Unable to update My Assistant.");
        return;
      }

      setAiEnabled(nextEnabled);
      toast.success(
        nextEnabled
          ? AI_MANAGER_MESSAGES.toggleSuccessOn
          : AI_MANAGER_MESSAGES.toggleSuccessOff,
      );
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <Card
      className={cn(
        "shadow-none transition-colors",
        isExpanded && "border-primary/40 ring-1 ring-primary/20",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border bg-muted/30">
              <ChannelBrandIcon
                channel={settings.channel as MessagingIntegrationChannelId}
                className="size-5"
              />
            </div>
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription className="mt-1">
                {settings.isChannelConnected
                  ? AI_MANAGER_MESSAGES.channelConnected
                  : AI_MANAGER_MESSAGES.channelNotConnected}
              </CardDescription>
            </div>
          </div>
          <Badge variant={aiEnabled ? "default" : "secondary"}>
            {aiEnabled
              ? AI_MANAGER_MESSAGES.channelAiOn
              : AI_MANAGER_MESSAGES.channelAiOff}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {settings.isChannelConnected ? (
          <Button
            type="button"
            size="sm"
            variant={aiEnabled ? "outline" : "default"}
            disabled={isToggling}
            onClick={() => {
              void handleToggle();
            }}
          >
            {isToggling ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Updating...
              </>
            ) : aiEnabled ? (
              "Turn off"
            ) : (
              "Turn on"
            )}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="secondary" asChild>
            <Link
              href={buildIntegrationActivateHref(
                settings.channel as MessagingIntegrationChannelId,
              )}
            >
              {AI_MANAGER_MESSAGES.connectChannel}
            </Link>
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            router.push(
              isExpanded
                ? buildAiManagerHref()
                : buildAiManagerHref({ channel: settings.channel }),
            );
          }}
        >
          {isExpanded
            ? AI_MANAGER_MESSAGES.hideSettings
            : AI_MANAGER_MESSAGES.configure}
        </Button>
      </CardContent>
    </Card>
  );
}
