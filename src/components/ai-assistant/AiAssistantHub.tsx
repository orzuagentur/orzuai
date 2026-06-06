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
import {
  DashboardFill,
  DashboardPaneBody,
  DashboardPaneHeader,
  DashboardSplitView,
} from "@/components/layout/DashboardWorkspaceLayout";
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

  const activeChannelLabel =
    INTEGRATION_CHANNEL_LIST.find((c) => c.id === activeChannel)?.label ??
    activeChannel;

  const navigation = (
    <nav className="flex flex-row gap-1 p-2 lg:flex-col lg:overflow-x-visible">
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
  );

  return (
    <DashboardFill>
      <DashboardPaneHeader className="hidden lg:block">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {AI_ASSISTANT_MESSAGES.pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.pageDescription}
          </p>
          <p className="text-xs text-muted-foreground">
            Server default model:{" "}
            <code className="rounded bg-muted px-1">{data.defaultModel}</code>
          </p>
        </div>
      </DashboardPaneHeader>

      <DashboardSplitView
        navigationTitle={AI_ASSISTANT_MESSAGES.channelsTitle}
        navigation={navigation}
        header={
          <div className="space-y-1 lg:hidden">
            <h1 className="text-xl font-semibold tracking-tight">
              {AI_ASSISTANT_MESSAGES.pageTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeChannelLabel} settings
            </p>
          </div>
        }
      >
        <DashboardPaneBody className="bg-muted/10">
          <div className="mx-auto w-full max-w-4xl space-y-6">
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
        </DashboardPaneBody>
      </DashboardSplitView>
    </DashboardFill>
  );
}
