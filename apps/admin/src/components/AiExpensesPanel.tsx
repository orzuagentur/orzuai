"use client";

import { useState, useTransition } from "react";
import {
  ActivityIcon,
  AudioLinesIcon,
  BotIcon,
  ClockIcon,
  CoinsIcon,
  MessageSquareReplyIcon,
  MicIcon,
} from "lucide-react";

import { StatCard } from "@/components/StatCard";
import { fetchAiExpensesAction } from "@/features/dashboard/actions";
import { ANALYTICS_PERIODS } from "@/features/dashboard/period";
import type { AiExpensesOverview } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

type AiExpensesPanelProps = {
  initialData: AiExpensesOverview;
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
  elevenlabs: "from-rose-500/10 to-pink-500/5 border-rose-500/20",
};

export function AiExpensesPanel({ initialData }: AiExpensesPanelProps) {
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState(initialData.period);
  const [isPending, startTransition] = useTransition();

  function handlePeriodChange(nextPeriod: string) {
    setPeriod(nextPeriod as typeof period);

    startTransition(async () => {
      const nextData = await fetchAiExpensesAction(nextPeriod);
      setData(nextData);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI расходы</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Реальные данные из `ai_usage_logs` по всем провайдерам платформы
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Период</span>
          <select
            value={period}
            disabled={isPending}
            onChange={(event) => handlePeriodChange(event.target.value)}
            className="min-w-[180px] rounded-lg border bg-background px-3 py-2"
          >
            {ANALYTICS_PERIODS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={`Расход за ${data.periodLabel.toLowerCase()}`}
          value={formatUsd(data.totals.periodCostUsd)}
          hint={`Всего: ${formatUsd(data.totals.allTimeCostUsd)}`}
          icon={CoinsIcon}
          tone="warning"
        />
        <StatCard
          title="AI вызовов"
          value={formatNumber(data.totals.periodCalls)}
          hint={`За период: ${data.periodLabel.toLowerCase()}`}
          icon={ActivityIcon}
        />
        <StatCard
          title="AI-ответов"
          value={formatNumber(data.totals.periodAutoReplies)}
          hint="call_type = auto_reply"
          icon={MessageSquareReplyIcon}
          tone="success"
        />
        <StatCard
          title="Голос → текст (STT)"
          value={formatUsd(data.totals.periodVoiceSttCostUsd)}
          hint={`${formatNumber(data.totals.periodVoiceSttCalls)} транскрипций · OpenAI Whisper`}
          icon={MicIcon}
          tone="info"
        />
        <StatCard
          title="Текст → голос (TTS)"
          value={formatUsd(data.totals.periodVoiceTtsCostUsd)}
          hint={`${formatNumber(data.totals.periodVoiceTtsCalls)} синтезов · ElevenLabs`}
          icon={AudioLinesIcon}
          tone="info"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {data.voiceModes.map((mode) => (
          <article
            key={mode.mode}
            className={cn(
              "rounded-xl border bg-card p-5 shadow-sm",
              mode.mode === "stt"
                ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-card"
                : "border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-card",
            )}
          >
            <p className="text-sm text-muted-foreground">{mode.label}</p>
            <h2 className="mt-1 text-lg font-semibold">{mode.providerLabel}</h2>
            <p className="mt-3 text-2xl font-semibold">
              {formatUsd(mode.periodCostUsd)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatNumber(mode.periodCalls)} вызовов за{" "}
              {data.periodLabel.toLowerCase()}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {data.providers.map((provider) => (
          <article
            key={provider.provider}
            className={cn(
              "rounded-xl border bg-gradient-to-br p-5 shadow-sm",
              PROVIDER_TONES[provider.provider] ??
                "border-border from-muted/40 to-card",
              !provider.hasActivity && "opacity-80",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{provider.label}</h2>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      provider.hasActivity
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {provider.hasActivity ? "Активен" : "Нет данных"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {provider.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold">
                  {formatUsd(provider.periodCostUsd)}
                </p>
                <p className="text-xs text-muted-foreground">
                  за {data.periodLabel.toLowerCase()}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <InfoChip
                label="Вызовов за период"
                value={formatNumber(provider.periodCalls)}
              />
              <InfoChip
                label="AI-ответов"
                value={formatNumber(provider.periodAutoReplies)}
              />
              <InfoChip
                label="Голос → текст (STT)"
                value={`${formatNumber(provider.periodVoiceSttCalls)} · ${formatUsd(provider.periodVoiceSttCostUsd)}`}
              />
              <InfoChip
                label="Текст → голос (TTS)"
                value={`${formatNumber(provider.periodVoiceTtsCalls)} · ${formatUsd(provider.periodVoiceTtsCostUsd)}`}
              />
              <InfoChip
                label="Расход всего"
                value={formatUsd(provider.allTimeCostUsd)}
              />
              <InfoChip
                label="Токены in"
                value={formatNumber(provider.inputTokens)}
              />
              <InfoChip
                label="Токены out"
                value={formatNumber(provider.outputTokens)}
              />
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" />
              Последняя активность: {formatDateTime(provider.lastActivityAt)}
            </div>

            {provider.dailyActivity.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Активность по дням
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
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                За выбранный период активности нет
              </p>
            )}
          </article>
        ))}
      </section>

      <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <BotIcon className="size-4" />
          <p>
            Показаны все провайдеры с разбивкой STT (Whisper) и TTS (ElevenLabs).
            Суммы из `estimated_cost_usd` в базе данных.
          </p>
        </div>
      </div>
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
