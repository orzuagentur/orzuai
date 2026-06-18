"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRightIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askPlatformCopilotAction } from "@/features/platform-copilot/actions/ask-platform-copilot";
import { PLATFORM_COPILOT_MESSAGES } from "@/features/platform-copilot/constants";
import { cn } from "@/lib/utils";

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  navigateTo?: string | null;
  navigateLabel?: string | null;
};

function createEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PlatformCopilotWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [entries, isAsking, isOpen, scrollToBottom]);

  const navigateToPath = useCallback(
    (path: string, label?: string | null) => {
      toast.message(PLATFORM_COPILOT_MESSAGES.navigated, {
        description: label ?? path,
      });
      router.push(path);
    },
    [router],
  );

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
      const history = [...entries, userEntry].map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

      const result = await askPlatformCopilotAction({
        question: trimmed,
        currentPath: pathname,
        history,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const assistantEntry: ChatEntry = {
        id: createEntryId(),
        role: "assistant",
        content: result.reply,
        navigateTo: result.navigateTo,
        navigateLabel: result.navigateLabel,
      };

      setEntries((current) => [...current, assistantEntry]);

      if (result.autoNavigate && result.navigateTo) {
        window.setTimeout(() => {
          navigateToPath(result.navigateTo!, result.navigateLabel);
        }, 600);
      }
    } finally {
      setIsAsking(false);
    }
  }

  function handleExampleClick(example: string) {
    void submitQuestion(example);
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {isOpen ? (
        <div
          className={cn(
            "pointer-events-auto flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
            "animate-in fade-in-0 slide-in-from-bottom-4 duration-200 sm:w-96",
            "max-h-[min(70vh,32rem)]",
          )}
          role="dialog"
          aria-label={PLATFORM_COPILOT_MESSAGES.name}
        >
          <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-primary/10 via-background to-background px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-full border bg-background shadow-sm">
                <BrandMark size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">
                  {PLATFORM_COPILOT_MESSAGES.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {PLATFORM_COPILOT_MESSAGES.tagline}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={PLATFORM_COPILOT_MESSAGES.closeAria}
              onClick={() => setIsOpen(false)}
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4"
          >
            {entries.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <SparklesIcon className="size-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {PLATFORM_COPILOT_MESSAGES.emptyHint}
                </p>
                <div className="flex w-full flex-col gap-2">
                  {PLATFORM_COPILOT_MESSAGES.examples.map((example) => (
                    <Button
                      key={example}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isAsking}
                      className="h-auto justify-start whitespace-normal px-3 py-2 text-left text-xs"
                      onClick={() => handleExampleClick(example)}
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {entries.map((entry) => {
                  const isUser = entry.role === "user";

                  return (
                    <li
                      key={entry.id}
                      className={cn("flex gap-2", isUser && "flex-row-reverse")}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "border bg-muted/40",
                        )}
                      >
                        {entry.content}
                        {!isUser && entry.navigateTo ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="mt-2 h-8 gap-1.5 text-xs"
                            onClick={() =>
                              navigateToPath(
                                entry.navigateTo!,
                                entry.navigateLabel,
                              )
                            }
                          >
                            {entry.navigateLabel ??
                              PLATFORM_COPILOT_MESSAGES.openPage}
                            <ArrowUpRightIcon className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
                {isAsking ? (
                  <li className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                    <Loader2Icon className="size-3.5 animate-spin" />
                    {PLATFORM_COPILOT_MESSAGES.thinking}
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          <div className="shrink-0 border-t bg-background p-3">
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
                placeholder={PLATFORM_COPILOT_MESSAGES.placeholder}
                className="min-h-0 resize-none text-sm"
              />
              <Button
                type="button"
                size="sm"
                className="shrink-0 self-end"
                disabled={isAsking || !question.trim()}
                onClick={() => void submitQuestion(question)}
              >
                {isAsking ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  PLATFORM_COPILOT_MESSAGES.send
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={cn(
          "pointer-events-auto group flex flex-col items-center gap-1.5",
          "transition-transform hover:scale-[1.02] active:scale-[0.98]",
        )}
        aria-label={PLATFORM_COPILOT_MESSAGES.openAria}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span
          className={cn(
            "relative flex size-14 items-center justify-center rounded-full border-2 border-primary/20 bg-background shadow-lg",
            "ring-4 ring-primary/10 transition-shadow group-hover:shadow-xl group-hover:ring-primary/20",
            isOpen && "border-primary/40 ring-primary/25",
          )}
        >
          <BrandMark size={34} />
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow">
            <SparklesIcon className="size-2.5" />
          </span>
        </span>
        <span className="rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold tracking-tight text-foreground shadow-sm backdrop-blur">
          {PLATFORM_COPILOT_MESSAGES.name}
        </span>
      </button>
    </div>
  );
}
