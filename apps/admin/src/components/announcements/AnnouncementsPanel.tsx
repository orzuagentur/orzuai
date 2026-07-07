"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { SectionCard } from "@/components/ui/SectionCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  fetchAnnouncementsAction,
  resendAnnouncementPushAction,
  toggleAnnouncementAction,
  type AnnouncementListItem,
} from "@/features/announcements/actions";
import { formatAdminDateTime } from "@/lib/format-datetime";

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Все бизнесы",
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
  business_ids: "Выбранные ID",
};

export function AnnouncementsPanel() {
  const [items, setItems] = useState<AnnouncementListItem[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">(
    "info",
  );
  const [targetAudience, setTargetAudience] = useState("all");
  const [sendPush, setSendPush] = useState(true);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchAnnouncementsAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setItems(result.items);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createAnnouncementAction({
        title,
        body,
        severity,
        targetAudience: targetAudience as
          | "all"
          | "free"
          | "starter"
          | "pro"
          | "agency"
          | "business_ids",
        sendPush,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Объявление опубликовано");
      setTitle("");
      setBody("");
      load();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Уведомления"
        description="Broadcast-сообщения для клиентов в панели OrzuX"
      />

      <SectionCard title="Новое объявление" description="Показывается вверху dashboard">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1 md:col-span-2">
            <span className="text-sm font-medium">Заголовок</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Технические работы"
            />
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-sm font-medium">Текст</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Сегодня с 22:00 возможны кратковременные перебои..."
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Важность</span>
            <select
              value={severity}
              onChange={(event) =>
                setSeverity(event.target.value as "info" | "warning" | "critical")
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Аудитория</span>
            <select
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={sendPush}
              onChange={(event) => setSendPush(event.target.checked)}
              className="size-4 accent-primary"
            />
            Отправить push-уведомление подписанным устройствам
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={isPending || !title.trim() || !body.trim()}
            onClick={handleCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Опубликовать
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Активные и прошлые" description={`Всего: ${items.length}`}>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Объявлений пока нет.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <StatusBadge
                        label={item.isActive ? "Активно" : "Выключено"}
                        tone={item.isActive ? "success" : "default"}
                      />
                      <StatusBadge label={item.severity} tone="info" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {AUDIENCE_LABELS[item.targetAudience] ?? item.targetAudience} ·{" "}
                      {formatAdminDateTime(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.isActive ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            const result = await resendAnnouncementPushAction({
                              announcementId: item.id,
                            });
                            if (!result.success) {
                              toast.error(result.message);
                              return;
                            }
                            toast.success("Push отправлен подписанным устройствам");
                          });
                        }}
                        className="rounded-lg border px-3 py-1.5 text-xs"
                      >
                        Push
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const enabling = !item.isActive;
                          const result = await toggleAnnouncementAction({
                            announcementId: item.id,
                            isActive: enabling,
                            sendPush: enabling ? sendPush : undefined,
                          });
                          if (!result.success) {
                            toast.error(result.message);
                            return;
                          }
                          load();
                        });
                      }}
                      className="rounded-lg border px-3 py-1.5 text-xs"
                    >
                      {item.isActive ? "Выключить" : "Включить"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteAnnouncementAction({
                            announcementId: item.id,
                          });
                          if (!result.success) {
                            toast.error(result.message);
                            return;
                          }
                          toast.success("Удалено");
                          load();
                        });
                      }}
                      className="rounded-lg border px-2 py-1.5 text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
