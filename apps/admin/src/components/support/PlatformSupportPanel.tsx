"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Building2Icon, SendIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchSupportMessagesAction,
  fetchSupportThreadsAction,
  draftSupportReplyAction,
  sendSupportMessageAction,
  type SupportMessageItem,
  type SupportThreadListItem,
} from "@/features/support/actions";
import { formatAdminDateTime } from "@/lib/format-datetime";

type PlatformSupportPanelProps = {
  initialThreadId?: string | null;
};

export function PlatformSupportPanel({ initialThreadId }: PlatformSupportPanelProps) {
  const [threads, setThreads] = useState<SupportThreadListItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreadId ?? null,
  );
  const [messages, setMessages] = useState<SupportMessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadThreads = useCallback(() => {
    startTransition(async () => {
      const result = await fetchSupportThreadsAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setThreads(result.threads);
    });
  }, []);

  const loadMessages = useCallback((threadId: string) => {
    startTransition(async () => {
      const result = await fetchSupportMessagesAction(threadId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setMessages(result.messages);
    });
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (initialThreadId) {
      setSelectedThreadId(initialThreadId);
    }
  }, [initialThreadId]);

  useEffect(() => {
    if (selectedThreadId) {
      loadMessages(selectedThreadId);
    }
  }, [loadMessages, selectedThreadId]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.threadId === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );

  const sendMessage = () => {
    if (!selectedThreadId || !draft.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await sendSupportMessageAction({
        threadId: selectedThreadId,
        content: draft.trim(),
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setDraft("");
      loadMessages(selectedThreadId);
      loadThreads();
    });
  };

  const generateDraft = () => {
    if (!selectedThreadId) {
      return;
    }

    startTransition(async () => {
      const result = await draftSupportReplyAction({ threadId: selectedThreadId });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setDraft(result.draft);
      toast.success("Черновик сгенерирован");
    });
  };

  return (
    <div>
      <PageHeader
        title="Поддержка OrzuX"
        description="Прямой канал между командой платформы и владельцами бизнесов. Phase 2: виджет в dashboard клиента."
      />

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SectionCard title="Диалоги" description={`${threads.length} активных`}>
          {threads.length === 0 ? (
            <EmptyState
              title="Диалогов пока нет"
              description="Откройте чат из карточки бизнеса — «Поддержка»."
              icon={Building2Icon}
              className="py-8"
            />
          ) : (
            <ul className="max-h-[560px] space-y-2 overflow-y-auto">
              {threads.map((thread) => {
                const isActive = thread.threadId === selectedThreadId;
                return (
                  <li key={thread.threadId}>
                    <button
                      type="button"
                      onClick={() => setSelectedThreadId(thread.threadId)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-primary/40 bg-primary/5"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {thread.businessName}
                        </p>
                        {thread.unreadByPlatform > 0 ? (
                          <StatusBadge
                            label={String(thread.unreadByPlatform)}
                            tone="info"
                          />
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {thread.preview ?? "Нет сообщений"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatAdminDateTime(thread.lastMessageAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={selectedThread?.businessName ?? "Выберите диалог"}
          description={selectedThread?.ownerEmail ?? "Сообщения видны команде OrzuX"}
          actions={
            selectedThread ? (
              <Link
                href={`/businesses/${selectedThread.businessId}`}
                className="text-xs text-primary hover:underline"
              >
                Карточка бизнеса
              </Link>
            ) : null
          }
        >
          {!selectedThreadId ? (
            <EmptyState
              title="Выберите диалог слева"
              description="Или откройте поддержку из раздела «Бизнесы»."
            />
          ) : (
            <div className="flex min-h-[420px] flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Напишите первое сообщение клиенту.
                  </p>
                ) : (
                  messages.map((message) => {
                    const isPlatform = message.senderType === "platform";
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isPlatform ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            isPlatform
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              isPlatform
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatAdminDateTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isPending || messages.length === 0}
                    onClick={generateDraft}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    <SparklesIcon className="size-3.5" />
                    AI черновик
                  </button>
                </div>
                <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={2}
                  placeholder="Сообщение от команды OrzuX…"
                  className="min-h-20 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={isPending || !draft.trim()}
                  onClick={sendMessage}
                  className="inline-flex h-10 items-center gap-2 self-end rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  <SendIcon className="size-4" />
                  Отправить
                </button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
