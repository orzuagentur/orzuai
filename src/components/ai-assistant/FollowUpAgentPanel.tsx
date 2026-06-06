"use client";

import { useState } from "react";
import { Clock3Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { saveFollowUpAgentSettingsAction } from "@/features/ai-assistant/actions/save-follow-up-agent-settings";
import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";

type FollowUpAgentPanelProps = {
  settings: FollowUpAgentSettings;
};

export function FollowUpAgentPanel({ settings }: FollowUpAgentPanelProps) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await saveFollowUpAgentSettingsAction(enabled);

      if (!result.success) {
        toast.error(result.message ?? AI_ASSISTANT_MESSAGES.saveFailed);
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.followUpAgentSaved);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock3Icon className="size-5 text-primary" />
          <CardTitle>{AI_ASSISTANT_MESSAGES.followUpAgentTitle}</CardTitle>
        </div>
        <CardDescription>
          {AI_ASSISTANT_MESSAGES.followUpAgentDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          {AI_ASSISTANT_MESSAGES.followUpAgentEnabled}
        </label>
        <p className="text-sm text-muted-foreground">
          {AI_ASSISTANT_MESSAGES.followUpAgentStats(settings.sentCount)}
        </p>
        <Button type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            AI_ASSISTANT_MESSAGES.save
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
