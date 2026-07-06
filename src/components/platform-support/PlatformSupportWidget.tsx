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
} from "@/features/platform-support/actions";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 480;

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function PlatformSupportWidget() {
  const {
    isOpen,
    setIsOpen,
    setUnreadCount,
    messages,
    setMessages,
    threadId,
    setThreadId,
    threadLoaded,
    setThreadLoaded,
  } = usePlatformSupport();
  const scrollRef = useRef<HTMLDivElement>(null);
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

    setThreadId(result.threadId);
    setMessages(result.messages);
    setThreadLoaded(true);
    setUnreadCount(0);
  }, [setMessages, setThreadId, setThreadLoaded, setUnreadCount]);

  useEffect(() => {
    if (!threadLoaded) {
      void loadThread();
    }
  }, [loadThread, threadLoaded]);

  useEffect(() => {
    if (isOpen && !threadLoaded) {
      void loadThread();
    }
  }, [isOpen, loadThread, threadLoaded]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  useEffect(() => {
    const supabase = createClientIfConfigured();

    if (!supabase || !threadId) {
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const authed = await waitForSupabaseRealtime(supabase);

      if (cancelled || !authed) {
        return;
      }

      channel = supabase
        .channel(`platform-support-${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "platform_support_messages",
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              sender_type: "platform" | "business";
              content: string;
              created_at: string;
            };

            setMessages((current) => {
              if (current.some((message) => message.id === row.id)) {
                return current;
              }

              return [
                ...current,
                {
                  id: row.id,
                  senderType: row.sender_type,
                  content: row.content,
                  createdAt: row.created_at,
                },
              ];
            });

            if (row.sender_type === "platform" && !isOpen) {
              setUnreadCount((count) => count + 1);
            }
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [isOpen, setMessages, setUnreadCount, threadId]);

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
      className="fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
      style={{
        width: PANEL_WIDTH,
        maxWidth: "calc(100vw - 2rem)",
        height: "min(720px, calc(100vh - 2rem))",
      }}
    >
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <HeadphonesIcon className="size-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Поддержка OrzuX</p>
            <p className="text-xs text-muted-foreground">
              История сохраняется в вашем аккаунте
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

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Напишите нам — команда OrzuX ответит в этом окне. Переписка сохранится
            после закрытия.
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

      <div className="shrink-0 border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Ваш вопрос..."
            rows={3}
            className="min-h-[88px] resize-none"
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
