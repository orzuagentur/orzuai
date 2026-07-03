"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { generateKnowledgeAiAction } from "@/features/knowledge-base/actions/generate-knowledge-ai";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";

type KnowledgeAiStudioCardProps = {
  geminiConfigured: boolean;
  disabled?: boolean;
  compact?: boolean;
};

export function KnowledgeAiStudioCard({
  geminiConfigured,
  disabled = false,
  compact = false,
}: KnowledgeAiStudioCardProps) {
  const router = useRouter();
  const [hints, setHints] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleGenerate() {
    if (!geminiConfigured) {
      toast.error("AI is not configured. Contact support or check environment settings.");
      return;
    }

    setBusy(true);

    try {
      const result = await generateKnowledgeAiAction({
        hints,
        replaceExisting,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(
        `${KNOWLEDGE_MESSAGES.aiStudioSuccess} (${result.data.created} entries)`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="knowledge-ai-hints">
            {KNOWLEDGE_MESSAGES.aiStudioHintsLabel}
          </Label>
          <Textarea
            id="knowledge-ai-hints"
            value={hints}
            onChange={(event) => setHints(event.target.value)}
            placeholder={KNOWLEDGE_MESSAGES.aiStudioHintsPlaceholder}
            className="min-h-24"
            disabled={busy || disabled}
          />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(event) => setReplaceExisting(event.target.checked)}
            disabled={busy || disabled}
            className="mt-1"
          />
          <span className="text-muted-foreground">
            {KNOWLEDGE_MESSAGES.aiStudioReplace}
          </span>
        </label>
        <Button
          type="button"
          className="w-full"
          disabled={busy || disabled || !geminiConfigured}
          onClick={() => void handleGenerate()}
        >
          {busy ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="size-4" />
          {KNOWLEDGE_MESSAGES.aiStudioGenerate}
            </>
          )}
        </Button>
    </div>
  );

  if (compact) {
    return form;
  }

  return (
    <Card className="flex h-full flex-col shadow-none">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <SparklesIcon className="size-5" />
        </div>
        <CardTitle className="text-base">{KNOWLEDGE_MESSAGES.aiStudioTitle}</CardTitle>
        <CardDescription>{KNOWLEDGE_MESSAGES.aiStudioDescription}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">{form}</CardContent>
    </Card>
  );
}
