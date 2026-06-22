"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2Icon, SendIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { AiAgentChannelIconRow } from "@/components/ai-assistant/AiAgentChannelIconRow";
import { TypingIndicator } from "@/components/chats/TypingIndicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { testAgentWizardReplyAction } from "@/features/ai-assistant/actions/test-agent-wizard-reply";
import {
  getAgentWizardGoal,
  getAgentWizardTestStarters,
  type AgentWizardGoalId,
} from "@/features/ai-assistant/agent-wizard-catalog";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  chatComposerFieldClassName,
  chatHeaderClassName,
  chatPaneClassName,
  chatSendButtonClassName,
  getChatBubbleClassName,
} from "@/features/chats/chat-theme";
import type { CommunicationStyleId } from "@/features/ai-assistant/communication-styles";
import type { AiProvider } from "@/lib/ai/constants";
import { cn } from "@/lib/utils";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";

const TEXTAREA_MAX_HEIGHT_PX = 96;

type WizardTestMessage = {
  id: string;
  role: "client" | "agent";
  content: string;
};

type AiAgentWizardTestChatProps = {
  agentName: string;
  channel: MessagingIntegrationChannelId;
  goal: AgentWizardGoalId;
  systemPrompt: string;
  provider: AiProvider;
  model: string;
  language: string;
  communicationStyle: CommunicationStyleId;
  disabled?: boolean;
  className?: string;
};

function createMessageId(): string {
  return `wizard-test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function WizardTestBubble({
  message,
  agentName,
}: {
  message: WizardTestMessage;
  agentName: string;
}) {
  const isOutgoing = message.role === "agent";

  return (
    <div
      className={cn(
        "flex min-w-0 w-full items-end gap-1",
        isOutgoing ? "justify-end" : "justify-start",
      )}
    >
      <div className={getChatBubbleClassName({ isOutgoing })}>
        {isOutgoing ? (
          <div className="mb-1 flex items-center gap-1 opacity-90">
            <SparklesIcon className="size-3 shrink-0" aria-hidden />
            <span className="text-[10px] font-medium">{agentName}</span>
          </div>
        ) : (
          <div className="mb-1 text-[10px] font-medium text-[#5f6f78] dark:text-[#8b9aa6]">
            {AI_ASSISTANT_MESSAGES.wizardStepTestYou}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}

export function AiAgentWizardTestChat({
  agentName,
  channel,
  goal,
  systemPrompt,
  provider,
  model,
  language,
  communicationStyle,
  disabled = false,
  className,
}: AiAgentWizardTestChatProps) {
  const [messages, setMessages] = useState<WizardTestMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const goalConfig = getAgentWizardGoal(goal);
  const starters = getAgentWizardTestStarters(goal);

  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, scrollToBottom]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
  }, [draft]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setDraft("");
  }, []);

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const trimmed = rawMessage.trim();

      if (!trimmed || disabled || isSending) {
        return;
      }

      const userMessage: WizardTestMessage = {
        id: createMessageId(),
        role: "client",
        content: trimmed,
      };

      const priorMessages = messages;
      setMessages((current) => [...current, userMessage]);
      setDraft("");
      setIsSending(true);

      try {
        const result = await testAgentWizardReplyAction({
          testMessage: trimmed,
          conversationHistory: priorMessages.map((message) => ({
            role:
              message.role === "client" ? ("user" as const) : ("assistant" as const),
            content: message.content,
          })),
          channel,
          name: agentName,
          systemPrompt,
          goal,
          provider,
          model,
          language,
          communicationStyle,
        });

        if (!result.success) {
          toast.error(result.message);
          setMessages(priorMessages);
          setDraft(trimmed);
          return;
        }

        setMessages((current) => [
          ...current,
          {
            id: createMessageId(),
            role: "agent",
            content: result.reply,
          },
        ]);
      } finally {
        setIsSending(false);
        textareaRef.current?.focus();
      }
    },
    [
      agentName,
      channel,
      communicationStyle,
      disabled,
      goal,
      isSending,
      language,
      messages,
      model,
      provider,
      systemPrompt,
    ],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(draft);
    }
  }

  const isComposerDisabled = disabled || isSending;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 overflow-hidden bg-background lg:flex-row",
        className,
      )}
    >
      <aside className="flex shrink-0 flex-col gap-4 border-b border-border bg-muted/30 p-4 lg:w-[min(20rem,30%)] lg:border-b-0 lg:border-r">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium">{agentName}</p>
          <p className="text-xs text-muted-foreground">
            {goalConfig?.label ?? AI_ASSISTANT_MESSAGES.wizardStepTestAgent}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <AiAgentChannelIconRow channels={[channel]} size="sm" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            disabled={isComposerDisabled || messages.length === 0}
            onClick={handleClear}
          >
            <Trash2Icon className="size-3.5" />
            <span className="hidden sm:inline">
              {AI_ASSISTANT_MESSAGES.wizardStepTestClear}
            </span>
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.wizardStepTestStartersTitle}
          </p>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
            {starters.map((starter) => (
              <Button
                key={starter}
                type="button"
                variant="outline"
                size="sm"
                disabled={isComposerDisabled}
                className="h-auto min-h-9 max-w-full justify-start whitespace-normal px-3 py-2 text-left text-xs leading-snug"
                onClick={() => void sendMessage(starter)}
              >
                {starter}
              </Button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <div
          ref={scrollRef}
          className={cn(
            "min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-6",
            chatPaneClassName,
          )}
        >
          {messages.length === 0 && !isSending ? (
            <div className="flex h-full min-h-[8rem] items-center justify-center px-4 text-center text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.wizardStepTestEmpty}
            </div>
          ) : (
            messages.map((message) => (
              <WizardTestBubble
                key={message.id}
                message={message}
                agentName={agentName}
              />
            ))
          )}

          {isSending ? (
            <TypingIndicator
              label={AI_ASSISTANT_MESSAGES.wizardStepTestRunning}
              variant="outgoing"
            />
          ) : null}
        </div>

        <footer className={cn("shrink-0 p-3 md:px-6 md:py-3", chatHeaderClassName)}>
          <div
            className={cn(
              "flex items-end gap-2 px-3 py-2",
              chatComposerFieldClassName,
            )}
          >
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={AI_ASSISTANT_MESSAGES.wizardStepTestComposerPlaceholder}
              rows={1}
              disabled={isComposerDisabled}
              className={cn(
                "min-h-[24px] flex-1 resize-none overflow-y-auto border-0 bg-transparent p-0 shadow-none outline-none",
                "focus-visible:border-0 focus-visible:ring-0",
                "dark:bg-transparent dark:disabled:bg-transparent",
              )}
              style={{ maxHeight: TEXTAREA_MAX_HEIGHT_PX }}
            />
            <Button
              type="button"
              size="icon"
              className={cn("size-10 shrink-0 rounded-full", chatSendButtonClassName)}
              disabled={isComposerDisabled || !draft.trim()}
              aria-label={AI_ASSISTANT_MESSAGES.wizardStepTestSend}
              onClick={() => void sendMessage(draft)}
            >
              {isSending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
