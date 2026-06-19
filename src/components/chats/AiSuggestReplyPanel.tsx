"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, SparklesIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { suggestConversationReplyAction } from "@/features/chats/actions/suggest-conversation-reply";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { cn } from "@/lib/utils";

type AiSuggestReplyPanelProps = {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseSuggestion: (text: string) => void;
  className?: string;
};

export function AiSuggestReplyPanel({
  conversationId,
  open,
  onOpenChange,
  onUseSuggestion,
  className,
}: AiSuggestReplyPanelProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSuggestion(null);
    setIsLoading(false);
  }, [conversationId]);

  async function handleGenerate() {
    setIsLoading(true);

    try {
      const result = await suggestConversationReplyAction({ conversationId });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      setSuggestion(result.data.suggestion);
    } finally {
      setIsLoading(false);
    }
  }

  function handleUse() {
    if (!suggestion) {
      return;
    }

    onUseSuggestion(suggestion);
    onOpenChange(false);
    toast.success("Suggestion added to reply box.");
  }

  function handleClose() {
    onOpenChange(false);
  }

  if (!open) {
    return null;
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden bg-muted/20",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="space-y-0.5">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <SparklesIcon className="size-4 text-primary" />
            {CHAT_MESSAGES.suggestReplyTitle}
          </p>
          <p className="text-xs text-muted-foreground">
            {CHAT_MESSAGES.suggestReplyDescription}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={handleClose}
          aria-label="Close AI suggest panel"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="min-h-[12rem] rounded-lg border bg-background p-3">
          {suggestion ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {suggestion}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {CHAT_MESSAGES.suggestReplyEmpty}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t bg-background px-4 py-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={!suggestion || isLoading}
          onClick={handleUse}
        >
          {CHAT_MESSAGES.suggestReplyUse}
        </Button>
        <Button
          type="button"
          className="w-full gap-1.5"
          onClick={() => {
            void handleGenerate();
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <SparklesIcon className="size-4" />
              {CHAT_MESSAGES.suggestReplyButton}
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
