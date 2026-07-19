"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRightIcon,
  CheckIcon,
  GripHorizontalIcon,
  Loader2Icon,
  SendIcon,
  ShieldAlertIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AiAssistantIcon } from "@/components/icons/AiAssistantIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformCopilot } from "@/contexts/platform-copilot-context";
import { askPlatformCopilotAction } from "@/features/platform-copilot/actions/ask-platform-copilot";
import { executePlatformCopilotActionAction } from "@/features/platform-copilot/actions/execute-platform-copilot-action";
import { PLATFORM_COPILOT_MESSAGES } from "@/features/platform-copilot/constants";
import { cn } from "@/lib/utils";
import type {
  CopilotProposedAction,
  PlatformCopilotMode,
} from "@/types/platform-copilot.types";

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  navigateTo?: string | null;
  navigateLabel?: string | null;
  actions?: CopilotProposedAction[];
  quickReplies?: string[];
  executedActionIds?: string[];
};

type WidgetOffset = {
  x: number;
  y: number;
};

const PANEL_WIDTH = 400;
const PANEL_MIN_HEIGHT = 400;
const PANEL_MAX_HEIGHT = 760;
const PANEL_DEFAULT_HEIGHT = 600;

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
  const [executingActionId, setExecutingActionId] = useState<string | null>(
    null,
  );
  const [mode, setMode] = useState<PlatformCopilotMode>("chat");
  const [confirmedModes, setConfirmedModes] = useState<
    Record<PlatformCopilotMode, boolean>
  >({
    chat: false,
    full_access: false,
  });
  const [pendingMode, setPendingMode] = useState<PlatformCopilotMode | null>(
    null,
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

  function requestModeChange(nextMode: PlatformCopilotMode) {
    if (nextMode === mode) {
      return;
    }

    if (confirmedModes[nextMode]) {
      setMode(nextMode);
      return;
    }

    setPendingMode(nextMode);
  }

  function confirmModeSwitch() {
    if (!pendingMode) {
      return;
    }

    setConfirmedModes((current) => ({ ...current, [pendingMode]: true }));
    setMode(pendingMode);
    setPendingMode(null);
  }

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
        mode,
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
        actions: result.actions,
        quickReplies: result.quickReplies,
        executedActionIds: [],
      };

      setEntries((current) => [...current, assistantEntry]);
    } finally {
      setIsAsking(false);
    }
  }

  async function confirmAction(
    entryId: string,
    action: CopilotProposedAction,
  ) {
    if (executingActionId) {
      return;
    }

    setExecutingActionId(action.id);

    try {
      const result = await executePlatformCopilotActionAction({
        mode,
        action,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      setEntries((current) =>
        current.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                executedActionIds: [
                  ...(entry.executedActionIds ?? []),
                  action.id,
                ],
              }
            : entry,
        ),
      );

      if (result.navigateTo) {
        window.setTimeout(() => {
          navigateToPath(result.navigateTo!, result.navigateLabel);
        }, 400);
      }
    } finally {
      setExecutingActionId(null);
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

  const pendingModeTitle =
    pendingMode === "full_access"
      ? PLATFORM_COPILOT_MESSAGES.modeFullAccessConfirmTitle
      : PLATFORM_COPILOT_MESSAGES.modeChatConfirmTitle;

  const pendingModeBody =
    pendingMode === "full_access"
      ? PLATFORM_COPILOT_MESSAGES.modeFullAccessConfirmBody
      : PLATFORM_COPILOT_MESSAGES.modeChatConfirmBody;

  return (
    <>
      <Dialog
        open={pendingMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMode(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingModeTitle}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap pt-1 text-sm leading-relaxed">
              {pendingModeBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingMode(null)}>
              Отмена
            </Button>
            <Button type="button" onClick={confirmModeSwitch}>
              {PLATFORM_COPILOT_MESSAGES.modeConfirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        data-platform-copilot-root
        className="pointer-events-none fixed bottom-20 right-4 z-50 md:bottom-4 md:left-[calc(var(--sidebar-width)+1rem)] md:right-auto"
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
                          "max-w-[92%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "border bg-muted/40",
                        )}
                      >
                        {entry.content}

                        {!isUser && entry.actions && entry.actions.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {entry.actions.map((action) => {
                              const isDone = entry.executedActionIds?.includes(
                                action.id,
                              );
                              const isRunning = executingActionId === action.id;
                              const needsFullAccess =
                                action.type !== "navigate" &&
                                mode !== "full_access";

                              return (
                                <div
                                  key={action.id}
                                  className="rounded-lg border bg-background/80 p-2"
                                >
                                  <p className="text-xs text-muted-foreground">
                                    {action.summary}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={
                                        action.type === "delete_contact" ||
                                        action.type === "delete_knowledge_entry"
                                          ? "destructive"
                                          : "default"
                                      }
                                      className="h-7 text-xs"
                                      disabled={
                                        isDone ||
                                        isRunning ||
                                        needsFullAccess ||
                                        Boolean(executingActionId)
                                      }
                                      onClick={() =>
                                        void confirmAction(entry.id, action)
                                      }
                                    >
                                      {isRunning ? (
                                        <Loader2Icon className="mr-1 size-3 animate-spin" />
                                      ) : isDone ? (
                                        <CheckIcon className="mr-1 size-3" />
                                      ) : null}
                                      {isDone
                                        ? PLATFORM_COPILOT_MESSAGES.actionDone
                                        : action.label}
                                    </Button>
                                    {needsFullAccess ? (
                                      <span className="flex items-center gap-1 text-[10px] text-destructive">
                                        <ShieldAlertIcon className="size-3" />
                                        {PLATFORM_COPILOT_MESSAGES.requiresFullAccess}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

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

                        {!isUser &&
                        entry.quickReplies &&
                        entry.quickReplies.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {entry.quickReplies.map((reply) => (
                              <Button
                                key={reply}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px]"
                                disabled={isAsking}
                                onClick={() => void submitQuestion(reply)}
                              >
                                {reply}
                              </Button>
                            ))}
                          </div>
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
            <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "chat" ? "default" : "ghost"}
                className="h-8 text-xs"
                onClick={() => requestModeChange("chat")}
              >
                {PLATFORM_COPILOT_MESSAGES.modeChat}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "full_access" ? "destructive" : "ghost"}
                className={cn(
                  "h-8 text-xs",
                  mode === "full_access" && "shadow-sm",
                )}
                onClick={() => requestModeChange("full_access")}
              >
                {PLATFORM_COPILOT_MESSAGES.modeFullAccess}
              </Button>
            </div>
            <p className="mb-2 text-[10px] text-muted-foreground">
              {mode === "full_access"
                ? PLATFORM_COPILOT_MESSAGES.modeFullAccessHint
                : PLATFORM_COPILOT_MESSAGES.modeChatHint}
            </p>
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
    </>
  );
}
