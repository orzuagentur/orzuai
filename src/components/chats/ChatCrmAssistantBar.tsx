"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getConversationCrmAssistantAction } from "@/features/chats/actions/get-conversation-crm-assistant";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import type { ConversationCrmAssistantData } from "@/services/crm-assistant.service";
import {
  getLeadScoreBadgeClassName,
  getLeadScoreLabel,
} from "@/utils/lead-score";

type ChatCrmAssistantBarProps = {
  conversationId: string;
};

export function ChatCrmAssistantBar({ conversationId }: ChatCrmAssistantBarProps) {
  const [data, setData] = useState<ConversationCrmAssistantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      const result = await getConversationCrmAssistantAction({ conversationId });

      if (cancelled) {
        return;
      }

      setData(result.success ? result.data : null);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" />
        {CHAT_MESSAGES.crmAssistantLoading}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-2 border-b bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <SparklesIcon className="size-3.5 text-primary" />
          {CHAT_MESSAGES.crmAssistantTitle}
        </span>
        {data.leadScore !== null ? (
          <Badge
            variant="outline"
            className={`text-[10px] ${getLeadScoreBadgeClassName(data.leadScore)}`}
          >
            {data.leadScore} · {getLeadScoreLabel(data.leadScore)}
          </Badge>
        ) : null}
      </div>
      {data.aiSummary ? (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {data.aiSummary}
        </p>
      ) : null}
      <p className="text-xs">
        <span className="font-medium">{CHAT_MESSAGES.crmSuggestedAction}: </span>
        {data.suggestedAction}
      </p>
    </div>
  );
}
