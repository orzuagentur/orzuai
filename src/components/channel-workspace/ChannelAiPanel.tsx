"use client";

import { useState } from "react";
import { Bot, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toggleChannelAiAction } from "@/features/channel-workspace/actions/toggle-channel-ai";
import {
  CHANNEL_WORKSPACE_MESSAGES,
  getChannelLabel,
} from "@/features/channel-workspace";
import type { ChannelAiSettingsData } from "@/types/channel-workspace.types";

type ChannelAiPanelProps = {
  data: ChannelAiSettingsData;
};

export function ChannelAiPanel({ data }: ChannelAiPanelProps) {
  const [enabled, setEnabled] = useState(data.aiEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const label = getChannelLabel(data.channel);

  if (!data.hasBusiness) {
    return null;
  }

  async function handleToggle(next: boolean) {
    setIsSaving(true);

    try {
      const result = await toggleChannelAiAction(data.channel, next);

      if (result.success) {
        setEnabled(next);
        toast.success(
          next
            ? CHANNEL_WORKSPACE_MESSAGES.aiEnabledOn
            : CHANNEL_WORKSPACE_MESSAGES.aiEnabledOff,
        );
        return;
      }

      toast.error(result.message ?? "Unable to update AI settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="max-w-3xl shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          <CardTitle>
            {label} — {CHANNEL_WORKSPACE_MESSAGES.aiTitle}
          </CardTitle>
        </div>
        <CardDescription>{CHANNEL_WORKSPACE_MESSAGES.aiDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="channel-ai-toggle">
              {CHANNEL_WORKSPACE_MESSAGES.aiEnabledLabel}
            </Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? CHANNEL_WORKSPACE_MESSAGES.aiEnabledOn
                : CHANNEL_WORKSPACE_MESSAGES.aiEnabledOff}
            </p>
          </div>
          <Button
            id="channel-ai-toggle"
            type="button"
            variant={enabled ? "default" : "outline"}
            disabled={isSaving}
            onClick={() => {
              void handleToggle(!enabled);
            }}
          >
            {isSaving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : enabled ? (
              "Enabled"
            ) : (
              "Disabled"
            )}
          </Button>
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="font-medium text-foreground">Model:</span> {data.model}
          </p>
          <p>
            <span className="font-medium text-foreground">Language:</span>{" "}
            {data.language}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
