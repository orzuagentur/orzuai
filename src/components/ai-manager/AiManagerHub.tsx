"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, MessagesSquare } from "lucide-react";
import { toast } from "sonner";

import { ChannelAiPanel } from "@/components/channel-workspace/ChannelAiPanel";
import { AiManagerChannelCard } from "@/components/ai-manager/AiManagerChannelCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { setAllAiManagerChannelsAction } from "@/features/ai-manager/actions/set-all-ai-manager-channels";
import { AI_MANAGER_MESSAGES } from "@/features/ai-manager/constants";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import type { AiManagerPageData } from "@/types/ai-manager.types";

type AiManagerHubProps = {
  data: AiManagerPageData;
};

export function AiManagerHub({ data }: AiManagerHubProps) {
  const router = useRouter();
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const activeEntry = data.channels.find(
    (entry) => entry.channel === data.activeChannel,
  );
  const allEnabled =
    data.enabledChannelCount === MESSAGING_INTEGRATION_CHANNELS.length;

  async function handleBulkToggle(enabled: boolean) {
    setIsBulkUpdating(true);

    try {
      const result = await setAllAiManagerChannelsAction(enabled);

      if (!result.success) {
        toast.error(result.message ?? "Unable to update My Assistant.");
        return;
      }

      toast.success(
        enabled
          ? AI_MANAGER_MESSAGES.toggleAllOn
          : AI_MANAGER_MESSAGES.toggleAllOff,
      );
      router.refresh();
    } finally {
      setIsBulkUpdating(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <MessagesSquare className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {AI_MANAGER_MESSAGES.pageTitle}
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {AI_MANAGER_MESSAGES.pageDescription}
        </p>
      </div>

      <Card className="max-w-3xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            {AI_MANAGER_MESSAGES.summaryTitle}
          </CardTitle>
          <CardDescription>
            {data.enabledChannelCount > 0
              ? AI_MANAGER_MESSAGES.summaryEnabled(
                  data.enabledChannelCount,
                  MESSAGING_INTEGRATION_CHANNELS.length,
                )
              : AI_MANAGER_MESSAGES.summaryAllOff}
            {data.connectedChannelCount > 0
              ? ` · ${data.connectedChannelCount} connected`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isBulkUpdating || allEnabled}
            onClick={() => {
              void handleBulkToggle(true);
            }}
          >
            {isBulkUpdating ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            {AI_MANAGER_MESSAGES.enableAll}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isBulkUpdating || data.enabledChannelCount === 0}
            onClick={() => {
              void handleBulkToggle(false);
            }}
          >
            {AI_MANAGER_MESSAGES.disableAll}
          </Button>
        </CardContent>
      </Card>

      <div className="grid max-w-3xl gap-4">
        {data.channels.map((entry) => (
          <AiManagerChannelCard
            key={entry.channel}
            settings={entry.settings}
            isExpanded={data.activeChannel === entry.channel}
          />
        ))}
      </div>

      {activeEntry ? (
        <div className="max-w-3xl border-t pt-6">
          <ChannelAiPanel data={activeEntry.settings} />
        </div>
      ) : null}

      <div className="max-w-3xl space-y-2 text-sm text-muted-foreground">
        <p>
          {AI_MANAGER_MESSAGES.knowledgeHint}{" "}
          <Link
            href={DASHBOARD_ROUTES.knowledgeBase}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Knowledge Base
          </Link>
        </p>
        <p>
          {AI_MANAGER_MESSAGES.advancedAgentsHint}{" "}
          <Link
            href={DASHBOARD_ROUTES.aiAssistant}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            AI Agents
          </Link>
        </p>
      </div>
    </div>
  );
}
