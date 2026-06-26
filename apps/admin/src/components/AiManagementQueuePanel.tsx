"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  Loader2Icon,
  SaveIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { saveAiProviderQueueAction } from "@/features/ai-management/actions";
import {
  AI_PROVIDERS,
  getProviderLabel,
  type AiProvider,
} from "@/features/ai-management/providers";
import type { AiProviderQueueItem } from "@/features/ai-management/types";
import { cn } from "@/lib/utils";

type AiManagementQueuePanelProps = {
  initialQueue: AiProviderQueueItem[];
};

export function AiManagementQueuePanel({
  initialQueue,
}: AiManagementQueuePanelProps) {
  const [queue, setQueue] = useState(
    initialQueue.map((item) => item.provider),
  );
  const [isPending, startTransition] = useTransition();

  const queueMeta = useMemo(() => {
    const byProvider = new Map(
      initialQueue.map((item) => [item.provider, item]),
    );

    return queue.map((provider, index) => ({
      provider,
      position: index + 1,
      configured: byProvider.get(provider)?.configured ?? false,
    }));
  }, [initialQueue, queue]);

  function moveProvider(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= queue.length) {
      return;
    }

    setQueue((current) => {
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  function toggleProvider(provider: AiProvider) {
    setQueue((current) => {
      if (current.includes(provider)) {
        if (current.length === 1) {
          toast.error("В очереди должен остаться хотя бы один провайдер.");
          return current;
        }

        return current.filter((entry) => entry !== provider);
      }

      return [...current, provider];
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveAiProviderQueueAction({ providers: queue });

      if (!result.success) {
        toast.error(result.message ?? "Не удалось сохранить очередь.");
        return;
      }

      toast.success("Очередь LLM сохранена. Применяется ко всем клиентам.");
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Очередь LLM-провайдеров</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Порядок fallback для всех бизнесов. Первый настроенный ключ в списке
          используется первым; при ошибке — следующий.
        </p>

        <ol className="mt-4 space-y-2">
          {queueMeta.map((item, index) => (
            <li
              key={item.provider}
              className="flex flex-wrap items-center gap-2 rounded-xl border bg-background px-3 py-3"
            >
              <GripVerticalIcon className="size-4 text-muted-foreground" />
              <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {item.position}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{getProviderLabel(item.provider)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.configured
                    ? "API ключ настроен"
                    : "Ключ не найден в API ключах"}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50"
                  disabled={index === 0 || isPending}
                  onClick={() => moveProvider(index, -1)}
                  aria-label="Выше"
                >
                  <ArrowUpIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50"
                  disabled={index === queue.length - 1 || isPending}
                  onClick={() => moveProvider(index, 1)}
                  aria-label="Ниже"
                >
                  <ArrowDownIcon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap gap-2">
          {AI_PROVIDERS.map((provider) => {
            const selected = queue.includes(provider);

            return (
              <button
                key={provider}
                type="button"
                disabled={isPending}
                onClick={() => toggleProvider(provider)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {getProviderLabel(provider)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SaveIcon className="size-4" />
            )}
            Сохранить очередь
          </button>
          <Link
            href="/settings/secrets"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Открыть API ключи
          </Link>
        </div>
      </section>
    </div>
  );
}
