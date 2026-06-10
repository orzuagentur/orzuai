"use client";

import { useRef, useState } from "react";
import {
  BotIcon,
  Loader2Icon,
  MessageCircleQuestionIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { askAnalyticsAssistantAction } from "@/features/analytics/actions/ask-analytics-assistant";
import { cn } from "@/lib/utils";

const EXAMPLE_QUESTIONS = [
  ANALYTICS_MESSAGES.assistantExampleAttention,
  ANALYTICS_MESSAGES.assistantExampleLeads,
  ANALYTICS_MESSAGES.assistantExampleAiTeam,
  ANALYTICS_MESSAGES.assistantExampleAutomations,
  ANALYTICS_MESSAGES.assistantExampleFunnel,
] as const;

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function createEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AnalyticsAskPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  async function submitQuestion(rawQuestion: string) {
    const trimmed = rawQuestion.trim();

    if (!trimmed || isAsking) {
      return;
    }

    const userEntry: ChatEntry = {
      id: createEntryId(),
      role: "user",
      content: trimmed,
    };

    setEntries((current) => [...current, userEntry]);
    setQuestion("");
    setIsAsking(true);

    try {
      const result = await askAnalyticsAssistantAction({ question: trimmed });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setEntries((current) => [
        ...current,
        {
          id: createEntryId(),
          role: "assistant",
          content: result.answer,
        },
      ]);

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } finally {
      setIsAsking(false);
    }
  }

  function handleExampleClick(example: string) {
    setQuestion(example);
    void submitQuestion(example);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircleQuestionIcon className="size-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold">
              {ANALYTICS_MESSAGES.askPanelTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {ANALYTICS_MESSAGES.askPanelDescription}
            </p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {entries.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border bg-muted/30">
              <BotIcon className="size-7 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {ANALYTICS_MESSAGES.assistantEmptyHint}
              </p>
              <p className="text-sm text-muted-foreground">
                {ANALYTICS_MESSAGES.assistantDescription}
              </p>
            </div>
            <div className="flex w-full flex-wrap justify-center gap-2">
              {EXAMPLE_QUESTIONS.map((example) => (
                <Button
                  key={example}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isAsking}
                  onClick={() => handleExampleClick(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="mx-auto flex max-w-2xl flex-col gap-4">
            {entries.map((entry) => {
              const isUser = entry.role === "user";

              return (
                <li
                  key={entry.id}
                  className={cn("flex gap-3", isUser && "flex-row-reverse")}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border",
                      isUser ? "bg-background" : "bg-primary/10",
                    )}
                  >
                    {isUser ? (
                      <UserIcon className="size-4" />
                    ) : (
                      <BotIcon className="size-4 text-primary" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl border px-4 py-3 text-sm whitespace-pre-wrap",
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30",
                    )}
                  >
                    {entry.content}
                  </div>
                </li>
              );
            })}
            {isAsking ? (
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                {ANALYTICS_MESSAGES.assistantAnalyzing}
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t bg-background p-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {entries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.slice(0, 3).map((example) => (
                <Button
                  key={example}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isAsking}
                  onClick={() => handleExampleClick(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <Textarea
              rows={2}
              value={question}
              disabled={isAsking}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitQuestion(question);
                }
              }}
              placeholder={ANALYTICS_MESSAGES.assistantPlaceholder}
              className="min-h-0 resize-none"
            />
            <Button
              type="button"
              className="shrink-0 self-end"
              disabled={isAsking || !question.trim()}
              onClick={() => void submitQuestion(question)}
            >
              {isAsking ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                ANALYTICS_MESSAGES.assistantAsk
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
