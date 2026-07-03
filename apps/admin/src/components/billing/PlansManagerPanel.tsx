"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchPlatformPlansAction,
  savePlatformAddonAction,
  savePlatformPlanAction,
  syncAllPlatformAddonsStripeAction,
  syncAllPlatformPlansStripeAction,
  syncPlatformAddonStripeAction,
  syncPlatformPlanStripeAction,
  type PlanEntitlements,
} from "@/features/billing/plans-actions";
import type { PlatformPlanRecord } from "@orzuai/types/platform-plans.types";
import type { PlatformSubscriptionAddonRow } from "@orzuai/types/platform-plans.types";

const DEFAULT_ENTITLEMENTS: PlanEntitlements = {
  maxMessagingChannels: 1,
  maxTeamSeats: 1,
  monthlyAiReplies: 150,
  monthlyVoiceMinutes: 0,
  maxAutomationRules: 0,
  voiceAi: false,
  automations: false,
  followUpAgent: false,
  analyticsAiAsk: false,
  gmailIntegration: false,
  websiteKnowledgeSync: false,
  extendedAiContext: false,
  calendarBookingPages: true,
  prioritySupport: false,
};

type PlanFormState = {
  id: string;
  label: string;
  tagline: string;
  priceMonthly: string;
  sortOrder: string;
  isActive: boolean;
  isPublic: boolean;
  highlighted: boolean;
  entitlements: PlanEntitlements;
};

function planToForm(plan: PlatformPlanRecord): PlanFormState {
  return {
    id: plan.id,
    label: plan.label,
    tagline: plan.tagline,
    priceMonthly: String(plan.priceMonthly),
    sortOrder: String(plan.sortOrder),
    isActive: plan.isActive,
    isPublic: plan.isPublic,
    highlighted: plan.highlighted,
    entitlements: { ...plan.entitlements },
  };
}

function emptyPlanForm(): PlanFormState {
  return {
    id: "",
    label: "",
    tagline: "",
    priceMonthly: "0",
    sortOrder: "10",
    isActive: true,
    isPublic: true,
    highlighted: false,
    entitlements: { ...DEFAULT_ENTITLEMENTS },
  };
}

function EntitlementField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex h-9 w-full rounded-lg border bg-background px-3"
      />
      <span className="text-xs text-muted-foreground">-1 = unlimited</span>
    </label>
  );
}

export function PlansManagerPanel() {
  const [plans, setPlans] = useState<PlatformPlanRecord[]>([]);
  const [addons, setAddons] = useState<PlatformSubscriptionAddonRow[]>([]);
  const [editing, setEditing] = useState<PlanFormState | null>(null);
  const [isCreate, setIsCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchPlatformPlansAction();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setPlans(result.plans);
      setAddons(result.addons);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder),
    [plans],
  );

  function openEdit(plan: PlatformPlanRecord) {
    setIsCreate(false);
    setEditing(planToForm(plan));
  }

  function openCreate() {
    setIsCreate(true);
    setEditing(emptyPlanForm());
  }

  function savePlan() {
    if (!editing) return;

    startTransition(async () => {
      const price = Number.parseFloat(editing.priceMonthly);

      if (!editing.id.trim() || !editing.label.trim()) {
        toast.error("ID и название обязательны.");
        return;
      }

      if (Number.isNaN(price) || price < 0) {
        toast.error("Укажите корректную цену.");
        return;
      }

      const result = await savePlatformPlanAction({
        id: editing.id.trim().toLowerCase(),
        label: editing.label.trim(),
        tagline: editing.tagline.trim(),
        priceMonthlyCents: Math.round(price * 100),
        sortOrder: Number.parseInt(editing.sortOrder, 10) || 0,
        isActive: editing.isActive,
        isPublic: editing.isPublic,
        highlighted: editing.highlighted,
        entitlements: editing.entitlements,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Тариф сохранён.");
      setEditing(null);
      load();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Тарифы и Stripe"
        description="Управляйте ценами, лимитами и услугами только из админки. Stripe синхронизируется отсюда."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/billing"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              <ArrowLeftIcon className="size-4" />
              К биллингу
            </Link>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              <PlusIcon className="size-4" />
              Новый тариф
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await syncAllPlatformPlansStripeAction();

                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }

                  toast.success(
                    `Stripe: ${result.synced.length} тарифов, пропущено ${result.skipped.length}, ошибок ${result.errors.length}`,
                  );
                  load();
                });
              }}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              Sync все тарифы → Stripe
            </button>
          </div>
        }
      />

      <SectionCard title="Тарифные планы" description="Цена, лимиты и Stripe Price ID">
        {sortedPlans.length === 0 ? (
          <EmptyState
            title="Тарифы не найдены"
            description="Примените миграцию Supabase или создайте первый тариф."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Название</th>
                  <th className="px-2 py-2">Цена</th>
                  <th className="px-2 py-2">AI replies</th>
                  <th className="px-2 py-2">Stripe</th>
                  <th className="px-2 py-2">Статус</th>
                  <th className="px-2 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlans.map((plan) => (
                  <tr key={plan.id} className="border-b last:border-b-0">
                    <td className="px-2 py-3 font-mono text-xs">{plan.id}</td>
                    <td className="px-2 py-3">
                      <div className="font-medium">{plan.label}</div>
                      <div className="text-xs text-muted-foreground">{plan.tagline}</div>
                    </td>
                    <td className="px-2 py-3">${plan.priceMonthly}/mo</td>
                    <td className="px-2 py-3">
                      {plan.entitlements.monthlyAiReplies.toLocaleString("en-US")}
                    </td>
                    <td className="px-2 py-3">
                      {plan.stripePriceId ? (
                        <StatusBadge tone="success" label="Подключён" />
                      ) : plan.priceMonthlyCents > 0 ? (
                        <StatusBadge tone="warning" label="Нет price" />
                      ) : (
                        <StatusBadge tone="default" label="Free" />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {!plan.isActive ? (
                        <StatusBadge tone="danger" label="Off" />
                      ) : plan.isPublic ? (
                        <StatusBadge tone="success" label="Public" />
                      ) : (
                        <StatusBadge tone="default" label="Hidden" />
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(plan)}
                          className="rounded-lg border px-2 py-1 text-xs hover:bg-muted"
                        >
                          Изменить
                        </button>
                        {plan.priceMonthlyCents > 0 ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                const result = await syncPlatformPlanStripeAction(plan.id);

                                if (!result.success) {
                                  toast.error(result.message);
                                  return;
                                }

                                toast.success(`Stripe price: ${result.stripePriceId}`);
                                load();
                              });
                            }}
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            Sync Stripe
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Add-ons"
        description="Дополнительные пакеты (AI replies, voice, seats)"
        actions={
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await syncAllPlatformAddonsStripeAction();

                if (!result.success) {
                  toast.error(result.message);
                  return;
                }

                toast.success(`Stripe add-ons: ${result.synced.length} synced`);
                load();
              });
            }}
            className="rounded-lg border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
          >
            Sync add-ons
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Название</th>
                <th className="px-2 py-2">Цена</th>
                <th className="px-2 py-2">Stripe</th>
                <th className="px-2 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {addons.map((addon) => (
                <tr key={addon.id} className="border-b last:border-b-0">
                  <td className="px-2 py-3 font-mono text-xs">{addon.id}</td>
                  <td className="px-2 py-3">
                    <div className="font-medium">{addon.label}</div>
                    <div className="text-xs text-muted-foreground">{addon.description}</div>
                  </td>
                  <td className="px-2 py-3">${(addon.price_monthly_cents / 100).toFixed(0)}/mo</td>
                  <td className="px-2 py-3">
                    {addon.stripe_price_id ? (
                      <StatusBadge tone="success" label="OK" />
                    ) : (
                      <StatusBadge tone="warning" label="Нет" />
                    )}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        const price = prompt(
                          "Новая цена USD/mo",
                          String(addon.price_monthly_cents / 100),
                        );

                        if (!price) return;

                        startTransition(async () => {
                          const parsed = Number.parseFloat(price);

                          if (Number.isNaN(parsed) || parsed <= 0) {
                            toast.error("Некорректная цена.");
                            return;
                          }

                          const save = await savePlatformAddonAction({
                            id: addon.id,
                            label: addon.label,
                            description: addon.description,
                            priceMonthlyCents: Math.round(parsed * 100),
                            sortOrder: addon.sort_order,
                            isActive: addon.is_active,
                          });

                          if (!save.success) {
                            toast.error(save.message);
                            return;
                          }

                          const sync = await syncPlatformAddonStripeAction(addon.id);

                          if (!sync.success) {
                            toast.error(sync.message);
                            return;
                          }

                          toast.success("Add-on обновлён и синхронизирован.");
                          load();
                        });
                      }}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      Цена + Stripe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border bg-card p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">
                {isCreate ? "Новый тариф" : `Редактировать: ${editing.label}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border px-3 py-1 text-sm"
              >
                Закрыть
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>ID (slug)</span>
                <input
                  value={editing.id}
                  disabled={!isCreate}
                  onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                  className="flex h-9 w-full rounded-lg border bg-background px-3 disabled:opacity-60"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Название</span>
                <input
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  className="flex h-9 w-full rounded-lg border bg-background px-3"
                />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span>Описание</span>
                <input
                  value={editing.tagline}
                  onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                  className="flex h-9 w-full rounded-lg border bg-background px-3"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Цена USD / month</span>
                <input
                  value={editing.priceMonthly}
                  onChange={(e) => setEditing({ ...editing, priceMonthly: e.target.value })}
                  className="flex h-9 w-full rounded-lg border bg-background px-3"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Порядок</span>
                <input
                  value={editing.sortOrder}
                  onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })}
                  className="flex h-9 w-full rounded-lg border bg-background px-3"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <EntitlementField
                label="Active"
                checked={editing.isActive}
                onChange={(value) => setEditing({ ...editing, isActive: value })}
              />
              <EntitlementField
                label="Public (pricing page)"
                checked={editing.isPublic}
                onChange={(value) => setEditing({ ...editing, isPublic: value })}
              />
              <EntitlementField
                label="Highlighted"
                checked={editing.highlighted}
                onChange={(value) => setEditing({ ...editing, highlighted: value })}
              />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField
                label="AI replies / month"
                value={editing.entitlements.monthlyAiReplies}
                onChange={(value) =>
                  setEditing({
                    ...editing,
                    entitlements: { ...editing.entitlements, monthlyAiReplies: value },
                  })
                }
              />
              <NumberField
                label="Voice minutes / month"
                value={editing.entitlements.monthlyVoiceMinutes}
                onChange={(value) =>
                  setEditing({
                    ...editing,
                    entitlements: { ...editing.entitlements, monthlyVoiceMinutes: value },
                  })
                }
              />
              <NumberField
                label="Messaging channels"
                value={editing.entitlements.maxMessagingChannels}
                onChange={(value) =>
                  setEditing({
                    ...editing,
                    entitlements: { ...editing.entitlements, maxMessagingChannels: value },
                  })
                }
              />
              <NumberField
                label="Team seats"
                value={editing.entitlements.maxTeamSeats}
                onChange={(value) =>
                  setEditing({
                    ...editing,
                    entitlements: { ...editing.entitlements, maxTeamSeats: value },
                  })
                }
              />
              <NumberField
                label="Automation rules"
                value={editing.entitlements.maxAutomationRules}
                onChange={(value) =>
                  setEditing({
                    ...editing,
                    entitlements: { ...editing.entitlements, maxAutomationRules: value },
                  })
                }
              />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["voiceAi", "Voice AI"],
                  ["automations", "Automations"],
                  ["followUpAgent", "Follow-up agent"],
                  ["analyticsAiAsk", "Analytics AI Ask"],
                  ["gmailIntegration", "Gmail"],
                  ["websiteKnowledgeSync", "Website sync"],
                  ["extendedAiContext", "Extended memory"],
                  ["calendarBookingPages", "Booking pages"],
                  ["prioritySupport", "Priority support"],
                ] as const
              ).map(([key, label]) => (
                <EntitlementField
                  key={key}
                  label={label}
                  checked={editing.entitlements[key]}
                  onChange={(value) =>
                    setEditing({
                      ...editing,
                      entitlements: { ...editing.entitlements, [key]: value },
                    })
                  }
                />
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={savePlan}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
