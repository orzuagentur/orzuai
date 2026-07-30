"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PRODUCT_LOCK_FEATURES,
  isFeatureLocked,
  resolvedProductLocks,
  type ProductLockId,
  type ProductLocksMap,
} from "@/lib/product-locks";

type ProductLockFeature = (typeof PRODUCT_LOCK_FEATURES)[number];

const FEATURE_DEPENDENCIES: Partial<Record<ProductLockId, ProductLockId[]>> = {
  ai_presentation: ["presentation_editor"],
};

/** Admin: hide or restore deferred product areas without deleting code. */
export function FeaturesStudio() {
  const [locks, setLocks] = useState<ProductLocksMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/features");
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        setErr(data.error || "Failed to load");
        return;
      }
      setLocks((data.locks || {}) as ProductLocksMap);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ProductLockFeature[]>();
    PRODUCT_LOCK_FEATURES.forEach((feature) => {
      const key = feature.group || "Other";
      map.set(key, [...(map.get(key) || []), feature]);
    });
    return Array.from(map.entries());
  }, []);

  async function toggle(id: ProductLockId) {
    const hiddenNow = isFeatureLocked(locks, id);
    const next: ProductLocksMap = { ...locks, [id]: !hiddenNow };
    if (hiddenNow) {
      FEATURE_DEPENDENCIES[id]?.forEach((dependency) => {
        next[dependency] = false;
      });
    } else {
      Object.entries(FEATURE_DEPENDENCIES).forEach(([featureId, deps]) => {
        if (deps?.includes(id)) {
          next[featureId as ProductLockId] = true;
        }
      });
    }
    setLocks(next);
    setSaving(true);
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/features", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locks: next }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setErr(data.error || "Save failed");
      return;
    }
    setLocks((data.locks || next) as ProductLocksMap);
    setMsg(hiddenNow ? "Tool restored for users" : "Tool moved to deferred");
  }

  const effective = resolvedProductLocks(locks);
  const hiddenCount = PRODUCT_LOCK_FEATURES.filter((f) => effective[f.id]).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Product focus
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          Deferred tools
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--muted)]">
          Keep the public app focused on content creation. Hidden tools stay in
          the codebase and can be restored instantly with Show.
        </p>
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Hidden now: {hiddenCount}/{PRODUCT_LOCK_FEATURES.length}
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-[color:var(--muted)]">Loading...</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([group, features]) => (
            <section key={group} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                {group}
              </h2>
              {features.map((feature) => {
                const hidden = Boolean(effective[feature.id]);
                return (
                  <div
                    key={feature.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-4 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[color:var(--fg)]">
                          {feature.label}
                        </p>
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            borderColor: hidden
                              ? "rgba(239,68,68,0.4)"
                              : "rgba(34,197,94,0.35)",
                            color: hidden ? "#fca5a5" : "#86efac",
                            background: hidden
                              ? "rgba(239,68,68,0.14)"
                              : "rgba(34,197,94,0.12)",
                          }}
                        >
                          {hidden ? "Hidden" : "Visible"}
                        </span>
                        {feature.defaultLocked && (
                          <span className="rounded-full border border-[color:var(--line)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                            deferred default
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-[color:var(--muted)]">
                        {feature.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void toggle(feature.id)}
                      className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
                      style={{
                        background: hidden
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(239,68,68,0.16)",
                        color: hidden ? "#86efac" : "#fca5a5",
                        border: `1px solid ${
                          hidden
                            ? "rgba(34,197,94,0.35)"
                            : "rgba(239,68,68,0.35)"
                        }`,
                      }}
                    >
                      {hidden ? "Show" : "Hide"}
                    </button>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
