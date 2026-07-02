"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HeadphonesIcon, Loader2Icon, SendIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformSupport } from "@/contexts/platform-support-context";
import {
  fetchTenantSupportThreadAction,
  sendTenantSupportMessageAction,
  type TenantSupportMessage,
} from "@/features/platform-support/actions";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 380;

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function PlatformSupportWidget() {
  const { isOpen, setIsOpen, setUnreadCount } = usePlatformSupport();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<TenantSupportMessage[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadThread = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchTenantSupportThreadAction();
    setIsLoading(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setMessages(result.messages);
    setUnreadCount(0);
  }, [setUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      void loadThread();
    }
  }, [isOpen, loadThread]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    const result = await sendTenantSupportMessageAction({ content: trimmed });
    setIsSending(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setContent("");
    await loadThread();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-xl border bg-background shadow-xl"
      style={{ width: PANEL_WIDTH, maxHeight: "min(640px, calc(100vh - 2rem))" }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <HeadphonesIcon className="size-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Поддержка OrzuX</p>
            <p className="text-xs text-muted-foreground">
              Ответ команды платформы
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setIsOpen(false)}
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Напишите нам — команда OrzuX ответит в этом окне.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                message.senderType === "business"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "mr-auto border bg-muted/40",
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  message.senderType === "business"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                {formatTime(message.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Ваш вопрос..."
            rows={2}
            className="min-h-[72px] resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0 self-end"
            disabled={isSending || !content.trim()}
            onClick={() => void handleSend()}
          >
            {isSending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
