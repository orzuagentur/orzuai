import {
  BotIcon,
  Building2Icon,
  CableIcon,
  CreditCardIcon,
  MessageSquareIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import { StatCard } from "@/components/StatCard";
import type { PlatformDashboardMetrics } from "@/features/dashboard/types";

type DashboardOverviewProps = {
  metrics: PlatformDashboardMetrics;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function DashboardOverview({ metrics }: DashboardOverviewProps) {
  const activePlans = metrics.subscriptions.byPlan.filter(
    (plan) => plan.count > 0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Общая аналитика платформы OrzuX: пользователи, каналы, сообщения и
          подписки
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Пользователи"
          value={formatNumber(metrics.users.total)}
          hint={`+${formatNumber(metrics.users.newThisMonth)} за месяц`}
          icon={UsersIcon}
          tone="info"
        />
        <StatCard
          title="Бизнесы"
          value={formatNumber(metrics.businesses.total)}
          hint={`${formatNumber(metrics.businesses.activeSubscriptions)} активных подписок`}
          icon={Building2Icon}
        />
        <StatCard
          title="Контакты"
          value={formatNumber(metrics.contacts.total)}
          hint={`+${formatNumber(metrics.contacts.newThisMonth)} за месяц`}
          icon={UsersIcon}
          tone="success"
        />
        <StatCard
          title="Подключённые каналы"
          value={formatNumber(metrics.channels.totalConnected)}
          hint="WhatsApp, Instagram, Telegram, Email, формы"
          icon={CableIcon}
          tone="warning"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareIcon className="size-4 text-primary" />
            <h2 className="font-semibold">Сообщения платформы</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricRow
              label="Всего сообщений"
              value={formatNumber(metrics.messaging.totalMessages)}
            />
            <MetricRow
              label="За этот месяц"
              value={formatNumber(metrics.messaging.monthMessages)}
            />
            <MetricRow
              label="AI-ответов всего"
              value={formatNumber(metrics.messaging.aiReplies)}
            />
            <MetricRow
              label="AI-ответов за месяц"
              value={formatNumber(metrics.messaging.monthAiReplies)}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            <h2 className="font-semibold">AI расход платформы</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricRow
              label="Расход всего"
              value={formatUsd(metrics.ai.totalCostUsd)}
            />
            <MetricRow
              label="Расход за месяц"
              value={formatUsd(metrics.ai.monthCostUsd)}
            />
            <MetricRow
              label="AI вызовов"
              value={formatNumber(metrics.ai.totalCalls)}
            />
            <MetricRow
              label="На платформенном биллинге"
              value={formatNumber(metrics.ai.platformBillingCalls)}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CreditCardIcon className="size-4 text-primary" />
            <h2 className="font-semibold">Подписки и доход</h2>
          </div>
          <p className="mb-4 text-3xl font-semibold">
            {formatUsd(metrics.subscriptions.estimatedMrrUsd)}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              оценка MRR
            </span>
          </p>
          <div className="space-y-2">
            {activePlans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет активных планов</p>
            ) : (
              activePlans.map((plan) => (
                <div
                  key={plan.plan}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <span>
                    {plan.label}{" "}
                    <span className="text-muted-foreground">
                      ({formatNumber(plan.count)})
                    </span>
                  </span>
                  <span className="font-medium">{formatUsd(plan.revenueUsd)}</span>
                </div>
              ))
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Stripe подключён у {formatNumber(metrics.businesses.withStripe)}{" "}
            бизнесов
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BotIcon className="size-4 text-primary" />
            <h2 className="font-semibold">Каналы по типам</h2>
          </div>
          <div className="space-y-2">
            {metrics.channels.byChannel.map((channel) => (
              <div
                key={channel.channel}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <span>{channel.label}</span>
                <span className="font-medium">
                  {formatNumber(channel.connected)} подключено
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <WalletIcon className="size-4" />
          <p>
            Данные агрегируются по всей платформе. MRR — оценка по тарифам
            (Free $0, Starter $29, Pro $99, Agency $299).
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
