"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  formatPlanPrice,
  type BillingPlan,
  type PlanEntitlements,
} from "@/lib/billing/types";

type StatusPayload = {
  plans: BillingPlan[];
  currentPlan: BillingPlan | null;
  status: string;
  entitlements: PlanEntitlements;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  stripeConfigured: boolean;
  error?: string;
};

export function BillingStudio() {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/billing/status", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as StatusPayload & {
      error?: string;
    };
    setLoading(false);
    if (!res.ok) {
      setError(json.error || t("loadError"));
      setData(null);
      return;
    }
    setData(json);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      setNotice(t("successNotice"));
    } else if (params.get("canceled") === "1") {
      setNotice(t("canceledNotice"));
    }
  }, [t]);

  async function startCheckout(planId: string) {
    setBusy(planId);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, locale }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !json.url) {
      setError(json.error || t("checkoutError"));
      return;
    }
    window.location.href = json.url as string;
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !json.url) {
      setError(json.error || t("portalError"));
      return;
    }
    window.location.href = json.url as string;
  }

  if (loading) {
    return (
      <p className="px-4 py-10 text-sm text-[var(--muted)]">{tc("loading")}</p>
    );
  }

  const currentId = data?.currentPlan?.id || null;
  const paidActive =
    data &&
    ["active", "trialing", "past_due", "comped"].includes(data.status) &&
    (data.currentPlan?.amount_cents || 0) > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          {t("eyebrow")}
        </p>
        <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold tracking-tight md:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          {t("subtitle")}
        </p>
      </header>

      {notice && (
        <p className="rounded-xl border border-[var(--line)] bg-black/20 px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      )}

      {data && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("current")}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xl font-semibold">
                {data.currentPlan?.name || t("freeFallback")}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {data.currentPlan
                  ? formatPlanPrice(data.currentPlan)
                  : t("freeFallback")}
                {" · "}
                {t("statusLabel", { status: data.status })}
              </p>
              {data.currentPeriodEnd && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {data.cancelAtPeriodEnd
                    ? t("endsOn", {
                        date: new Date(data.currentPeriodEnd).toLocaleDateString(
                          locale,
                        ),
                      })
                    : t("renewsOn", {
                        date: new Date(data.currentPeriodEnd).toLocaleDateString(
                          locale,
                        ),
                      })}
                </p>
              )}
              <p className="mt-2 text-xs text-[var(--muted)]">
                {t("videosPerDay", {
                  count: data.entitlements.videos_per_day,
                })}
              </p>
            </div>
            {paidActive && data.stripeConfigured && (
              <button
                type="button"
                className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-medium transition hover:bg-white/5"
                disabled={busy === "portal"}
                onClick={() => void openPortal()}
              >
                {busy === "portal" ? tc("loading") : t("manageBilling")}
              </button>
            )}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {(data?.plans || []).map((plan) => {
          const isCurrent = plan.id === currentId;
          const canBuy =
            plan.amount_cents > 0 &&
            Boolean(plan.stripe_price_id) &&
            Boolean(data?.stripeConfigured);
          return (
            <article
              key={plan.id}
              className="flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"
              style={{
                borderColor: isCurrent ? "var(--accent)" : undefined,
              }}
            >
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {formatPlanPrice(plan)}
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">
                {plan.description}
              </p>
              <ul className="mt-4 space-y-1 text-xs text-[var(--muted)]">
                <li>
                  {t("videosPerDay", {
                    count: plan.entitlements.videos_per_day,
                  })}
                </li>
                {plan.entitlements.creators && <li>{t("featCreators")}</li>}
                {plan.entitlements.presentation && (
                  <li>{t("featPresentation")}</li>
                )}
                {plan.entitlements.libraries && <li>{t("featLibraries")}</li>}
                {plan.entitlements.worker_priority && (
                  <li>{t("featPriority")}</li>
                )}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <p className="text-sm font-medium text-[var(--accent)]">
                    {t("currentBadge")}
                  </p>
                ) : canBuy ? (
                  <button
                    type="button"
                    className="btn-primary w-full"
                    disabled={busy === plan.id}
                    onClick={() => void startCheckout(plan.id)}
                  >
                    {busy === plan.id
                      ? tc("loading")
                      : paidActive
                        ? t("switchTo")
                        : t("subscribe")}
                  </button>
                ) : plan.amount_cents <= 0 ? (
                  <p className="text-sm text-[var(--muted)]">{t("includedFree")}</p>
                ) : (
                  <p className="text-sm text-[var(--muted)]">{t("unavailable")}</p>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {!data?.stripeConfigured && (
        <p className="text-xs text-[var(--muted)]">{t("stripeNotReady")}</p>
      )}
    </div>
  );
}
