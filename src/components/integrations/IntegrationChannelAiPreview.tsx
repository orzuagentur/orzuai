"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, BotIcon, Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildIntegrationAiSettingsHref,
  INTEGRATIONS_MESSAGES,
} from "@/features/integrations";
import { useChannelAiEnabled } from "@/hooks/use-channel-ai-enabled";
import { useToggleChatAi } from "@/hooks/use-toggle-chat-ai";
import type { ChannelAiSettingsData } from "@/types/channel-workspace.types";

type IntegrationChannelAiPreviewProps = {
  settings: ChannelAiSettingsData;
};

export function IntegrationChannelAiPreview({
  settings,
}: IntegrationChannelAiPreviewProps) {
  const router = useRouter();
  const aiEnabled = useChannelAiEnabled(settings.channel, settings.aiEnabled);
  const { toggleAi, isLoading } = useToggleChatAi();
  const isOn = aiEnabled === true;
  const settingsHref = buildIntegrationAiSettingsHref(settings.channel);

  async function handleToggle() {
    if (aiEnabled === null) {
      return;
    }

    const result = await toggleAi({
      channel: settings.channel,
      enabled: !isOn,
    });

    if (result.success) {
      router.refresh();
    }
  }

  return (
    <Card className="max-w-2xl shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border bg-muted/30">
              <BotIcon className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">
                {INTEGRATIONS_MESSAGES.aiPreviewTitle}
              </CardTitle>
              <CardDescription>
                {INTEGRATIONS_MESSAGES.aiPreviewDescription}
              </CardDescription>
            </div>
          </div>
          <Badge variant={isOn ? "default" : "secondary"}>
            {isOn ? "On" : "Off"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isOn
            ? INTEGRATIONS_MESSAGES.aiPreviewEnabled
            : INTEGRATIONS_MESSAGES.aiPreviewDisabled}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={isOn ? "outline" : "default"}
            disabled={isLoading || aiEnabled === null}
            onClick={() => {
              void handleToggle();
            }}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Updating...
              </>
            ) : isOn ? (
              "Turn off"
            ) : (
              "Turn on"
            )}
          </Button>
          <Button type="button" size="sm" variant="secondary" asChild>
            <Link href={settingsHref}>
              {INTEGRATIONS_MESSAGES.openAiSettings}
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
