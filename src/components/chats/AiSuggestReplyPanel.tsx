"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2Icon, PlusIcon, SparklesIcon, XIcon } from "lucide-react";
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
  const requestIdRef = useRef(0);

  const generateSuggestion = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const result = await suggestConversationReplyAction({ conversationId });

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      setSuggestion(result.data.suggestion);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    setSuggestion(null);
    setIsLoading(false);
    requestIdRef.current += 1;
  }, [conversationId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void generateSuggestion();
  }, [generateSuggestion, open]);

  function handleUse() {
    if (!suggestion) {
      return;
    }

    onUseSuggestion(suggestion);
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
        <div className="min-w-0 space-y-0.5">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <SparklesIcon className="size-4 text-primary" />
            {CHAT_MESSAGES.suggestReplyTitle}
          </p>
          <p className="text-xs text-muted-foreground">
            {CHAT_MESSAGES.suggestReplyDescription}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {suggestion ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleUse}
              aria-label={CHAT_MESSAGES.suggestReplyUse}
            >
              <PlusIcon className="size-4" />
            </Button>
          ) : null}
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="min-h-[12rem] rounded-lg border bg-background p-3">
          {isLoading && !suggestion ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Generating…
            </div>
          ) : suggestion ? (
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

      <div className="shrink-0 border-t bg-background px-4 py-3">
        <Button
          type="button"
          className="w-full gap-1.5"
          onClick={() => {
            void generateSuggestion();
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
