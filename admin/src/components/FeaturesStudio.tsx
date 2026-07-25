"use client";

import { useEffect, useState } from "react";
import {
  PRODUCT_LOCK_FEATURES,
  type ProductLockId,
  type ProductLocksMap,
} from "@/lib/product-locks";

/** Admin: lock product cards so users see “under development”. */
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

  async function toggle(id: ProductLockId) {
    const next: ProductLocksMap = { ...locks, [id]: !locks[id] };
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
    setMsg("Saved");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Feature locks
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Block a card and users will see a beautiful “under development”
          screen instead of the tool. Locked video editor also blocks editing
          AI-created videos.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-[color:var(--muted)]">Loading…</p>
      ) : (
        <div className="space-y-3">
          {PRODUCT_LOCK_FEATURES.map((f) => {
            const on = Boolean(locks[f.id]);
            return (
              <div
                key={f.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[color:var(--fg)]">{f.label}</p>
                  <p className="mt-0.5 text-sm text-[color:var(--muted)]">
                    {f.description}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void toggle(f.id)}
                  className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
                  style={{
                    background: on ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.15)",
                    color: on ? "#fca5a5" : "#86efac",
                    border: `1px solid ${on ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.35)"}`,
                  }}
                >
                  {on ? "Blocked" : "Open"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
