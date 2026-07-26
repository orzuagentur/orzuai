"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUser } from "@/lib/types";

type PlanOption = {
  id: string;
  slug: string;
  name: string;
  amount_cents: number;
  is_active: boolean;
};

export function UsersStudio() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to load users");
      setItems([]);
      return;
    }
    setItems((data.items as AdminUser[]) || []);
    setPlans((data.plans as PlanOption[]) || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchUser(
    userId: string,
    action: "assign_plan" | "cancel_at_period_end" | "reactivate",
    planId?: string,
  ) {
    setBusyId(userId);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, planId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    setMsg(`Updated ${userId.slice(0, 8)}… (${data.status || "ok"})`);
    await load();
  }

  const filtered = items.filter((u) => {
    const hay = `${u.email || ""} ${u.display_name || ""} ${u.youtube_channel_title || ""} ${u.plan_name || ""}`.toLowerCase();
    return !q.trim() || hay.includes(q.trim().toLowerCase());
  });

  const freePlan = plans.find((p) => p.slug === "free");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            All accounts from Supabase — {items.length} total. Assign plans
            without pasting Stripe IDs.
          </p>
        </div>
        <input
          className="field max-w-xs"
          placeholder="Search email / name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </header>

      {error && (
        <p className="text-sm text-[color:var(--danger)]">{error}</p>
      )}
      {msg && <p className="text-sm text-[color:var(--success)]">{msg}</p>}

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-[color:var(--line)] text-xs uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">YouTube</th>
                <th className="px-4 py-3 font-medium">Jobs</th>
                <th className="px-4 py-3 font-medium">Cost / mo</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-[color:var(--muted)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-[color:var(--muted)]">
                    No users found.
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {u.display_name || u.email || "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                      {u.email}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-[color:var(--muted)]">
                      {u.id}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="text-[color:var(--accent)]">Admin</span>
                    ) : (
                      <span className="text-[color:var(--muted)]">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {u.plan_name || "Free"}
                    </p>
                    <p className="text-[10px] text-[color:var(--muted)]">
                      {u.subscription_status || "—"}
                      {u.cancel_at_period_end ? " · ends soon" : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <select
                        className="field !py-1 text-xs"
                        disabled={busyId === u.id || plans.length === 0}
                        defaultValue=""
                        onChange={(e) => {
                          const planId = e.target.value;
                          e.target.value = "";
                          if (!planId) return;
                          void patchUser(u.id, "assign_plan", planId);
                        }}
                      >
                        <option value="">Assign…</option>
                        {plans
                          .filter((p) => p.is_active)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.amount_cents > 0 ? " (comp)" : ""}
                            </option>
                          ))}
                      </select>
                      {freePlan && u.plan_slug !== "free" && (
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-[color:var(--muted)]"
                          disabled={busyId === u.id}
                          onClick={() =>
                            void patchUser(u.id, "assign_plan", freePlan.id)
                          }
                        >
                          Free
                        </button>
                      )}
                      {u.subscription_status &&
                        !u.cancel_at_period_end &&
                        u.subscription_status !== "canceled" && (
                          <button
                            type="button"
                            className="text-[10px] font-semibold text-[color:var(--danger)]"
                            disabled={busyId === u.id}
                            onClick={() =>
                              void patchUser(u.id, "cancel_at_period_end")
                            }
                          >
                            Cancel
                          </button>
                        )}
                      {u.cancel_at_period_end && (
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-[color:var(--accent)]"
                          disabled={busyId === u.id}
                          onClick={() => void patchUser(u.id, "reactivate")}
                        >
                          Keep
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.youtube_connected ? (
                      <span className="text-[color:var(--success)]">
                        {u.youtube_channel_title || "Connected"}
                      </span>
                    ) : (
                      <span className="text-[color:var(--muted)]">—</span>
                    )}
                    {u.daily_videos_enabled && (
                      <span className="mt-1 block text-[10px] text-[color:var(--accent)]">
                        Daily AI on
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{u.job_count}</td>
                  <td className="px-4 py-3 tabular-nums">
                    ${u.cost_usd_month.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--muted)]">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString()
                      : "—"}
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
