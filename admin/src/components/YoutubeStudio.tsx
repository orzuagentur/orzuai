"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type YoutubeJob = {
  id: string;
  status: string;
  title: string | null;
  youtube_url: string | null;
  error_message: string | null;
  scheduled_for: string | null;
  planned_publish_at: string | null;
  youtube_publish_at: string | null;
  actual_publish_at: string | null;
  publish_strategy: string | null;
  publish_drift_seconds: number | null;
  created_at: string | null;
  completed_at: string | null;
};

type YoutubeRow = {
  key: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  channelId: string | null;
  channelTitle: string;
  customUrl: string | null;
  thumbnailUrl: string | null;
  connected: boolean;
  active: boolean;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  statsSyncedAt: string | null;
  trainingReady: boolean;
  trainingNiche: string | null;
  trainingLanguage: string | null;
  videoFormat: string | null;
  subtitleStyle: string | null;
  visualEffect: string | null;
  montagePace: string | null;
  scheduleId: string | null;
  scheduleEnabled: boolean;
  scheduleMode: string;
  videosPerDay: number;
  times: string[];
  timezone: string;
  latestJob: YoutubeJob | null;
  jobCount: number;
  queuedCount: number;
  failedCount: number;
};

type Totals = {
  channels: number;
  schedulesOn: number;
  trained: number;
  queued: number;
  failed: number;
};

type Draft = {
  enabled: boolean;
  mode: string;
  videosPerDay: number;
  times: string;
  timezone: string;
};

function rowToDraft(row: YoutubeRow): Draft {
  return {
    enabled: row.scheduleEnabled,
    mode: row.scheduleMode || "daily",
    videosPerDay: row.videosPerDay || 2,
    times: (row.times || []).join(", "),
    timezone: row.timezone || "Europe/Berlin",
  };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value || 0);
}

function badgeStyle(tone: "ok" | "warn" | "off" | "danger") {
  if (tone === "ok") {
    return {
      color: "#86efac",
      borderColor: "rgba(34,197,94,0.35)",
      background: "rgba(34,197,94,0.12)",
    };
  }
  if (tone === "danger") {
    return {
      color: "#fca5a5",
      borderColor: "rgba(239,68,68,0.38)",
      background: "rgba(239,68,68,0.14)",
    };
  }
  if (tone === "warn") {
    return {
      color: "var(--accent)",
      borderColor: "rgba(232,165,75,0.4)",
      background: "rgba(232,165,75,0.12)",
    };
  }
  return {
    color: "var(--muted)",
    borderColor: "var(--line)",
    background: "rgba(255,255,255,0.04)",
  };
}

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "ok" | "warn" | "off" | "danger";
}) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={badgeStyle(tone)}
    >
      {children}
    </span>
  );
}

export function YoutubeStudio() {
  const [items, setItems] = useState<YoutubeRow[]>([]);
  const [totals, setTotals] = useState<Totals>({
    channels: 0,
    schedulesOn: 0,
    trained: 0,
    queued: 0,
    failed: 0,
  });
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/youtube", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to load YouTube admin data");
      setItems([]);
      return;
    }
    const nextItems = (data.items || []) as YoutubeRow[];
    setItems(nextItems);
    setTotals((data.totals || {}) as Totals);
    setDrafts(
      Object.fromEntries(nextItems.map((row) => [row.key, rowToDraft(row)])),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(() => items, [items]);

  function patchDraft(key: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...patch } as Draft,
    }));
  }

  async function saveSchedule(row: YoutubeRow, enabledOverride?: boolean) {
    const draft = drafts[row.key] || rowToDraft(row);
    const enabled =
      typeof enabledOverride === "boolean" ? enabledOverride : draft.enabled;
    setBusy(`schedule:${row.key}`);
    setMsg(null);
    setError(null);
    const res = await fetch("/api/youtube", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: row.userId,
        channelId: row.channelId,
        enabled,
        mode: draft.mode,
        videosPerDay: draft.videosPerDay,
        times: draft.times,
        timezone: draft.timezone,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Schedule update failed");
      return;
    }
    setMsg(enabled ? "Autopublish schedule saved" : "Autopublish disabled");
    await load();
  }

  async function queueNow(row: YoutubeRow) {
    setBusy(`queue:${row.key}`);
    setMsg(null);
    setError(null);
    const res = await fetch("/api/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "queue_now",
        userId: row.userId,
        channelId: row.channelId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Failed to queue YouTube job");
      return;
    }
    setMsg(`Queued YouTube job ${String(data.jobId || "").slice(0, 8)}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Hidden public feature
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            YouTube Autopublish
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[color:var(--muted)]">
            Admin-only control for connected channels, AI training readiness,
            schedule timing, and immediate publish jobs.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost text-sm"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Channels" value={totals.channels} />
        <StatCard label="Schedules on" value={totals.schedulesOn} />
        <StatCard label="AI trained" value={totals.trained} />
        <StatCard label="Active jobs" value={totals.queued} />
        <StatCard label="Failed recent" value={totals.failed} danger={totals.failed > 0} />
      </section>

      {msg && <p className="text-sm text-[color:var(--success)]">{msg}</p>}
      {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-[color:var(--line)] text-xs uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">AI training</th>
                <th className="px-4 py-3 font-medium">Autopublish</th>
                <th className="px-4 py-3 font-medium">Latest job</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-[color:var(--muted)]">
                    Loading YouTube admin data...
                  </td>
                </tr>
              )}
              {!loading && visibleItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-[color:var(--muted)]">
                    No YouTube channels, schedules, or jobs found.
                  </td>
                </tr>
              )}
              {visibleItems.map((row) => {
                const draft = drafts[row.key] || rowToDraft(row);
                const disabled =
                  busy === `schedule:${row.key}` || busy === `queue:${row.key}`;
                return (
                  <tr key={row.key} className="align-top hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <div className="flex gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--line)] bg-white/5">
                          {row.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold">YT</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="max-w-[220px] truncate font-semibold">
                              {row.channelTitle}
                            </p>
                            {row.active && <Badge tone="ok">Active</Badge>}
                            <Badge tone={row.connected ? "ok" : "danger"}>
                              {row.connected ? "Connected" : "Missing auth"}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-xs text-[color:var(--muted)]">
                            {row.email || row.displayName || row.userId}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-[color:var(--muted)]">
                            {row.channelId || "legacy profile channel"}
                          </p>
                          <p className="mt-2 text-[11px] text-[color:var(--muted)]">
                            {formatNumber(row.subscriberCount)} subs -{" "}
                            {formatNumber(row.videoCount)} videos -{" "}
                            {formatNumber(row.viewCount)} views
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <Badge tone={row.trainingReady ? "ok" : "warn"}>
                          {row.trainingReady ? "Ready" : "Needs training"}
                        </Badge>
                        <p className="text-xs text-[color:var(--muted)]">
                          {row.trainingNiche || "No niche"} /{" "}
                          {row.trainingLanguage || "auto"}
                        </p>
                        <p className="text-xs text-[color:var(--muted)]">
                          {row.videoFormat || "shorts"} -{" "}
                          {row.subtitleStyle || "subtitle default"} -{" "}
                          {row.visualEffect || "effect default"}
                        </p>
                        {row.montagePace && (
                          <p className="text-xs text-[color:var(--muted)]">
                            Pace: {row.montagePace}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="grid max-w-[320px] gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={row.scheduleEnabled ? "ok" : "off"}>
                            {row.scheduleEnabled ? "On" : "Off"}
                          </Badge>
                          <span className="text-xs text-[color:var(--muted)]">
                            {row.timezone}
                          </span>
                        </div>
                        <div className="grid grid-cols-[86px_1fr] gap-2">
                          <select
                            className="field !py-2 text-xs"
                            value={draft.mode}
                            disabled={disabled}
                            onChange={(e) =>
                              patchDraft(row.key, { mode: e.target.value })
                            }
                          >
                            <option value="daily">Daily</option>
                            <option value="weekdays">Weekdays</option>
                            <option value="custom_days">Custom days</option>
                            <option value="dates">Dates</option>
                          </select>
                          <input
                            className="field !py-2 text-xs"
                            value={draft.timezone}
                            disabled={disabled}
                            onChange={(e) =>
                              patchDraft(row.key, { timezone: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid grid-cols-[72px_1fr] gap-2">
                          <input
                            className="field !py-2 text-xs"
                            type="number"
                            min={1}
                            max={4}
                            value={draft.videosPerDay}
                            disabled={disabled}
                            onChange={(e) =>
                              patchDraft(row.key, {
                                videosPerDay: Number(e.target.value) || 1,
                              })
                            }
                          />
                          <input
                            className="field !py-2 text-xs"
                            value={draft.times}
                            placeholder="09:00, 17:00"
                            disabled={disabled}
                            onChange={(e) =>
                              patchDraft(row.key, { times: e.target.value })
                            }
                          />
                        </div>
                        <p className="text-[10px] text-[color:var(--muted)]">
                          Minimum 6 hours between times; worker uploads ahead of
                          planned publish time.
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {row.latestJob ? (
                        <div className="max-w-[220px] space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              tone={
                                row.latestJob.status === "failed"
                                  ? "danger"
                                  : row.latestJob.status === "published" ||
                                      row.latestJob.status === "scheduled"
                                    ? "ok"
                                    : "warn"
                              }
                            >
                              {row.latestJob.status}
                            </Badge>
                            {row.failedCount > 0 && (
                              <Badge tone="danger">{row.failedCount} failed</Badge>
                            )}
                          </div>
                          <p className="line-clamp-2 text-xs">
                            {row.latestJob.title || row.latestJob.id}
                          </p>
                          <p className="text-[11px] text-[color:var(--muted)]">
                            Created {formatDate(row.latestJob.created_at)}
                          </p>
                          {row.latestJob.youtube_publish_at && (
                            <p className="text-[11px] text-[color:var(--muted)]">
                              YouTube {formatDate(row.latestJob.youtube_publish_at)}
                            </p>
                          )}
                          {row.latestJob.error_message && (
                            <p className="line-clamp-2 text-[11px] text-[color:var(--danger)]">
                              {row.latestJob.error_message}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[color:var(--muted)]">
                          No YouTube jobs yet
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex min-w-[190px] flex-col gap-2">
                        <button
                          type="button"
                          className="btn btn-primary !py-2 text-xs"
                          disabled={disabled || !row.connected || !row.trainingReady}
                          onClick={() => void queueNow(row)}
                        >
                          {busy === `queue:${row.key}` ? "Queuing..." : "Queue now"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost !py-2 text-xs"
                          disabled={disabled}
                          onClick={() => void saveSchedule(row)}
                        >
                          {busy === `schedule:${row.key}` ? "Saving..." : "Save schedule"}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-[color:var(--line)] px-3 py-2 text-xs font-semibold text-[color:var(--muted)] transition hover:text-[color:var(--fg)] disabled:opacity-50"
                          disabled={disabled}
                          onClick={() =>
                            void saveSchedule(row, !row.scheduleEnabled)
                          }
                        >
                          {row.scheduleEnabled ? "Turn off" : "Turn on"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
        {label}
      </p>
      <p
        className="mt-2 text-2xl font-semibold tabular-nums"
        style={{ color: danger ? "var(--danger)" : "var(--fg)" }}
      >
        {value}
      </p>
    </div>
  );
}
