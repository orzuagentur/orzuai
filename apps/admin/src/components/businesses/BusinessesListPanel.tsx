"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Building2Icon,
  MessageSquareIcon,
  PhoneIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchBusinessesAction } from "@/features/businesses/actions";
import type { BusinessListItem } from "@/features/businesses/types";
import {
  accountStatusLabel,
  planLabel,
} from "@/features/businesses/types";
import { formatAdminDateTime } from "@/lib/format-datetime";

function statusTone(
  status: string,
): "success" | "warning" | "danger" | "default" {
  if (status === "active") return "success";
  if (status === "suspended") return "danger";
  if (status === "readonly") return "warning";
  return "default";
}

export function BusinessesListPanel() {
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchBusinessesAction({
        query,
        plan: planFilter || undefined,
        status: statusFilter
          ? (statusFilter as "active" | "suspended" | "readonly")
          : undefined,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setBusinesses(result.businesses);
    });
  }, [planFilter, query, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    return businesses.reduce(
      (acc, business) => {
        acc.count += 1;
        acc.aiCost += business.stats.aiCostUsd30d;
        acc.messages += business.stats.messages30d;
        if (business.controls?.accountStatus === "suspended") {
          acc.suspended += 1;
        }
        return acc;
      },
      { count: 0, aiCost: 0, messages: 0, suspended: 0 },
    );
  }, [businesses]);

  return (
    <div>
      <PageHeader
        title="Бизнесы"
        description="Все аккаунты платформы: аналитика, расходы AI, каналы, управление функциями и поддержка."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Аккаунтов"
          value={String(totals.count)}
          icon={Building2Icon}
        />
        <StatCard
          title="AI расход 30д"
          value={`$${totals.aiCost.toFixed(2)}`}
          icon={SparklesIcon}
          tone="info"
        />
        <StatCard
          title="Сообщений 30д"
          value={String(totals.messages)}
          icon={MessageSquareIcon}
        />
        <StatCard
          title="Приостановлено"
          value={String(totals.suspended)}
          icon={PhoneIcon}
          tone={totals.suspended > 0 ? "warning" : "default"}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") load();
            }}
            placeholder="Поиск по названию, email, телефону…"
            className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-primary/20 focus:ring-2"
          />
        </label>
        <select
          value={planFilter}
          onChange={(event) => setPlanFilter(event.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="">Все тарифы</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="agency">Agency</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="">Все статусы</option>
          <option value="active">Активен</option>
          <option value="suspended">Приостановлен</option>
          <option value="readonly">Только чтение</option>
        </select>
        <button
          type="button"
          onClick={load}
          disabled={isPending}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? "Загрузка…" : "Обновить"}
        </button>
      </div>

      {businesses.length === 0 && !isPending ? (
        <EmptyState
          title="Бизнесы не найдены"
          description="Измените фильтры или дождитесь регистрации новых аккаунтов."
          icon={Building2Icon}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {businesses.map((business) => (
            <Link
              key={business.id}
              href={`/businesses/${business.id}`}
              className="group rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold group-hover:text-primary">
                    {business.businessName}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {business.ownerEmail ?? business.email ?? "—"}
                  </p>
                </div>
                <StatusBadge
                  label={accountStatusLabel(
                    business.controls?.accountStatus ?? "active",
                  )}
                  tone={statusTone(business.controls?.accountStatus ?? "active")}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={planLabel(business.subscriptionPlan)} tone="info" />
                <StatusBadge label={business.subscriptionStatus} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">
                    {business.stats.messages30d}
                  </p>
                  <p>сообщений 30д</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    ${business.stats.aiCostUsd30d.toFixed(2)}
                  </p>
                  <p>AI 30д</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {business.stats.connectedChannels}
                  </p>
                  <p>каналов</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {business.stats.voiceCalls30d}
                  </p>
                  <p>звонков 30д</p>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground">
                Создан {formatAdminDateTime(business.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
