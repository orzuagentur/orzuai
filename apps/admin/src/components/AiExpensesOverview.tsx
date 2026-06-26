import {
  ActivityIcon,
  BotIcon,
  ClockIcon,
  CoinsIcon,
  MessageSquareReplyIcon,
} from "lucide-react";

import { StatCard } from "@/components/StatCard";
import type { AiExpensesOverview } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

type AiExpensesOverviewProps = {
  data: AiExpensesOverview;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const PROVIDER_TONES: Record<string, string> = {
  gemini: "from-amber-500/10 to-orange-500/5 border-amber-500/20",
  openai: "from-emerald-500/10 to-teal-500/5 border-emerald-500/20",
  claude: "from-violet-500/10 to-purple-500/5 border-violet-500/20",
};

export function AiExpensesOverview({ data }: AiExpensesOverviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI расходы</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Аналитика по каждому AI API: расходы, ответы и активность за 30 дней
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Расход за месяц"
          value={formatUsd(data.totals.monthCostUsd)}
          hint={`Всего: ${formatUsd(data.totals.totalCostUsd)}`}
          icon={CoinsIcon}
          tone="warning"
        />
        <StatCard
          title="AI вызовов за месяц"
          value={formatNumber(data.totals.monthCalls)}
          hint={`Всего: ${formatNumber(data.totals.totalCalls)}`}
          icon={ActivityIcon}
        />
        <StatCard
          title="AI-ответов за месяц"
          value={formatNumber(data.totals.monthAutoReplies)}
          hint={`Всего: ${formatNumber(data.totals.totalAutoReplies)}`}
          icon={MessageSquareReplyIcon}
          tone="success"
        />
        <StatCard
          title="Провайдеров"
          value={formatNumber(data.providers.length)}
          hint="Gemini, OpenAI, Claude и др."
          icon={BotIcon}
          tone="info"
        />
      </section>

      {data.providers.length === 0 ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center text-muted-foreground">
          Пока нет данных по AI расходам
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {data.providers.map((provider) => (
            <article
              key={provider.provider}
              className={cn(
                "rounded-xl border bg-gradient-to-br p-5 shadow-sm",
                PROVIDER_TONES[provider.provider] ??
                  "from-muted/40 to-card border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{provider.label}</h2>
                  <p className="text-sm text-muted-foreground">
                    {provider.provider}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold">
                    {formatUsd(provider.monthCostUsd)}
                  </p>
                  <p className="text-xs text-muted-foreground">за месяц</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <InfoChip
                  label="Вызовов (мес.)"
                  value={formatNumber(provider.monthCalls)}
                />
                <InfoChip
                  label="AI-ответов (мес.)"
                  value={formatNumber(provider.monthAutoReplies)}
                />
                <InfoChip
                  label="Токены in/out"
                  value={`${formatNumber(provider.inputTokens)} / ${formatNumber(provider.outputTokens)}`}
                />
                <InfoChip
                  label="Расход всего"
                  value={formatUsd(provider.totalCostUsd)}
                />
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ClockIcon className="size-3.5" />
                Последняя активность: {formatDateTime(provider.lastActivityAt)}
              </div>

              {provider.dailyActivity.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Активность за 30 дней
                  </p>
                  <div className="flex h-16 items-end gap-1">
                    {provider.dailyActivity.map((day) => {
                      const maxCalls = Math.max(
                        ...provider.dailyActivity.map((entry) => entry.calls),
                        1,
                      );
                      const height = Math.max(
                        8,
                        Math.round((day.calls / maxCalls) * 100),
                      );

                      return (
                        <div
                          key={day.date}
                          title={`${day.date}: ${day.calls} вызовов, ${formatUsd(day.costUsd)}`}
                          className="flex-1 rounded-t bg-primary/70"
                          style={{ height: `${height}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/70 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
