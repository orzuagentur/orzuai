"use client";

import { useState } from "react";
import { Loader2Icon, TargetIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { saveSalesAgentSettingsAction } from "@/features/ai-assistant/actions/save-sales-agent-settings";
import type { SalesAgentSettings } from "@/types/ai-usage.types";

type SalesAgentPanelProps = {
  settings: SalesAgentSettings;
};

export function SalesAgentPanel({ settings }: SalesAgentPanelProps) {
  const [salesAgentEnabled, setSalesAgentEnabled] = useState(
    settings.salesAgentEnabled,
  );
  const [bantThreshold, setBantThreshold] = useState(String(settings.bantThreshold));
  const [autoQualifyPipeline, setAutoQualifyPipeline] = useState(
    settings.autoQualifyPipeline,
  );
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await saveSalesAgentSettingsAction({
        salesAgentEnabled,
        bantThreshold: Number(bantThreshold),
        autoQualifyPipeline,
      });

      if (!result.success) {
        toast.error(result.message ?? AI_ASSISTANT_MESSAGES.saveFailed);
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.salesAgentSaved);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TargetIcon className="size-5 text-primary" />
          <CardTitle>{AI_ASSISTANT_MESSAGES.salesAgentTitle}</CardTitle>
        </div>
        <CardDescription>
          {AI_ASSISTANT_MESSAGES.salesAgentDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={salesAgentEnabled}
            onChange={(event) => setSalesAgentEnabled(event.target.checked)}
            className="size-4 rounded border"
          />
          {AI_ASSISTANT_MESSAGES.salesAgentEnabled}
        </label>

        <div className="space-y-2">
          <Label htmlFor="bant-threshold">
            {AI_ASSISTANT_MESSAGES.bantThresholdLabel}
          </Label>
          <Input
            id="bant-threshold"
            type="number"
            min={0}
            max={100}
            value={bantThreshold}
            onChange={(event) => setBantThreshold(event.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoQualifyPipeline}
            onChange={(event) => setAutoQualifyPipeline(event.target.checked)}
            className="size-4 rounded border"
          />
          {AI_ASSISTANT_MESSAGES.autoQualifyLabel}
        </label>

        <Button
          type="button"
          disabled={isSaving}
          onClick={() => {
            void handleSave();
          }}
        >
          {isSaving ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            AI_ASSISTANT_MESSAGES.salesAgentSave
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
