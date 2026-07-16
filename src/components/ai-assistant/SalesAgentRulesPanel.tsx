"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  saveSalesAgentSettingsAction,
  testSalesAgentRuleAction,
} from "@/features/ai-assistant/actions/save-sales-agent-settings";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import type {
  SalesAgentRuleTestResult,
  SalesAgentSettings,
} from "@/types/ai-usage.types";

type SalesAgentRulesPanelProps = {
  initialSettings: SalesAgentSettings;
};

export function SalesAgentRulesPanel({
  initialSettings,
}: SalesAgentRulesPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [sampleMessage, setSampleMessage] = useState(
    "We have budget approved and need a demo this week for our team of 20.",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SalesAgentRuleTestResult | null>(
    null,
  );

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await saveSalesAgentSettingsAction(settings);
      if (!result.success) {
        toast.error(result.message ?? AI_ASSISTANT_MESSAGES.saveFailed);
        return;
      }
      toast.success(AI_ASSISTANT_MESSAGES.salesAgentSaved);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testSalesAgentRuleAction({ message: sampleMessage });
      setTestResult(result);
      if (!result.success) {
        toast.error(result.message ?? "Test failed.");
      }
    } finally {
      setIsTesting(false);
    }
  }

  function updateSetting<K extends keyof SalesAgentSettings>(
    key: K,
    value: SalesAgentSettings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{AI_ASSISTANT_MESSAGES.salesAgentTitle}</CardTitle>
        <CardDescription>
          {AI_ASSISTANT_MESSAGES.salesAgentDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start justify-between gap-3 text-sm">
          <span>{AI_ASSISTANT_MESSAGES.salesAgentEnabled}</span>
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={settings.salesAgentEnabled}
            disabled={isSaving}
            onChange={(event) =>
              updateSetting("salesAgentEnabled", event.target.checked)
            }
          />
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
            value={settings.bantThreshold}
            disabled={isSaving || !settings.salesAgentEnabled}
            onChange={(event) =>
              updateSetting(
                "bantThreshold",
                Math.min(100, Math.max(0, Number(event.target.value) || 0)),
              )
            }
          />
        </div>

        <label className="flex items-start justify-between gap-3 text-sm">
          <span>{AI_ASSISTANT_MESSAGES.autoQualifyLabel}</span>
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={settings.autoQualifyPipeline}
            disabled={isSaving || !settings.salesAgentEnabled}
            onChange={(event) =>
              updateSetting("autoQualifyPipeline", event.target.checked)
            }
          />
        </label>

        <label className="flex items-start justify-between gap-3 text-sm">
          <span>{AI_ASSISTANT_MESSAGES.autoTaskEnabled}</span>
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={settings.autoTaskEnabled}
            disabled={isSaving || !settings.salesAgentEnabled}
            onChange={(event) =>
              updateSetting("autoTaskEnabled", event.target.checked)
            }
          />
        </label>

        <div className="space-y-2">
          <Label htmlFor="auto-task-threshold">
            {AI_ASSISTANT_MESSAGES.autoTaskThresholdLabel}
          </Label>
          <Input
            id="auto-task-threshold"
            type="number"
            min={0}
            max={100}
            value={settings.autoTaskThreshold}
            disabled={
              isSaving ||
              !settings.salesAgentEnabled ||
              !settings.autoTaskEnabled
            }
            onChange={(event) =>
              updateSetting(
                "autoTaskThreshold",
                Math.min(100, Math.max(0, Number(event.target.value) || 0)),
              )
            }
          />
        </div>

        <label className="flex items-start justify-between gap-3 text-sm">
          <span>{AI_ASSISTANT_MESSAGES.autoDealEnabled}</span>
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={settings.autoDealEnabled}
            disabled={isSaving || !settings.salesAgentEnabled}
            onChange={(event) =>
              updateSetting("autoDealEnabled", event.target.checked)
            }
          />
        </label>

        <div className="space-y-2">
          <Label htmlFor="auto-deal-threshold">
            {AI_ASSISTANT_MESSAGES.autoDealThresholdLabel}
          </Label>
          <Input
            id="auto-deal-threshold"
            type="number"
            min={0}
            max={100}
            value={settings.autoDealThreshold}
            disabled={
              isSaving ||
              !settings.salesAgentEnabled ||
              !settings.autoDealEnabled
            }
            onChange={(event) =>
              updateSetting(
                "autoDealThreshold",
                Math.min(100, Math.max(0, Number(event.target.value) || 0)),
              )
            }
          />
        </div>

        <label className="flex items-start justify-between gap-3 text-sm">
          <span>{AI_ASSISTANT_MESSAGES.sentimentEnabled}</span>
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={settings.sentimentAnalysisEnabled}
            disabled={isSaving}
            onChange={(event) =>
              updateSetting("sentimentAnalysisEnabled", event.target.checked)
            }
          />
        </label>

        <div className="space-y-2 rounded-lg border p-3">
          <Label htmlFor="sales-agent-sample">
            {AI_ASSISTANT_MESSAGES.salesAgentTestLabel}
          </Label>
          <Textarea
            id="sales-agent-sample"
            rows={3}
            value={sampleMessage}
            disabled={isTesting}
            onChange={(event) => setSampleMessage(event.target.value)}
            placeholder={AI_ASSISTANT_MESSAGES.salesAgentTestPlaceholder}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isTesting || !sampleMessage.trim()}
            onClick={() => void handleTest()}
          >
            {isTesting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {AI_ASSISTANT_MESSAGES.salesAgentTesting}
              </>
            ) : (
              AI_ASSISTANT_MESSAGES.salesAgentTest
            )}
          </Button>
          {testResult?.success ? (
            <div className="space-y-1 text-sm">
              <p>
                {AI_ASSISTANT_MESSAGES.salesAgentTestScore}:{" "}
                <strong>{testResult.averageScore ?? 0}</strong>
              </p>
              {testResult.plannedActions?.length ? (
                <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                  {testResult.plannedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {testResult && !testResult.success ? (
            <p className="text-sm text-destructive">{testResult.message}</p>
          ) : null}
        </div>

        <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
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
