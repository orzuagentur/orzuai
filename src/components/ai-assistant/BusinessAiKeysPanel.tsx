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
import { saveBusinessAiKeySettingsAction } from "@/features/ai-assistant/actions/save-business-ai-keys";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import type { BusinessAiKeySettings } from "@/services/business-ai-keys.service";

type BusinessAiKeysPanelProps = {
  initialSettings: BusinessAiKeySettings;
};

export function BusinessAiKeysPanel({
  initialSettings,
}: BusinessAiKeysPanelProps) {
  const [preferCustomerAiKeys, setPreferCustomerAiKeys] = useState(
    initialSettings.preferCustomerAiKeys,
  );
  const [geminiPreview, setGeminiPreview] = useState(
    initialSettings.geminiKeyPreview,
  );
  const [openaiPreview, setOpenaiPreview] = useState(
    initialSettings.openaiKeyPreview,
  );
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(options?: {
    clearGemini?: boolean;
    clearOpenAi?: boolean;
  }) {
    setIsSaving(true);
    try {
      const result = await saveBusinessAiKeySettingsAction({
        preferCustomerAiKeys,
        geminiApiKey: options?.clearGemini ? undefined : geminiApiKey || undefined,
        openaiApiKey: options?.clearOpenAi ? undefined : openaiApiKey || undefined,
        clearGemini: options?.clearGemini,
        clearOpenAi: options?.clearOpenAi,
      });

      if (!result.success) {
        toast.error(result.message ?? AI_ASSISTANT_MESSAGES.saveFailed);
        return;
      }

      if (options?.clearGemini) {
        setGeminiPreview(null);
        setGeminiApiKey("");
      } else if (geminiApiKey.trim()) {
        setGeminiPreview(AI_ASSISTANT_MESSAGES.byokKeyConfigured);
        setGeminiApiKey("");
      }

      if (options?.clearOpenAi) {
        setOpenaiPreview(null);
        setOpenaiApiKey("");
      } else if (openaiApiKey.trim()) {
        setOpenaiPreview(AI_ASSISTANT_MESSAGES.byokKeyConfigured);
        setOpenaiApiKey("");
      }

      toast.success(AI_ASSISTANT_MESSAGES.byokSaved);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{AI_ASSISTANT_MESSAGES.byokTitle}</CardTitle>
        <CardDescription>
          {AI_ASSISTANT_MESSAGES.byokDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start justify-between gap-3 text-sm">
          <span>{AI_ASSISTANT_MESSAGES.byokPreferCustomerKeys}</span>
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={preferCustomerAiKeys}
            disabled={isSaving}
            onChange={(event) => setPreferCustomerAiKeys(event.target.checked)}
          />
        </label>

        <div className="space-y-2">
          <Label htmlFor="byok-gemini">{AI_ASSISTANT_MESSAGES.byokGeminiKey}</Label>
          <p className="text-xs text-muted-foreground">
            {geminiPreview
              ? `${AI_ASSISTANT_MESSAGES.byokKeyConfigured}: ${geminiPreview}`
              : AI_ASSISTANT_MESSAGES.byokKeyMissing}
          </p>
          <Input
            id="byok-gemini"
            type="password"
            autoComplete="off"
            value={geminiApiKey}
            disabled={isSaving}
            placeholder={AI_ASSISTANT_MESSAGES.byokKeyPlaceholder}
            onChange={(event) => setGeminiApiKey(event.target.value)}
          />
          {geminiPreview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={() => void handleSave({ clearGemini: true })}
            >
              {AI_ASSISTANT_MESSAGES.byokClearGemini}
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="byok-openai">{AI_ASSISTANT_MESSAGES.byokOpenAiKey}</Label>
          <p className="text-xs text-muted-foreground">
            {openaiPreview
              ? `${AI_ASSISTANT_MESSAGES.byokKeyConfigured}: ${openaiPreview}`
              : AI_ASSISTANT_MESSAGES.byokKeyMissing}
          </p>
          <Input
            id="byok-openai"
            type="password"
            autoComplete="off"
            value={openaiApiKey}
            disabled={isSaving}
            placeholder={AI_ASSISTANT_MESSAGES.byokKeyPlaceholder}
            onChange={(event) => setOpenaiApiKey(event.target.value)}
          />
          {openaiPreview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={() => void handleSave({ clearOpenAi: true })}
            >
              {AI_ASSISTANT_MESSAGES.byokClearOpenAi}
            </Button>
          ) : null}
        </div>

        <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
          {isSaving ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            AI_ASSISTANT_MESSAGES.byokSave
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
