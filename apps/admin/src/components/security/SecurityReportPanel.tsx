import type { LucideIcon } from "lucide-react";
import {
  BotIcon,
  DatabaseIcon,
  FileLockIcon,
  KeyRoundIcon,
  LightbulbIcon,
  ServerIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  WebhookIcon,
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  SECURITY_CATEGORIES,
  SECURITY_RECOMMENDATIONS,
  SECURITY_REPORT_INTRO,
  SECURITY_STATUS_LABEL,
  summarizeSecurity,
  type SecurityStatus,
} from "@/features/security/report";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  encryption: KeyRoundIcon,
  auth: UserCheckIcon,
  webhooks: WebhookIcon,
  bots: BotIcon,
  storage: DatabaseIcon,
  data: FileLockIcon,
  infra: ServerIcon,
};

const STATUS_TONE: Record<SecurityStatus, "success" | "info" | "warning"> = {
  active: "success",
  configurable: "info",
  recommended: "warning",
};

export function SecurityReportPanel() {
  const summary = summarizeSecurity(SECURITY_CATEGORIES);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Безопасность"
        description={SECURITY_REPORT_INTRO}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {summary.active}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Активных механизмов защиты
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-semibold text-sky-600 dark:text-sky-400">
            {summary.configurable}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Реализовано, включается настройкой
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {SECURITY_RECOMMENDATIONS.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Рекомендаций к усилению
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {SECURITY_CATEGORIES.map((category) => (
          <SectionCard
            key={category.id}
            title={category.title}
            description={category.description}
            icon={CATEGORY_ICONS[category.id] ?? ShieldCheckIcon}
          >
            <div className="space-y-4">
              {category.controls.map((control) => (
                <div
                  key={control.name}
                  className="rounded-lg border bg-background/50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold">{control.name}</h3>
                    <StatusBadge
                      label={SECURITY_STATUS_LABEL[control.status]}
                      tone={STATUS_TONE[control.status]}
                    />
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                      <dt className="shrink-0 font-medium text-muted-foreground sm:w-24">
                        Для чего
                      </dt>
                      <dd className="text-foreground">{control.purpose}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                      <dt className="shrink-0 font-medium text-muted-foreground sm:w-24">
                        Как
                      </dt>
                      <dd className="text-foreground">{control.how}</dd>
                    </div>
                    {control.reference ? (
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                        <dt className="shrink-0 font-medium text-muted-foreground sm:w-24">
                          Где
                        </dt>
                        <dd className="font-mono text-xs text-muted-foreground">
                          {control.reference}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ))}
            </div>
          </SectionCard>
        ))}

        <SectionCard
          title="Рекомендации к усилению"
          description="Что стоит добавить дальше для ещё более высокой защиты."
          icon={LightbulbIcon}
        >
          <ul className="space-y-3">
            {SECURITY_RECOMMENDATIONS.map((item) => (
              <li key={item.title} className="rounded-lg border bg-background/50 p-4">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
