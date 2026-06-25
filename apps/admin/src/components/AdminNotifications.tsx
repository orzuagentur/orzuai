"use client";

import { useEffect, useState, useTransition } from "react";
import { BellIcon, CircleIcon } from "lucide-react";

import { PRESENCE_HEARTBEAT_MS } from "@/features/team/presence";
import {
  fetchActivityFeedAction,
  markNotificationsReadAction,
} from "@/features/team/presence-actions";
import type {
  PlatformAdminActivityEvent,
  PlatformAdminNotification,
} from "@/features/team/types";
import { cn } from "@/lib/utils";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function activityLabel(event: PlatformAdminActivityEvent): string {
  switch (event.eventType) {
    case "login":
      return `${event.email} принял приглашение и вошёл`;
    case "logout":
      return `${event.email} вышел из админки`;
    case "online":
      return `${event.email} в сети в админке`;
    case "offline":
      return `${event.email} покинул админку`;
  }
}

function activityDotClass(eventType: PlatformAdminActivityEvent["eventType"]) {
  switch (eventType) {
    case "login":
    case "online":
      return "fill-emerald-500 text-emerald-500";
    case "logout":
    case "offline":
      return "fill-muted-foreground text-muted-foreground";
  }
}

export function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<PlatformAdminActivityEvent[]>([]);
  const [notifications, setNotifications] = useState<
    PlatformAdminNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [, startTransition] = useTransition();

  function loadFeed() {
    startTransition(async () => {
      try {
        const result = await fetchActivityFeedAction();
        setEvents(result.events);
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      } catch {
        // Ignore polling errors.
      }
    });
  }

  useEffect(() => {
    loadFeed();

    const intervalId = window.setInterval(loadFeed, PRESENCE_HEARTBEAT_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  async function handleToggle() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen && unreadCount > 0) {
      await markNotificationsReadAction();
      setUnreadCount(0);
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
    }
  }

  const feedItems = [
    ...notifications.map((item) => ({
      id: `n-${item.id}`,
      createdAt: item.createdAt,
      label: item.title,
      detail: item.body,
      dotClass: item.readAt
        ? "fill-muted-foreground text-muted-foreground"
        : "fill-amber-500 text-amber-500",
      unread: !item.readAt,
    })),
    ...events.map((item) => ({
      id: `e-${item.id}`,
      createdAt: item.createdAt,
      label: activityLabel(item),
      detail: null as string | null,
      dotClass: activityDotClass(item.eventType),
      unread: false,
    })),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  return (
    <div className="relative mt-auto border-t p-2">
      <button
        type="button"
        onClick={() => void handleToggle()}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span className="relative">
          <BellIcon className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </span>
        Уведомления
      </button>

      {open ? (
        <div className="absolute bottom-full left-2 right-2 z-30 mb-2 max-h-80 overflow-y-auto rounded-xl border bg-card p-2 shadow-lg md:left-0 md:right-auto md:w-72">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Активность администраторов
          </p>

          {feedItems.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              Пока нет событий
            </p>
          ) : (
            <ul className="space-y-1">
              {feedItems.slice(0, 30).map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-lg px-2 py-2 text-sm",
                    item.unread ? "bg-amber-500/10" : "hover:bg-muted/60",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <CircleIcon
                      className={cn("mt-1 size-2 shrink-0", item.dotClass)}
                    />
                    <div className="min-w-0">
                      <p className="leading-snug">{item.label}</p>
                      {item.detail ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.detail}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
