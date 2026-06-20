"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon, PencilIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  buildIntegrationActivateHref,
  INTEGRATION_CHANNEL_LIST,
} from "@/features/integrations";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { useChannelAiEnabled } from "@/hooks/use-channel-ai-enabled";
import { useToggleChatAi } from "@/hooks/use-toggle-chat-ai";
import { cn } from "@/lib/utils";
import type { ChannelAiSettingsData } from "@/types/channel-workspace.types";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";

type AiAssistantChannelRowProps = {
  settings: ChannelAiSettingsData;
  onEdit: () => void;
};

export function AiAssistantChannelRow({
  settings,
  onEdit,
}: AiAssistantChannelRowProps) {
  const router = useRouter();
  const aiEnabled = useChannelAiEnabled(settings.channel, settings.aiEnabled);
  const { toggleAi, isLoading } = useToggleChatAi();
  const isOn = aiEnabled === true;
  const channelMeta = INTEGRATION_CHANNEL_LIST.find(
    (item) => item.id === settings.channel,
  );
  const label = channelMeta?.label ?? settings.channel;

  async function handleToggle() {
    if (aiEnabled === null || !settings.isChannelConnected) {
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
    <Card className="shadow-none">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30">
            <ChannelBrandIcon
              channel={settings.channel as MessagingIntegrationChannelId}
              className="size-5"
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium leading-none">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {settings.isChannelConnected
                ? AI_ASSISTANT_MESSAGES.assistantChannelConnected
                : AI_ASSISTANT_MESSAGES.assistantChannelNotConnected}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {settings.isChannelConnected ? (
            <>
              <Badge variant={isOn ? "default" : "secondary"}>
                {isOn ? "On" : "Off"}
              </Badge>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={`${label} AI Assistant`}
                disabled={isLoading || aiEnabled === null}
                onClick={() => {
                  void handleToggle();
                }}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
                  isOn
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/35 bg-muted",
                  isLoading && "cursor-not-allowed opacity-70",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute top-0.5 size-3.5 rounded-full bg-white shadow-sm transition-transform",
                    isOn ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
                {isLoading ? (
                  <Loader2Icon className="absolute inset-0 m-auto size-3 animate-spin text-white" />
                ) : null}
              </button>
              <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                <PencilIcon className="size-3.5" />
                {AI_ASSISTANT_MESSAGES.assistantEdit}
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" variant="secondary" asChild>
              <Link
                href={buildIntegrationActivateHref(
                  settings.channel as MessagingIntegrationChannelId,
                )}
              >
                {AI_ASSISTANT_MESSAGES.assistantConnectChannel}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type AiAssistantHubPanelProps = {
  channels: Array<{ channel: MessagingIntegrationChannelId; settings: ChannelAiSettingsData }>;
  enabledChannelCount: number;
};

export function AiAssistantHubPanel({
  channels,
  enabledChannelCount,
}: AiAssistantHubPanelProps) {
  const router = useRouter();

  function openAssistantEdit() {
    router.push(
      buildAiAssistantHref({
        section: "assistant",
        assistantEdit: true,
      }),
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.assistantTabDescription}
          </p>
          {enabledChannelCount > 0 ? (
            <p className="text-sm font-medium text-foreground">
              Active on {enabledChannelCount} channel
              {enabledChannelCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3">
          {channels.map((entry) => (
            <AiAssistantChannelRow
              key={entry.channel}
              settings={entry.settings}
              onEdit={openAssistantEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
