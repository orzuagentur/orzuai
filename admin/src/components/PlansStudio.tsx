"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatPlanPrice,
  type BillingPlan,
  type PlanEntitlements,
} from "@/lib/billing/types";

const EMPTY_ENTITLEMENTS: PlanEntitlements = {
  videos_per_day: 1,
  creators: false,
  presentation: false,
  libraries: false,
  worker_priority: false,
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  amount_eur: string;
  interval: "month" | "year";
  sort_order: string;
  is_active: boolean;
  entitlements: PlanEntitlements;
};

function toForm(plan?: BillingPlan | null): FormState {
  if (!plan) {
    return {
      name: "",
      slug: "",
      description: "",
      amount_eur: "29",
      interval: "month",
      sort_order: "10",
      is_active: true,
      entitlements: { ...EMPTY_ENTITLEMENTS, videos_per_day: 3, creators: true },
    };
  }
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    amount_eur: (plan.amount_cents / 100).toString(),
    interval: plan.interval,
    sort_order: String(plan.sort_order),
    is_active: plan.is_active,
    entitlements: { ...plan.entitlements },
  };
}

export function PlansStudio() {
  const [items, setItems] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(toForm());
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/plans", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok && !data.items) {
      setError(data.error || "Failed to load plans");
      setItems([]);
      return;
    }
    if (data.pendingMigration) {
      setError(data.error || "Run migration 035_billing.sql");
    }
    setItems((data.items as BillingPlan[]) || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setForm(toForm());
    setEditing(true);
    setMsg(null);
  }

  function startEdit(plan: BillingPlan) {
    setForm(toForm(plan));
    setEditing(true);
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMsg(null);
    const amount_cents = Math.round(Number(form.amount_eur || 0) * 100);
    const payload = {
      id: form.id,
      name: form.name,
      slug: form.slug || undefined,
      description: form.description,
      amount_cents,
      currency: "eur",
      interval: form.interval,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
      entitlements: form.entitlements,
    };
    const res = await fetch("/api/plans", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok && !data.item) {
      setError(data.error || "Save failed");
      return;
    }
    setMsg(
      data.warning
        ? `Saved locally. Stripe: ${data.warning}`
        : form.id
          ? "Plan updated and synced to Stripe"
          : "Plan created and synced to Stripe",
    );
    setEditing(false);
    await load();
  }

  async function syncOnly(plan: BillingPlan) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id, sync_only: true }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Stripe sync failed");
      return;
    }
    setMsg(`Synced ${plan.name} to Stripe`);
    await load();
  }

  async function toggleActive(plan: BillingPlan) {
    setSaving(true);
    const res = await fetch("/api/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id, is_active: !plan.is_active }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Update failed");
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Plans</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Create or edit subscriptions here — Stripe Product and Price are
            created automatically (no manual price IDs).
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={startCreate}>
          New plan
        </button>
      </header>

      {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}
      {msg && <p className="text-sm text-[color:var(--success)]">{msg}</p>}

      {editing && (
        <section className="panel space-y-4 p-5">
          <h2 className="text-lg font-semibold">
            {form.id ? "Edit plan" : "New plan"}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              Name
              <input
                className="field mt-1 w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Slug
              <input
                className="field mt-1 w-full"
                value={form.slug}
                placeholder="auto from name"
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              Description
              <textarea
                className="field mt-1 w-full"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label className="block text-sm">
              Price (EUR)
              <input
                className="field mt-1 w-full"
                type="number"
                min={0}
                step="0.01"
                value={form.amount_eur}
                onChange={(e) =>
                  setForm({ ...form, amount_eur: e.target.value })
                }
              />
            </label>
            <label className="block text-sm">
              Interval
              <select
                className="field mt-1 w-full"
                value={form.interval}
                onChange={(e) =>
                  setForm({
                    ...form,
                    interval: e.target.value as "month" | "year",
                  })
                }
              >
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </label>
            <label className="block text-sm">
              Sort order
              <input
                className="field mt-1 w-full"
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: e.target.value })
                }
              />
            </label>
            <label className="block text-sm">
              Videos / day
              <input
                className="field mt-1 w-full"
                type="number"
                min={1}
                max={30}
                value={form.entitlements.videos_per_day}
                onChange={(e) =>
                  setForm({
                    ...form,
                    entitlements: {
                      ...form.entitlements,
                      videos_per_day: Number(e.target.value) || 1,
                    },
                  })
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {(
              [
                ["creators", "Creators"],
                ["presentation", "Presentation"],
                ["libraries", "Libraries"],
                ["worker_priority", "Priority worker"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.entitlements[key])}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      entitlements: {
                        ...form.entitlements,
                        [key]: e.target.checked,
                      },
                    })
                  }
                />
                {label}
              </label>
            ))}
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={saving || !form.name.trim()}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save & sync Stripe"}
            </button>
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm text-[color:var(--muted)]"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[color:var(--line)] text-xs uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stripe</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-[color:var(--muted)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-[color:var(--muted)]">
                    No plans yet.
                  </td>
                </tr>
              )}
              {items.map((plan) => (
                <tr key={plan.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-[color:var(--muted)]">
                      {plan.slug} · {plan.entitlements.videos_per_day} vids/day
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatPlanPrice(plan)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-[color:var(--muted)]">
                    {plan.amount_cents <= 0 ? (
                      "—"
                    ) : (
                      <>
                        <div>{plan.stripe_product_id || "no product"}</div>
                        <div>{plan.stripe_price_id || "no price"}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {plan.is_active ? (
                      <span className="text-[color:var(--success)]">Active</span>
                    ) : (
                      <span className="text-[color:var(--muted)]">Off</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs font-semibold text-[color:var(--accent)]"
                        onClick={() => startEdit(plan)}
                      >
                        Edit
                      </button>
                      {plan.amount_cents > 0 && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-[color:var(--muted)]"
                          disabled={saving}
                          onClick={() => void syncOnly(plan)}
                        >
                          Sync Stripe
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs font-semibold text-[color:var(--muted)]"
                        disabled={saving}
                        onClick={() => void toggleActive(plan)}
                      >
                        {plan.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
