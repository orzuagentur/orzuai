"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AiCommunicationStyleSelect } from "@/components/ai-assistant/AiCommunicationStyleSelect";
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
import { saveAiAssistantProfileAction } from "@/features/ai-assistant/actions/save-ai-assistant-profile";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  DEFAULT_COMMUNICATION_STYLE,
  isCommunicationStyleId,
  type CommunicationStyleId,
} from "@/features/ai-assistant/communication-styles";
import type { AiAssistantProfileData } from "@/types/ai-assistant-profile.types";
import { AI_LANGUAGE_OPTIONS } from "@/types/channel-workspace.types";

type AiAssistantEditPanelProps = {
  profile: AiAssistantProfileData;
  onBack: () => void;
};

export function AiAssistantEditPanel({
  profile,
  onBack,
}: AiAssistantEditPanelProps) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [systemPrompt, setSystemPrompt] = useState(profile.systemPrompt);
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyleId>(
    isCommunicationStyleId(profile.communicationStyle)
      ? profile.communicationStyle
      : DEFAULT_COMMUNICATION_STYLE,
  );
  const [language, setLanguage] = useState(profile.language);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await saveAiAssistantProfileAction({
        name,
        systemPrompt,
        communicationStyle,
        language,
      });

      if (!result.success) {
        toast.error(result.message ?? "Unable to save assistant settings.");
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.assistantEditSaved);
      router.refresh();
      onBack();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={onBack}>
          ← {AI_ASSISTANT_MESSAGES.assistantEditBack}
        </Button>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{AI_ASSISTANT_MESSAGES.assistantEditTitle}</CardTitle>
            <CardDescription>
              {AI_ASSISTANT_MESSAGES.assistantEditFormDescription}
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.assistantReplyEngineNote}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="assistant-name">
                {AI_ASSISTANT_MESSAGES.assistantNameLabel}
              </Label>
              <Input
                id="assistant-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={AI_ASSISTANT_MESSAGES.assistantNamePlaceholder}
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assistant-behavior">
                {AI_ASSISTANT_MESSAGES.assistantBehaviorLabel}
              </Label>
              <Textarea
                id="assistant-behavior"
                rows={8}
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder={AI_ASSISTANT_MESSAGES.assistantBehaviorPlaceholder}
              />
              <p className="text-xs text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.assistantBehaviorHint}
              </p>
            </div>

            <AiCommunicationStyleSelect
              value={communicationStyle}
              disabled={isSaving}
              onChange={setCommunicationStyle}
            />

            <div className="space-y-2">
              <Label htmlFor="assistant-language">
                {AI_ASSISTANT_MESSAGES.assistantLanguageLabel}
              </Label>
              <select
                id="assistant-language"
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={language}
                disabled={isSaving}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {AI_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
                {isSaving ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  AI_ASSISTANT_MESSAGES.assistantEditSave
                )}
              </Button>
              <Button type="button" variant="outline" disabled={isSaving} onClick={onBack}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
