"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PhoneCallIcon } from "lucide-react";

import { AiAgentBuilderPanel } from "@/components/ai-assistant/AiAgentBuilderPanel";
import { FollowUpAgentPanel } from "@/components/ai-assistant/FollowUpAgentPanel";
import { AiGlobalDefaultsCard } from "@/components/ai-assistant/AiGlobalDefaultsCard";
import { AiUsageLimitsPanel } from "@/components/ai-assistant/AiUsageLimitsPanel";
import { SalesAgentPanel } from "@/components/ai-assistant/SalesAgentPanel";
import { ChannelAiPanel } from "@/components/channel-workspace/ChannelAiPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import {
  INTEGRATION_CHANNEL_LIST,
  type IntegrationChannelStatusEntry,
} from "@/features/integrations";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";

type AiAssistantHubProps = {
  data: AiAssistantPageData;
};

function statusBadgeVariant(
  status: IntegrationChannelStatusEntry["status"],
): "default" | "secondary" | "outline" {
  if (status === "connected") {
    return "default";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

export function AiAssistantHub({ data }: AiAssistantHubProps) {
  const searchParams = useSearchParams();
  const channelParam = searchParams.get("channel");
  const activeChannel =
    data.channels.find((entry) => entry.channel === channelParam)?.channel ??
    data.activeChannel;

  const activeEntry = data.channels.find(
    (entry) => entry.channel === activeChannel,
  );
  const templateEntry =
    data.channels.find((entry) => entry.channel === "whatsapp") ??
    activeEntry;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <p className="text-xs text-muted-foreground">
        Server default model:{" "}
        <code className="rounded bg-muted px-1">{data.defaultModel}</code>
      </p>

      <div className="flex min-h-[32rem] flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b lg:w-56 lg:border-b-0 lg:border-r">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.channelsTitle}
            </p>
          </div>
          <nav className="flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col">
            {INTEGRATION_CHANNEL_LIST.map((channel) => {
              const href = `${DASHBOARD_ROUTES.aiAssistant}?channel=${channel.id}`;
              const isActive = activeChannel === channel.id;
              const entry = data.channels.find((c) => c.channel === channel.id);
              const status =
                data.channelStatuses[channel.id]?.status ?? "disconnected";

              return (
                <Link
                  key={channel.id}
                  href={href}
                  className={cn(
                    "flex min-w-[9rem] items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors lg:min-w-0",
                    isActive
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <span>{channel.label}</span>
                  <Badge
                    variant={statusBadgeVariant(status)}
                    className="shrink-0 text-[10px]"
                  >
                    {entry?.settings.aiEnabled ? "AI on" : status}
                  </Badge>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          <AiUsageLimitsPanel usage={data.usage} />

          {templateEntry ? (
            <AiGlobalDefaultsCard template={templateEntry.settings} />
          ) : null}

          <SalesAgentPanel settings={data.salesAgent} />

          <FollowUpAgentPanel settings={data.followUpAgent} />

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PhoneCallIcon className="size-4 text-indigo-600" />
                {VOICE_MESSAGES.channelLabel}
              </CardTitle>
              <CardDescription>{VOICE_MESSAGES.aiAssistantHint}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href={`${DASHBOARD_ROUTES.integrations}/voice?section=activate`}>
                  {VOICE_MESSAGES.openIntegrations}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <AiAgentBuilderPanel
            agents={data.agents}
            activeChannel={activeChannel}
          />

          {activeEntry ? (
            <ChannelAiPanel data={activeEntry.settings} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a channel to configure AI settings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
