"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRightIcon,
  GripHorizontalIcon,
  Loader2Icon,
  SendIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AiAssistantIcon } from "@/components/icons/AiAssistantIcon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformCopilot } from "@/contexts/platform-copilot-context";
import { askPlatformCopilotAction } from "@/features/platform-copilot/actions/ask-platform-copilot";
import { PLATFORM_COPILOT_MESSAGES } from "@/features/platform-copilot/constants";
import { cn } from "@/lib/utils";
import { isCalendarSetupFromKnowledgeRequest } from "@/utils/calendar-setup-from-knowledge";

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  navigateTo?: string | null;
  navigateLabel?: string | null;
};

type WidgetOffset = {
  x: number;
  y: number;
};

const PANEL_WIDTH = 384;
const PANEL_MIN_HEIGHT = 360;
const PANEL_MAX_HEIGHT = 720;
const PANEL_DEFAULT_HEIGHT = 560;

function createEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function PlatformCopilotWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, setIsOpen } = usePlatformCopilot();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [askingMode, setAskingMode] = useState<"default" | "calendar_setup">(
    "default",
  );
  const [dragOffset, setDragOffset] = useState<WidgetOffset>({ x: 0, y: 0 });
  const [panelHeight, setPanelHeight] = useState(PANEL_DEFAULT_HEIGHT);

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
    setAskingMode(
      isCalendarSetupFromKnowledgeRequest(trimmed) ? "calendar_setup" : "default",
    );

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
      setAskingMode("default");
    }
  }

  function handleExampleClick(example: string) {
    void submitQuestion(example);
  }

  function startPanelDrag(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...dragOffset };

    function onMove(moveEvent: PointerEvent) {
      setDragOffset({
        x: origin.x + (moveEvent.clientX - startX),
        y: origin.y + (moveEvent.clientY - startY),
      });
    }

    function onUp(upEvent: PointerEvent) {
      handle.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startPanelResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const originHeight = panelHeight;

    function onMove(moveEvent: PointerEvent) {
      const nextHeight = clamp(
        originHeight + (startY - moveEvent.clientY),
        PANEL_MIN_HEIGHT,
        Math.min(PANEL_MAX_HEIGHT, window.innerHeight - 96),
      );
      setPanelHeight(nextHeight);
    }

    function onUp(upEvent: PointerEvent) {
      handle.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-platform-copilot-root
      className="pointer-events-none fixed bottom-4 left-4 z-50 md:left-[calc(var(--sidebar-width)+1rem)]"
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
      }}
    >
      <div
        className={cn(
          "pointer-events-auto relative flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
          "animate-in fade-in-0 slide-in-from-bottom-4 duration-200",
        )}
        style={{ width: PANEL_WIDTH, height: panelHeight }}
        role="dialog"
        aria-label={PLATFORM_COPILOT_MESSAGES.name}
      >
        <div
          className="absolute inset-x-8 top-0 z-10 flex h-3 cursor-ns-resize items-center justify-center"
          onPointerDown={startPanelResize}
          aria-hidden
        >
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div
          className="flex cursor-grab items-center justify-between gap-2 border-b bg-gradient-to-r from-primary/10 via-background to-background px-4 py-3 active:cursor-grabbing"
          onPointerDown={startPanelDrag}
        >
          <div className="flex items-center gap-2.5">
            <AiAssistantIcon size={36} />
            <div>
              <p className="text-sm font-semibold leading-none">
                {PLATFORM_COPILOT_MESSAGES.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {PLATFORM_COPILOT_MESSAGES.tagline}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <GripHorizontalIcon
              className="size-4 text-muted-foreground/70"
              aria-hidden
            />
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
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4"
        >
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <AiAssistantIcon size={56} />
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
                  {askingMode === "calendar_setup"
                    ? PLATFORM_COPILOT_MESSAGES.calendarSetupThinking
                    : PLATFORM_COPILOT_MESSAGES.thinking}
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
              size="icon"
              className="size-10 shrink-0 self-end rounded-full"
              disabled={isAsking || !question.trim()}
              aria-label={PLATFORM_COPILOT_MESSAGES.sendAria}
              onClick={() => void submitQuestion(question)}
            >
              {isAsking ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
