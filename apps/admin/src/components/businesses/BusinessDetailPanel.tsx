"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  BotIcon,
  EyeIcon,
  HeadphonesIcon,
  MessageSquareIcon,
  ShieldAlertIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/StatCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  deleteBusinessAction,
  createPlatformPreviewLinkAction,
  fetchBusinessAiExpensesAction,
  fetchBusinessDetailAction,
  sendAdminTenantSmsAction,
  updateBusinessControlsAction,
} from "@/features/businesses/actions";
import type {
  BusinessAiExpenseRow,
  BusinessDetail,
} from "@/features/businesses/types";
import {
  accountStatusLabel,
  planLabel,
} from "@/features/businesses/types";
import { startSupportThreadForBusinessAction } from "@/features/support/actions";
import { BusinessAnalyticsCharts } from "@/components/businesses/BusinessAnalyticsCharts";
import { formatAdminDateTime } from "@/lib/format-datetime";
import {
  getStripeCustomerDashboardUrl,
  getStripeSubscriptionDashboardUrl,
} from "@/lib/stripe-dashboard";
import { cn } from "@/lib/utils";

type DetailTab = "overview" | "analytics" | "controls" | "channels" | "tools";

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "analytics", label: "Analytics" },
  { id: "controls", label: "Управление" },
  { id: "channels", label: "Каналы" },
  { id: "tools", label: "Действия" },
];

type BusinessDetailPanelProps = {
  businessId: string;
};

function ToggleRow(props: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 px-3 py-3">
      <span>
        <span className="block text-sm font-medium">{props.label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {props.description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.checked)}
        className="mt-1 size-4 accent-primary"
      />
    </label>
  );
}

export function BusinessDetailPanel({ businessId }: BusinessDetailPanelProps) {
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [expenses, setExpenses] = useState<BusinessAiExpenseRow[]>([]);
  const [deleteName, setDeleteName] = useState("");
  const [notes, setNotes] = useState("");
  const [statsDays, setStatsDays] = useState(30);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const [detailResult, expenseResult] = await Promise.all([
        fetchBusinessDetailAction(businessId, statsDays),
        fetchBusinessAiExpensesAction(businessId),
      ]);

      if (!detailResult.success) {
        toast.error(detailResult.message);
        return;
      }

      setBusiness(detailResult.business);
      setNotes(detailResult.business.controls?.adminNotes ?? "");
      setSmsPhone(detailResult.business.phone ?? "");

      if (expenseResult.success) {
        setExpenses(expenseResult.rows);
      }
    });
  }, [businessId, statsDays]);

  useEffect(() => {
    load();
  }, [load]);

  const updateControls = (patch: Parameters<typeof updateBusinessControlsAction>[0]) => {
    startTransition(async () => {
      const result = await updateBusinessControlsAction(patch);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Настройки сохранены");
      load();
    });
  };

  const openSupport = () => {
    startTransition(async () => {
      const result = await startSupportThreadForBusinessAction(businessId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      router.push(`/support?thread=${result.threadId}`);
    });
  };

  const openPreview = () => {
    startTransition(async () => {
      const result = await createPlatformPreviewLinkAction(businessId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      window.open(result.url, "_blank", "noopener,noreferrer");
      toast.success("Preview открыт в новой вкладке");
    });
  };

  const handleDelete = () => {
    if (!business) return;

    startTransition(async () => {
      const result = await deleteBusinessAction({
        businessId: business.id,
        confirmName: deleteName,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Бизнес удалён");
      router.push("/businesses");
    });
  };

  if (!business && isPending) {
    return <p className="text-sm text-muted-foreground">Загрузка…</p>;
  }

  if (!business) {
    return <p className="text-sm text-destructive">Бизнес не найден.</p>;
  }

  const controls = business.controls;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/businesses"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Все бизнесы
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{business.businessName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {business.ownerEmail ?? business.email ?? "—"} · создан{" "}
            {formatAdminDateTime(business.createdAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge label={planLabel(business.subscriptionPlan)} tone="info" />
            <StatusBadge label={business.subscriptionStatus} />
            <StatusBadge
              label={accountStatusLabel(controls?.accountStatus ?? "active")}
              tone={
                controls?.accountStatus === "suspended"
                  ? "danger"
                  : controls?.accountStatus === "readonly"
                    ? "warning"
                    : "success"
              }
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPreview}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            <EyeIcon className="size-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={openSupport}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            <HeadphonesIcon className="size-4" />
            Поддержка
          </button>
          <Link
            href={`/support?business=${business.id}`}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            <MessageSquareIcon className="size-4" />
            Чат OrzuX
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition",
              activeTab === tab.id
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === "overview" || activeTab === "analytics") && (
        <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Статистика за период</p>
        <select
          value={statsDays}
          onChange={(event) => setStatsDays(Number(event.target.value))}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm"
        >
          <option value={7}>7 дней</option>
          <option value={30}>30 дней</option>
          <option value={90}>90 дней</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={`Сообщений ${statsDays}д`} value={String(business.stats.messages30d)} icon={MessageSquareIcon} />
        <StatCard title={`AI расход ${statsDays}д`} value={`$${business.stats.aiCostUsd30d.toFixed(2)}`} icon={BotIcon} tone="info" />
        <StatCard title={`Звонков ${statsDays}д`} value={String(business.stats.voiceCalls30d)} icon={HeadphonesIcon} />
        <StatCard title="Каналов" value={String(business.stats.connectedChannels)} icon={ShieldAlertIcon} />
      </div>
        </>
      )}

      {activeTab === "analytics" && (
        <>
      <BusinessAnalyticsCharts businessId={businessId} days={statsDays} />

        <SectionCard title="AI расходы (30д)" description="По провайдеру и типу">
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет AI активности за 30 дней.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((row) => (
                <div
                  key={`${row.provider}-${row.callType}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{row.provider}</p>
                    <p className="text-xs text-muted-foreground">{row.callType}</p>
                  </div>
                  <div className="text-right">
                    <p>${row.totalCostUsd.toFixed(4)}</p>
                    <p className="text-xs text-muted-foreground">{row.callCount} вызовов</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        </>
      )}

      {activeTab === "overview" && (
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Обзор аккаунта" description="Контакты и подписка">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b pb-2">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{business.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b pb-2">
              <dt className="text-muted-foreground">Телефон</dt>
              <dd>{business.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b pb-2">
              <dt className="text-muted-foreground">Сайт</dt>
              <dd className="truncate">{business.website ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b pb-2">
              <dt className="text-muted-foreground">Stripe</dt>
              <dd className="text-right">
                {business.stripeCustomerId ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <a
                      href={getStripeCustomerDashboardUrl(business.stripeCustomerId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Customer
                    </a>
                    {business.stripeSubscriptionId ? (
                      <a
                        href={getStripeSubscriptionDashboardUrl(
                          business.stripeSubscriptionId,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Subscription
                      </a>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Диалогов</dt>
              <dd>{business.stats.conversations}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>
      )}

      {activeTab === "controls" && (
        <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Управление функциями"
          description="Включение и отключение AI, голоса, SMS"
          icon={BotIcon}
        >
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Статус аккаунта</span>
              <select
                value={controls?.accountStatus ?? "active"}
                onChange={(event) =>
                  updateControls({
                    businessId,
                    accountStatus: event.target.value as "active" | "suspended" | "readonly",
                  })
                }
                className="h-10 w-full rounded-lg border bg-background px-3"
              >
                <option value="active">Активен</option>
                <option value="readonly">Только чтение</option>
                <option value="suspended">Приостановлен</option>
              </select>
            </label>

            <ToggleRow
              label="AI ассистент"
              description="Автоответы, CRM AI, follow-up"
              checked={controls?.aiEnabled ?? true}
              onChange={(value) => updateControls({ businessId, aiEnabled: value })}
            />
            <ToggleRow
              label="Голос / Twilio"
              description="Входящие и исходящие звонки"
              checked={controls?.voiceEnabled ?? true}
              onChange={(value) => updateControls({ businessId, voiceEnabled: value })}
            />
            <ToggleRow
              label="SMS"
              description="SMS inbox и исходящие SMS"
              checked={controls?.smsEnabled ?? true}
              onChange={(value) => updateControls({ businessId, smsEnabled: value })}
            />
            <ToggleRow
              label="AI outbound звонки"
              description="Исходящие AI-звонки клиентам"
              checked={controls?.outboundAiEnabled ?? true}
              onChange={(value) =>
                updateControls({ businessId, outboundAiEnabled: value })
              }
            />
            <ToggleRow
              label="Автоматизации"
              description="Workflows и фоновые задачи"
              checked={controls?.automationsEnabled ?? true}
              onChange={(value) =>
                updateControls({ businessId, automationsEnabled: value })
              }
            />
          </div>
        </SectionCard>

        <SectionCard title="Заметки администратора" description="Внутренние, клиент не видит">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="Контекст для команды поддержки…"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => updateControls({ businessId, adminNotes: notes })}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Сохранить заметки
          </button>
        </SectionCard>
        </div>
      )}

      {activeTab === "channels" && (
        <SectionCard title="Каналы" description="Статус интеграций">
          <div className="grid gap-2 sm:grid-cols-2">
            {business.channels.map((channel) => (
              <div
                key={channel.channel}
                className="rounded-lg border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{channel.label}</p>
                  <StatusBadge
                    label={channel.connected ? "OK" : channel.status}
                    tone={channel.connected ? "success" : "default"}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {activeTab === "tools" && (
        <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="SMS tenant" description="Отправка через Twilio-линию бизнеса">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Телефон</span>
              <input
                value={smsPhone}
                onChange={(event) => setSmsPhone(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2"
                placeholder="+49..."
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Сообщение</span>
              <textarea
                value={smsBody}
                onChange={(event) => setSmsBody(event.target.value)}
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2"
                placeholder="Текст SMS для владельца бизнеса"
              />
            </label>
            <button
              type="button"
              disabled={isPending || !smsPhone.trim() || !smsBody.trim()}
              onClick={() => {
                startTransition(async () => {
                  const result = await sendAdminTenantSmsAction({
                    businessId,
                    phoneNumber: smsPhone,
                    body: smsBody,
                  });

                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }

                  toast.success("SMS отправлено");
                  setSmsBody("");
                });
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Отправить SMS
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Опасная зона"
          description="Удаление необратимо — все данные tenant"
          icon={Trash2Icon}
        >
          <p className="text-sm text-muted-foreground">
            Введите точное название бизнеса для подтверждения:{" "}
            <strong>{business.businessName}</strong>
          </p>
          <input
            value={deleteName}
            onChange={(event) => setDeleteName(event.target.value)}
            className="mt-3 h-10 w-full rounded-lg border bg-background px-3 text-sm"
          />
          <button
            type="button"
            disabled={isPending || deleteName !== business.businessName}
            onClick={handleDelete}
            className="mt-3 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Удалить бизнес навсегда
          </button>
        </SectionCard>
        </div>
      )}
    </div>
  );
}
