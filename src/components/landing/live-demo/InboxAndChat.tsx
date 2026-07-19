"use client";

import { motion } from "framer-motion";
import { CalendarDaysIcon, SendIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { useNestedScrollPassthrough } from "@/hooks/use-nested-scroll-passthrough";
import type { LandingLiveEvent, LiveSystemView } from "@/features/landing/demo";
import {
  getChatBubbleClassName,
  getChatComposerFieldClassName,
  getChatComposerShellClassName,
  getChatHeaderClassName,
  getChatPaneClassName,
  getChatSendButtonClassName,
  isEmailChatChannel,
} from "@/features/chats/chat-theme";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";

type LeftMenuProps = {
  events: LandingLiveEvent[];
  activeId: string;
  activeView: LiveSystemView;
  onSelect: (id: string) => void;
  onOpenCalendar: () => void;
  compact?: boolean;
};

export function LeftMenu({
  events,
  activeId,
  activeView,
  onSelect,
  onOpenCalendar,
  compact = false,
}: LeftMenuProps) {
  const { copy } = useLandingLocale();
  const listRef = useRef<HTMLDivElement>(null);
  useNestedScrollPassthrough(listRef);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col bg-zinc-50/90",
        compact
          ? "border-r border-zinc-200/80"
          : "border-b border-zinc-200/80 lg:border-b-0 lg:border-r",
      )}
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {copy.liveDemo.inbox}
        </p>
        <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200/80">
          {events.length + 1}
        </span>
      </div>

      <div ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-auto px-2 py-2">
        <div className="grid gap-1">
          {events.map((event) => {
            const active = activeId === event.id && activeView !== "calendar";

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelect(event.id)}
                className={cn(
                  "rounded-lg border bg-white p-2 text-left transition",
                  active
                    ? "border-zinc-300 shadow-[inset_3px_0_0_#18181b]"
                    : "border-zinc-200/70 hover:border-zinc-300",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 ring-1 ring-zinc-200/80">
                    <ChannelBrandIcon channel={event.channel} className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-zinc-900">
                      {event.customer}
                    </span>
                    <span className="block truncate text-[10px] text-zinc-500">
                      {event.label}
                    </span>
                  </span>
                </span>
                <span className={cn("mt-1.5 line-clamp-2 block leading-4 text-zinc-600", compact ? "text-[9px]" : "text-[11px]")}>
                  {event.preview}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenCalendar}
            className={cn(
              "rounded-lg border bg-white p-2 text-left transition",
              activeView === "calendar"
                ? "border-zinc-300 shadow-[inset_3px_0_0_#18181b]"
                : "border-zinc-200/70 hover:border-zinc-300",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 ring-1 ring-zinc-200/80">
                <CalendarDaysIcon className="size-3.5 text-zinc-700" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-zinc-900">
                  {copy.liveDemo.calendar}
                </span>
                <span className="block truncate text-[10px] text-zinc-500">
                  {copy.liveDemo.calendarListHint}
                </span>
              </span>
            </span>
            <span className="mt-1.5 line-clamp-2 block text-[11px] leading-4 text-zinc-600">
              {copy.liveDemo.calendarListPreview}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

type ConversationStageProps = {
  event: LandingLiveEvent;
  messages: LandingLiveEvent["messages"];
};

export function ConversationStage({ event, messages, compact = false }: ConversationStageProps & { compact?: boolean }) {
  const { copy } = useLandingLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  useNestedScrollPassthrough(scrollRef);
  const channel = toMessagingChannel(event.channel);
  const isEmail = isEmailChatChannel(channel);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, event.id]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      {!compact ? (
      <div className={cn("flex shrink-0 items-center justify-between gap-3 px-4 py-2.5", getChatHeaderClassName(channel))}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/80 ring-1 ring-black/5">
            <ChannelBrandIcon channel={event.channel} className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{event.customer}</h2>
            <p className="truncate text-[11px] opacity-70">
              {isEmail ? event.preview : event.label}
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-medium opacity-80 sm:inline">
          {event.metric}
        </span>
      </div>
      ) : null}

      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-auto px-3 py-3 sm:px-4",
          getChatPaneClassName(channel),
        )}
      >
        {messages.map((message, index) => {
          const isAi = message.role === "ai";
          const isSystem = message.role === "system";

          if (isSystem) {
            return (
              <motion.div
                key={`${event.id}-sys-${index}-${message.text.slice(0, 20)}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mx-auto max-w-[92%] rounded-md px-3 py-1.5 text-center text-[10px] font-medium",
                  channel === "telegram"
                    ? "bg-white/10 text-[#7f91a4]"
                    : "bg-black/[0.06] text-zinc-600",
                )}
              >
                {message.text}
              </motion.div>
            );
          }

          if (isEmail) {
            return (
              <motion.article
                key={`${event.id}-${index}-${message.text.slice(0, 20)}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={cn(
                  getChatBubbleClassName({
                    isOutgoing: isAi,
                    channel,
                  }),
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-black/5 pb-2">
                  <p className="text-[12px] font-semibold text-zinc-800">
                    {isAi ? copy.liveDemo.aiResponse : event.customer}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {isAi ? "OrzuX" : event.label}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-6 text-zinc-800">
                  {message.text}
                </p>
              </motion.article>
            );
          }

          return (
            <motion.div
              key={`${event.id}-${index}-${message.text.slice(0, 20)}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={cn(
                "flex",
                isAi ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  getChatBubbleClassName({
                    isOutgoing: isAi,
                    channel,
                  }),
                )}
              >
                <p className="whitespace-pre-wrap text-[13px] leading-5">{message.text}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className={cn("shrink-0 px-3 py-2.5", getChatComposerShellClassName(channel))}>
        {isEmail ? (
          <div className="space-y-2">
            <div className={cn("px-3 py-2", getChatComposerFieldClassName(channel))}>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {copy.liveDemo.emailSubjectLabel}
              </p>
              <p className="truncate text-[13px] text-zinc-700">Re: {event.deal}</p>
            </div>
            <div className="flex items-end gap-2">
              <div className={cn("min-h-[72px] flex-1 px-3 py-2", getChatComposerFieldClassName(channel))}>
                <p className="text-[13px] text-zinc-400">{copy.liveDemo.emailBodyPlaceholder}</p>
              </div>
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-semibold",
                  getChatSendButtonClassName(channel),
                )}
              >
                {copy.liveDemo.emailSendAction}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex min-h-10 flex-1 items-center px-3 text-[13px]",
                channel === "telegram" ? "text-[#7f91a4]" : "text-zinc-400",
                getChatComposerFieldClassName(channel),
              )}
            >
              {copy.liveDemo.messagePlaceholder}
            </div>
            <button
              type="button"
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
                getChatSendButtonClassName(channel),
              )}
              aria-label={copy.liveDemo.sendMessage}
            >
              <SendIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function toMessagingChannel(
  channel: LandingLiveEvent["channel"],
): MessagingChannel {
  if (channel === "voice") return "whatsapp";
  return channel;
}
